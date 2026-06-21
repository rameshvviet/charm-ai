const cds = require('@sap/cds')

module.exports = class ChangeService extends cds.ApplicationService {

  async init() {

    // Auto-score risk when CR is created
    this.before('CREATE', 'ChangeRequests', async (req) => {
      const { description, category, affectedModules, plannedDate } = req.data
      if (!description) return
      try {
        const aiResult = await this.callOpenAI(description, category, affectedModules, plannedDate)
        req.data.riskLevel = aiResult.riskLevel
        req.data.riskReason = aiResult.reasoning + ' | ' + aiResult.recommendations
        req.data.status = 'Draft'
      } catch (err) {
        console.error('AI risk scoring failed:', err.message)
      }
    })

    // Manual risk calculation
    this.on('calculateRisk', async (req) => {
      const { description, category, affectedModules, plannedDate } = req.data
      return await this.callOpenAI(description, category, affectedModules, plannedDate)
    })

    // Submit for approval
    this.on('submitForApproval', async (req) => {
      const { changeRequestId } = req.data
      const db = await cds.connect.to('db')

      // Get the CR
      const cr = await db.run(
        SELECT.one.from('charm_ai_ChangeRequest').where({ ID: changeRequestId })
      )
      if (!cr) return req.error(404, 'Change Request not found')
      if (cr.status !== 'Draft') return req.error(400, 'Only Draft CRs can be submitted')

      // Update status
      await db.run(
        UPDATE('charm_ai_ChangeRequest')
          .set({ status: 'Submitted' })
          .where({ ID: changeRequestId })
      )

      // Create approval step
      await db.run(
        INSERT.into('charm_ai_ApprovalStep').entries({
          ID: cds.utils.uuid(),
          changeRequest_ID: changeRequestId,
          approver: cr.riskLevel === 'CRITICAL' ? 'cab@charm.ai' :
                    cr.riskLevel === 'HIGH' ? 'senior-approver@charm.ai' :
                    'approver@charm.ai',
          status: 'Pending',
          stepOrder: 1
        })
      )

      return `CR submitted for approval. Risk level: ${cr.riskLevel}`
    })

    // Approve change
    this.on('approveChange', async (req) => {
      const { changeRequestId, comments } = req.data
      const db = await cds.connect.to('db')

      await db.run(
        UPDATE('charm_ai_ChangeRequest')
          .set({ status: 'Approved' })
          .where({ ID: changeRequestId })
      )

      await db.run(
        UPDATE('charm_ai_ApprovalStep')
          .set({
            status: 'Approved',
            comments: comments,
            decidedAt: new Date().toISOString()
          })
          .where({ changeRequest_ID: changeRequestId })
      )

      return 'Change Request approved successfully'
    })

    // Reject change
    this.on('rejectChange', async (req) => {
      const { changeRequestId, comments } = req.data
      const db = await cds.connect.to('db')

      await db.run(
        UPDATE('charm_ai_ChangeRequest')
          .set({ status: 'Rejected' })
          .where({ ID: changeRequestId })
      )

      await db.run(
        UPDATE('charm_ai_ApprovalStep')
          .set({
            status: 'Rejected',
            comments: comments,
            decidedAt: new Date().toISOString()
          })
          .where({ changeRequest_ID: changeRequestId })
      )

      return 'Change Request rejected'
    })

    await super.init()
  }

  // Shared OpenAI helper
  async callOpenAI(description, category, affectedModules, plannedDate) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an SAP change management expert. Always respond with valid JSON only. Never use markdown. Never use code blocks.'
          },
          {
            role: 'user',
            content: `Analyze this SAP change request and give a risk assessment.

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

riskLevel must be one of: LOW, MEDIUM, HIGH, CRITICAL`
          }
        ],
        max_tokens: 500
      })
    })

    const data = await response.json()
    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim()
    return JSON.parse(raw)
  }
}