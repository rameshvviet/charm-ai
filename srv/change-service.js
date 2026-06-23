const cds = require('@sap/cds')
const { runAgent } = require('./agent')

module.exports = class ChangeService extends cds.ApplicationService {

  async init() {

    // ── Auto risk score on CR creation ─────────────────
    this.before('CREATE', 'ChangeRequests', async (req) => {
      const { description, category, affectedModules, plannedDate } = req.data
      if (!description) return
      try {
        const result = await this.callOpenAI(`Analyze this SAP change request and give a risk assessment.
Change Description: ${description}
Category: ${category || 'General'}
Affected Modules: ${affectedModules || 'Unknown'}
Planned Date: ${plannedDate || 'Not specified'}

Respond ONLY in this exact JSON format:
{
  "riskLevel": "LOW",
  "reasoning": "explanation here",
  "recommendations": "how to reduce risk here"
}
riskLevel must be one of: LOW, MEDIUM, HIGH, CRITICAL`)
        req.data.riskLevel = result.riskLevel
        req.data.riskReason = result.reasoning + ' | ' + result.recommendations
        req.data.status = 'Draft'
      } catch (err) {
        console.error('AI risk scoring failed:', err.message)
      }
    })

    // ── Auto audit log ──────────────────────────────────
    this.after(['CREATE', 'UPDATE', 'DELETE'], '*', async (data, req) => {
      try {
        const db = await cds.connect.to('db')
        await db.run(INSERT.into('charm_ai_AuditEntry').entries({
          ID: cds.utils.uuid(),
          entityName: req.entity?.split('.').pop() || 'Unknown',
          entityId: data?.ID || cds.utils.uuid(),
          action: req.event,
          changedBy: req.user?.id || 'system',
          changedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          newValues: JSON.stringify(data).substring(0, 4999),
          hash: Math.random().toString(36).substring(2)
        }))
      } catch (err) {
        console.error('Audit log failed:', err.message)
      }
    })

    // ── Agentic AI chat ─────────────────────────────────
    this.on('chat', async (req) => {
      const { message, history } = req.data
      if (!message) return req.error(400, 'Message is required')
      try {
        let parsedHistory = []
        if (history) {
          try { parsedHistory = JSON.parse(history) } catch (e) {}
        }
        const result = await runAgent(message, parsedHistory)
        return JSON.stringify(result)
      } catch (err) {
        console.error('Agent error:', err)
        return req.error(500, err.message)
      }
    })

    // ── Manual risk calculation ─────────────────────────
    this.on('calculateRisk', async (req) => {
      const { description, category, affectedModules, plannedDate } = req.data
      return await this.callOpenAI(`Analyze this SAP change request and give a risk assessment.
Change Description: ${description}
Category: ${category || 'General'}
Affected Modules: ${affectedModules || 'Unknown'}
Planned Date: ${plannedDate || 'Not specified'}

Respond ONLY in this exact JSON format:
{
  "riskLevel": "LOW",
  "reasoning": "explanation here",
  "recommendations": "how to reduce risk here"
}
riskLevel must be one of: LOW, MEDIUM, HIGH, CRITICAL`)
    })

    // ── AI dependency checker ───────────────────────────
    this.on('checkDependencies', async (req) => {
      const { transportId } = req.data
      const db = await cds.connect.to('db')
      const transport = await db.run(SELECT.one.from('charm_ai_TransportRequest').where({ ID: transportId }))
      if (!transport) return req.error(404, 'Transport not found')
      const objects = await db.run(SELECT.from('charm_ai_TransportObject').where({ transport_ID: transportId }))
      const objectList = objects.map(o => `${o.pgmid}/${o.object}/${o.objName}`).join('\n')
      const result = await this.callOpenAI(`You are an SAP Basis expert. Analyze these transport objects for dependency issues.
Transport: ${transport.transportNumber}
Objects:
${objectList || 'No objects listed'}

Respond ONLY in this exact JSON format:
{
  "severity": "LOW",
  "missingDependencies": ["list missing deps"],
  "analysis": "detailed analysis",
  "recommendation": "what to do before importing"
}`)
      await db.run(INSERT.into('charm_ai_DependencyCheck').entries({
        ID: cds.utils.uuid(),
        transport_ID: transportId,
        status: 'Completed',
        missingDependencies: JSON.stringify(result.missingDependencies || []),
        aiAnalysis: result.analysis + ' | ' + result.recommendation,
        checkedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        severity: result.severity
      }))
      return JSON.stringify(result)
    })

    // ── AI overwrite conflict checker ───────────────────
    this.on('checkOverwrites', async (req) => {
      const db = await cds.connect.to('db')
      const transports = await db.run(SELECT.from('charm_ai_TransportRequest').where({ status: 'Open' }))
      if (transports.length < 2) return 'Not enough open transports to check'
      const details = await Promise.all(transports.map(async (t) => {
        const objects = await db.run(SELECT.from('charm_ai_TransportObject').where({ transport_ID: t.ID }))
        return { transport: t.transportNumber, objects: objects.map(o => o.objName) }
      }))
      const result = await this.callOpenAI(`SAP Basis expert. Analyze these transports for overwrite conflicts.
${JSON.stringify(details, null, 2)}

Respond ONLY in this exact JSON format:
{
  "conflicts": [{"object": "ZPROG", "transports": ["DEV123"], "severity": "HIGH"}],
  "recommendedSequence": ["DEV123"],
  "warnings": ["warning text"]
}`)
      const parsed = typeof result === 'string' ? JSON.parse(result) : result
      for (const conflict of (parsed.conflicts || [])) {
        await db.run(INSERT.into('charm_ai_OverwriteConflict').entries({
          ID: cds.utils.uuid(),
          conflictingObject: conflict.object,
          severity: conflict.severity,
          aiRecommendation: JSON.stringify(parsed.recommendedSequence),
          status: 'Open'
        }))
      }
      return JSON.stringify(parsed)
    })

    // ── AI retrofit detector ────────────────────────────
    this.on('detectRetrofits', async (req) => {
      const { changeId } = req.data
      const db = await cds.connect.to('db')
      const change = await db.run(SELECT.one.from('charm_ai_ChangeRequest').where({ ID: changeId }))
      if (!change) return req.error(404, 'Change Request not found')
      const result = await this.callOpenAI(`SAP change management expert. Does this change need a retrofit?
Title: ${change.title}
Description: ${change.description}
Category: ${change.category}
Type: ${change.type}

Respond ONLY in this exact JSON format:
{
  "retrofitNeeded": true,
  "reason": "why retrofit needed",
  "urgency": "HIGH",
  "instructions": "what to do"
}`)
      if (result.retrofitNeeded) {
        await db.run(INSERT.into('charm_ai_RetrofitTracker').entries({
          ID: cds.utils.uuid(),
          sourceChange_ID: changeId,
          reason: result.reason,
          status: 'Pending',
          aiDetected: 1,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }))
      }
      return JSON.stringify(result)
    })

    // ── AI test case generator ──────────────────────────
    this.on('generateTestCases', async (req) => {
      const { changeId } = req.data
      const db = await cds.connect.to('db')
      const change = await db.run(SELECT.one.from('charm_ai_ChangeRequest').where({ ID: changeId }))
      if (!change) return req.error(404, 'Change Request not found')
      const result = await this.callOpenAI(`SAP QA expert. Generate test cases for this change.
Title: ${change.title}
Description: ${change.description}
Category: ${change.category}
Risk: ${change.riskLevel}

Respond ONLY in this exact JSON format:
{
  "testCases": [
    {"title": "test title", "steps": "Step 1...", "expectedResult": "what should happen"}
  ]
}`)
      for (const tc of (result.testCases || [])) {
        await db.run(INSERT.into('charm_ai_TestCase').entries({
          ID: cds.utils.uuid(),
          changeRequest_ID: changeId,
          title: tc.title,
          steps: tc.steps,
          expectedResult: tc.expectedResult,
          status: 'Not Started',
          aiGenerated: 1
        }))
      }
      return `Generated ${result.testCases?.length || 0} test cases`
    })

    // ── Approval workflow ───────────────────────────────
    this.on('submitForApproval', async (req) => {
      const { changeRequestId } = req.data
      const db = await cds.connect.to('db')
      const cr = await db.run(SELECT.one.from('charm_ai_ChangeRequest').where({ ID: changeRequestId }))
      if (!cr) return req.error(404, 'Change Request not found')
      if (cr.status !== 'Draft') return req.error(400, 'Only Draft CRs can be submitted')
      await db.run(UPDATE('charm_ai_ChangeRequest').set({ status: 'Submitted' }).where({ ID: changeRequestId }))
      const approver = cr.riskLevel === 'CRITICAL' ? 'cab@charm.ai' :
                       cr.riskLevel === 'HIGH' ? 'senior-approver@charm.ai' : 'approver@charm.ai'
      await db.run(INSERT.into('charm_ai_ApprovalStep').entries({
        ID: cds.utils.uuid(),
        changeRequest_ID: changeRequestId,
        approver,
        role: cr.riskLevel === 'CRITICAL' ? 'CAB' : cr.riskLevel === 'HIGH' ? 'Senior Approver' : 'Approver',
        status: 'Pending',
        stepOrder: 1,
        dueDate: new Date(Date.now() + 86400000).toISOString().replace('T', ' ').substring(0, 19)
      }))
      return `Submitted for approval → ${approver}`
    })

    this.on('approveChange', async (req) => {
      const { changeRequestId, comments } = req.data
      const db = await cds.connect.to('db')
      await db.run(UPDATE('charm_ai_ChangeRequest').set({ status: 'Approved' }).where({ ID: changeRequestId }))
      await db.run(UPDATE('charm_ai_ApprovalStep').set({
        status: 'Approved',
        comments,
        decidedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }).where({ changeRequest_ID: changeRequestId }))
      return 'Change Request approved'
    })

    this.on('rejectChange', async (req) => {
      const { changeRequestId, comments } = req.data
      const db = await cds.connect.to('db')
      await db.run(UPDATE('charm_ai_ChangeRequest').set({ status: 'Rejected' }).where({ ID: changeRequestId }))
      await db.run(UPDATE('charm_ai_ApprovalStep').set({
        status: 'Rejected',
        comments,
        decidedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }).where({ changeRequest_ID: changeRequestId }))
      return 'Change Request rejected'
    })

    // ── TOC creation ────────────────────────────────────
    this.on('createTOC', async (req) => {
      const { originalTransportId, targetSystemId, reason } = req.data
      const db = await cds.connect.to('db')
      await db.run(INSERT.into('charm_ai_TransportOfCopy').entries({
        ID: cds.utils.uuid(),
        originalTransport_ID: originalTransportId,
        targetSystem_ID: targetSystemId,
        reason,
        status: 'Pending',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }))
      return 'Transport of Copy created'
    })

    await super.init()
  }

  // ── Shared OpenAI helper ──────────────────────────────
  async callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an SAP expert. Always respond with valid JSON only. Never use markdown or code blocks.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000
      })
    })
    const data = await response.json()
    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim()
    return JSON.parse(raw)
  }
}