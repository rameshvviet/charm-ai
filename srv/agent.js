const cds = require('@sap/cds')

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'createChangeRequest',
      description: 'Create a new SAP change request with AI risk scoring',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the change request' },
          description: { type: 'string', description: 'Detailed description of the change' },
          category: { type: 'string', enum: ['ABAP', 'Basis', 'Finance', 'HR', 'SD', 'MM', 'PP', 'UI', 'Integration', 'Other'] },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
          type: { type: 'string', enum: ['Normal', 'Urgent', 'Defect', 'Hotfix'] },
          affectedModules: { type: 'string', description: 'Comma separated list of affected SAP modules' },
          requestedBy: { type: 'string', description: 'Email of the requester' },
          plannedDate: { type: 'string', description: 'Planned date in YYYY-MM-DD format' }
        },
        required: ['title', 'description', 'category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getChangeRequests',
      description: 'Get list of change requests with optional filters',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status: Draft, Submitted, Approved, Rejected, Deployed' },
          riskLevel: { type: 'string', description: 'Filter by risk: LOW, MEDIUM, HIGH, CRITICAL' },
          category: { type: 'string', description: 'Filter by category' },
          limit: { type: 'number', description: 'Number of results to return' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkTransportDependencies',
      description: 'Run AI dependency check on a transport request',
      parameters: {
        type: 'object',
        properties: {
          transportId: { type: 'string', description: 'UUID of the transport request' }
        },
        required: ['transportId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkOverwriteConflicts',
      description: 'Check for overwrite conflicts in the transport queue',
      parameters: {
        type: 'object',
        properties: {
          landscapeId: { type: 'string', description: 'UUID of the landscape to check' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'submitForApproval',
      description: 'Submit a change request for approval workflow',
      parameters: {
        type: 'object',
        properties: {
          changeRequestId: { type: 'string', description: 'UUID of the change request' }
        },
        required: ['changeRequestId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generateTestCases',
      description: 'Generate AI test cases for a change request',
      parameters: {
        type: 'object',
        properties: {
          changeId: { type: 'string', description: 'UUID of the change request' }
        },
        required: ['changeId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTransports',
      description: 'Get list of transport requests',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status: Open, Released, Imported' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getLandscapes',
      description: 'Get system landscapes and their systems',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'detectRetrofits',
      description: 'Detect if a change request needs a retrofit',
      parameters: {
        type: 'object',
        properties: {
          changeId: { type: 'string', description: 'UUID of the change request' }
        },
        required: ['changeId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAuditTrail',
      description: 'Get audit trail entries for compliance reporting',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string', description: 'Filter by entity type' },
          limit: { type: 'number', description: 'Number of entries to return' }
        }
      }
    }
  }
]

async function executeTool(toolName, args) {
  const db = await cds.connect.to('db')
  const baseUrl = 'http://localhost:4004/api'

  switch (toolName) {
    case 'createChangeRequest': {
      const res = await fetch(`${baseUrl}/ChangeRequests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      })
      const data = await res.json()
      return `Created CR: "${data.title}" (ID: ${data.ID}) | Risk: ${data.riskLevel} | ${data.riskReason?.substring(0, 200)}`
    }

    case 'getChangeRequests': {
      let url = `${baseUrl}/ChangeRequests?$top=${args.limit || 10}`
      const filters = []
      if (args.status) filters.push(`status eq '${args.status}'`)
      if (args.riskLevel) filters.push(`riskLevel eq '${args.riskLevel}'`)
      if (args.category) filters.push(`category eq '${args.category}'`)
      if (filters.length) url += `&$filter=${filters.join(' and ')}`
      const res = await fetch(url)
      const data = await res.json()
      const items = data.value || []
      if (items.length === 0) return 'No change requests found matching criteria'
      return items.map(c => `• ${c.title} | Status: ${c.status} | Risk: ${c.riskLevel || 'N/A'} | ID: ${c.ID}`).join('\n')
    }

    case 'checkTransportDependencies': {
      const res = await fetch(`${baseUrl}/checkDependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transportId: args.transportId })
      })
      const data = await res.json()
      const result = JSON.parse(data.value || '{}')
      return `Dependency check: Severity ${result.severity}. Missing: ${(result.missingDependencies || []).join(', ') || 'none'}. ${result.recommendation || ''}`
    }

    case 'checkOverwriteConflicts': {
      const res = await fetch(`${baseUrl}/checkOverwrites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landscapeId: args.landscapeId || 'default' })
      })
      const data = await res.json()
      return data.value || 'Conflict check complete'
    }

    case 'submitForApproval': {
      const res = await fetch(`${baseUrl}/submitForApproval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeRequestId: args.changeRequestId })
      })
      const data = await res.json()
      return data.value || 'Submitted for approval'
    }

    case 'generateTestCases': {
      const res = await fetch(`${baseUrl}/generateTestCases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId: args.changeId })
      })
      const data = await res.json()
      return data.value || 'Test cases generated'
    }

    case 'getTransports': {
      let url = `${baseUrl}/TransportRequests?$top=20`
      if (args.status) url += `&$filter=status eq '${args.status}'`
      const res = await fetch(url)
      const data = await res.json()
      const items = data.value || []
      if (items.length === 0) return 'No transports found'
      return items.map(t => `• ${t.transportNumber} | ${t.description} | Status: ${t.status} | ID: ${t.ID}`).join('\n')
    }

    case 'getLandscapes': {
      const res = await fetch(`${baseUrl}/SystemLandscapes`)
      const data = await res.json()
      const items = data.value || []
      if (items.length === 0) return 'No landscapes configured'
      return items.map(l => `• ${l.name} (${l.type}) | ID: ${l.ID}`).join('\n')
    }

    case 'detectRetrofits': {
      const res = await fetch(`${baseUrl}/detectRetrofits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId: args.changeId })
      })
      const data = await res.json()
      const result = JSON.parse(data.value || '{}')
      return result.retrofitNeeded
        ? `Retrofit needed: ${result.reason} | Urgency: ${result.urgency}`
        : 'No retrofit needed'
    }

    case 'getAuditTrail': {
      let url = `${baseUrl}/AuditEntries?$top=${args.limit || 20}&$orderby=changedAt desc`
      if (args.entityName) url += `&$filter=entityName eq '${args.entityName}'`
      const res = await fetch(url)
      const data = await res.json()
      const items = data.value || []
      if (items.length === 0) return 'No audit entries found'
      return items.map(a => `• ${a.action} on ${a.entityName} by ${a.changedBy} at ${a.changedAt}`).join('\n')
    }

    default:
      return `Unknown tool: ${toolName}`
  }
}

