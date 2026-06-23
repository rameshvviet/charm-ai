const cds = require('@sap/cds')

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
      } catch (err) {
        console.error('AI risk scoring failed:', err.message)
      }
    })

    // ── Auto audit log on every change ─────────────────
    this.after(['CREATE','UPDATE','DELETE'], '*', async (data, req) => {
      try {
        const db = await cds.connect.to('db')
        await db.run(INSERT.into('charm_ai_AuditEntry').entries({
          ID: cds.utils.uuid(),
          entityName: req.entity?.split('.').pop() || 'Unknown',
          entityId: data?.ID || cds.utils.uuid(),
          action: req.event,
          changedBy: req.user?.id || 'system',
          changedAt: new Date().toISOString(),
          newValues: JSON.stringify(data).substring(0, 4999),
          hash: Math.random().toString(36).substring(2)
        }))
      } catch (err) {
        console.error('Audit log failed:', err.message)
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

      const transport = await db.run(
        SELECT.one.from('charm_ai_TransportRequest').where({ ID: transportId })
      )
      if (!transport) return req.error(404, 'Transport not found')

      const objects = await db.run(
        SELECT.from('charm_ai_TransportObject').where({ transport_ID: transportId })
      )

      const objectList = objects.map(o => `${o.pgmid}/${o.object}/${o.objName}`).join('\n')

      const prompt = `You are an SAP Basis expert. Analyze these transport objects and identify potential dependency issues.

Transport: ${transport.transportNumber}
Type: ${transport.type}
Objects in transport:
${objectList || 'No objects listed yet'}

Analyze for:
1. Missing function module includes
2. Broken class dependencies  
3. Missing table definitions
4. Program/include dependencies
5. Authorization object dependencies

Respond ONLY in this exact JSON format:
{
  "severity": "LOW",
  "missingDependencies": ["list any missing deps here"],
  "analysis": "detailed analysis here",
  "recommendation": "what to do before importing"
}`

      const result = await this.callOpenAI(prompt)

      await db.run(INSERT.into('charm_ai_DependencyCheck').entries({
        ID: cds.utils.uuid(),
        transport_ID: transportId,
        status: 'Completed',
        missingDependencies: JSON.stringify(result.missingDependencies || []),
        aiAnalysis: result.analysis + ' | ' + result.recommendation,
        checkedAt: new Date().toISOString(),
        severity: result.severity
      }))

      return JSON.stringify(result)
    })

    // ── AI overwrite conflict checker ───────────────────
    this.on('checkOverwrites', async (req) => {
      const { landscapeId } = req.data
      const db = await cds.connect.to('db')

      const transports = await db.run(
        SELECT.from('charm_ai_TransportRequest')
          .where({ status: 'Open' })
      )

      if (transports.length < 2) return 'Not enough open transports to check conflicts'

      const transportDetails = await Promise.all(transports.map(async (t) => {
        const objects = await db.run(
          SELECT.from('charm_ai_TransportObject').where({ transport_ID: t.ID })
        )
        return { transport: t.transportNumber, objects: objects.map(o => o.objName) }
      }))

      const prompt = `You are an SAP Basis expert. Analyze these transport requests for overwrite conflicts.

Open transports and their objects:
${JSON.stringify(transportDetails, null, 2)}

Identify:
1. Objects that appear in multiple transports (overwrite risk)
2. The recommended import sequence to minimize conflicts
3. Any transports that should NOT be imported together

Respond ONLY in this exact JSON format:
{
  "conflicts": [
    {"object": "ZPROG", "transports": ["DEV123", "DEV456"], "severity": "HIGH"}
  ],
  "recommendedSequence": ["DEV123", "DEV456"],
  "warnings": ["warning text here"]
}`

      const result = await this.callOpenAI(prompt)
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

      const change = await db.run(
        SELECT.one.from('charm_ai_ChangeRequest').where({ ID: changeId })
      )
      if (!change) return req.error(404, 'Change Request not found')

      const prompt = `You are an SAP change management expert. Analyze this change request and determine if a retrofit is needed.

Change Request: ${change.title}
Description: ${change.description}
Category: ${change.category}
Type: ${change.type}
Affected Modules: ${change.affectedModules}

A retrofit is needed when:
- A hotfix/urgent change is applied to production that also needs to go back into the development line
- A change in one system track needs to be applied to a parallel track
- A maintenance patch needs to be merged into the main development line

Respond ONLY in this exact JSON format:
{
  "retrofitNeeded": true,
  "reason": "why retrofit is needed",
  "urgency": "HIGH",
  "targetSystems": ["DEV track"],
  "instructions": "what needs to be done"
}`

      const result = await this.callOpenAI(prompt)

      if (result.retrofitNeeded) {
        await db.run(INSERT.into('charm_ai_RetrofitTracker').entries({
          ID: cds.utils.uuid(),
          sourceChange_ID: changeId,
          reason: result.reason,
          status: 'Pending',
          aiDetected: true,
          createdAt: new Date().toISOString()
        }))
      }

      return JSON.stringify(result)
    })

    // ── AI test case generator ──────────────────────────
    this.on('generateTestCases', async (req) => {
      const { changeId } = req.data
      const db = await cds.connect.to('db')

      const change = await db.run(
        SELECT.one.from('charm_ai_ChangeRequest').where({ ID: changeId })
      )
      if (!change) return req.error(404, 'Change Request not found')

      const prompt = `You are an SAP quality assurance expert. Generate test cases for this change request.

Change: ${change.title}
Description: ${change.description}
Category: ${change.category}
Affected Modules: ${change.affectedModules}
Risk Level: ${change.riskLevel}

Generate 3-5 test cases covering:
1. Happy path (positive test)
2. Negative/error scenarios
3. Edge cases
4. Regression scenarios

Respond ONLY in this exact JSON format:
{
  "testCases": [
    {
      "title": "Test case title",
      "steps": "Step 1: ...\nStep 2: ...",
      "expectedResult": "What should happen"
    }
  ]
}`

      const result = await this.callOpenAI(prompt)

      for (const tc of (result.testCases || [])) {
        await db.run(INSERT.into('charm_ai_TestCase').entries({
          ID: cds.utils.uuid(),
          changeRequest_ID: changeId,
          title: tc.title,
          steps: tc.steps,
          expectedResult: tc.expectedResult,
          status: 'Not Started',
          aiGenerated: true
        }))
      }

      return `Generated ${result.testCases?.length || 0} test cases`
    })

    // ── Approval workflow ───────────────────────────────
    this.on('submitForApproval', async (req) => {
      const { changeRequestId } = req.data
      const db = await cds.connect.to('db')
      const cr = await db.run(
        SELECT.one.from('charm_ai_ChangeRequest').where({ ID: changeRequestId })
      )
      if (!cr) return req.error(404, 'Change Request not found')
      if (cr.status !== 'Draft') return req.error(400, 'Only Draft CRs can be submitted')

      await db.run(
        UPDATE('charm_ai_ChangeRequest')
          .set({ status: 'Submitted' })
          .where({ ID: changeRequestId })
      )

      const approver = cr.riskLevel === 'CRITICAL' ? 'cab@charm.ai' :
                       cr.riskLevel === 'HIGH' ? 'senior-approver@charm.ai' :
                       'approver@charm.ai'

      await db.run(INSERT.into('charm_ai_ApprovalStep').entries({
        ID: cds.utils.uuid(),
        changeRequest_ID: changeRequestId,
        approver,
        role: cr.riskLevel === 'CRITICAL' ? 'CAB' : cr.riskLevel === 'HIGH' ? 'Senior Approver' : 'Approver',
        status: 'Pending',
        stepOrder: 1,
        dueDate: new Date(Date.now() + 86400000).toISOString()
      }))

      return `Submitted for approval → ${approver}`
    })

    this.on('approveChange', async (req) => {
      const { changeRequestId, comments } = req.data
      const db = await cds.connect.to('db')
      await db.run(UPDATE('charm_ai_ChangeRequest').set({ status: 'Approved' }).where({ ID: changeRequestId }))
      await db.run(UPDATE('charm_ai_ApprovalStep').set({ status: 'Approved', comments, decidedAt: new Date().toISOString() }).where({ changeRequest_ID: changeRequestId }))
      return 'Change Request approved'
    })

    this.on('rejectChange', async (req) => {
      const { changeRequestId, comments } = req.data
      const db = await cds.connect.to('db')
      await db.run(UPDATE('charm_ai_ChangeRequest').set({ status: 'Rejected' }).where({ ID: changeRequestId }))
      await db.run(UPDATE('charm_ai_ApprovalStep').set({ status: 'Rejected', comments, decidedAt: new Date().toISOString() }).where({ changeRequest_ID: changeRequestId }))
      return 'Change Request rejected'
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