async function runAgent(userMessage, conversationHistory = []) {
  const messages = [
    {
      role: 'system',
      content: `You are ChARM AI — an intelligent SAP Change and Release Management agent. You help SAP teams manage change requests, transport requests, approvals, dependency checks, and system landscapes.

You have access to tools to:
- Create and manage change requests
- Check transport dependencies and conflicts  
- Submit for approvals
- Generate test cases
- Detect retrofits
- Query audit trails
- Manage system landscapes

When a user asks you to do something, use your tools to actually do it — don't just describe what you would do. Be concise in your responses. Report what you did and what you found.

Current date: ${new Date().toISOString().split('T')[0]}`
    },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]

  const steps = []
  let iterations = 0
  const maxIterations = 10

  while (iterations < maxIterations) {
    iterations++

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 2000
      })
    })

    const data = await response.json()
    const choice = data.choices[0]
    const assistantMessage = choice.message

    messages.push(assistantMessage)

    if (choice.finish_reason === 'stop' || !assistantMessage.tool_calls) {
      return {
        response: assistantMessage.content,
        steps,
        messages: messages.slice(2)
      }
    }

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name
      const toolArgs = JSON.parse(toolCall.function.arguments)

      steps.push({ tool: toolName, args: toolArgs, status: 'running' })

      let toolResult
      try {
        toolResult = await executeTool(toolName, toolArgs)
        steps[steps.length - 1].status = 'done'
        steps[steps.length - 1].result = toolResult
      } catch (err) {
        toolResult = `Error: ${err.message}`
        steps[steps.length - 1].status = 'error'
        steps[steps.length - 1].result = toolResult
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: toolResult
      })
    }
  }

  return {
    response: 'Agent reached maximum iterations. Please try a simpler request.',
    steps,
    messages: messages.slice(2)
  }
}

module.exports = { runAgent, TOOLS }