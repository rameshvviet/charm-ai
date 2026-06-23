import React, { useState, useRef, useEffect } from 'react'
import { API } from '../App'

const ToolStep = ({ step }) => {
  const icons = {
    createChangeRequest: '📋',
    getChangeRequests: '🔍',
    submitForApproval: '✅',
    checkTransportDependencies: '🔗',
    checkOverwriteConflicts: '⚠️',
    detectRetrofits: '🔄',
    generateTestCases: '🧪',
    getTransports: '🚚',
    getLandscapes: '🌐',
    getAuditTrail: '📜'
  }
  const colors = { done: '#22c55e', running: '#f59e0b', error: '#ef4444' }
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#0f1117', borderRadius: 8, marginBottom: 6, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icons[step.tool] || '⚙️'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0' }}>{step.tool}</span>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: colors[step.status] + '20', color: colors[step.status] }}>{step.status}</span>
        </div>
        {step.result && (
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5, wordBreak: 'break-word' }}>
            {step.result.substring(0, 200)}{step.result.length > 200 ? '...' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

const Message = ({ msg }) => {
  const isUser = msg.role === 'user'
  const isAgent = msg.role === 'agent'
  const isSystem = msg.role === 'system'

  if (isSystem) return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <span style={{ fontSize: 11, color: '#64748b', background: '#1a1d27', padding: '4px 12px', borderRadius: 20 }}>{msg.content}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: isUser ? '#6366f1' : '#1a1d27', border: isUser ? 'none' : '1px solid #2d3148', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div style={{ maxWidth: '75%' }}>
        {isAgent && msg.steps?.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Agent actions</div>
            {msg.steps.map((step, i) => <ToolStep key={i} step={step} />)}
          </div>
        )}
        <div style={{ background: isUser ? '#6366f1' : '#1a1d27', border: isUser ? 'none' : '1px solid #2d3148', borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '12px 16px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {msg.content}
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, textAlign: isUser ? 'right' : 'left' }}>{msg.time}</div>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'Show me all change requests and their risk levels',
  'Create an urgent hotfix for the payroll module and submit for approval',
  'What transports are currently open?',
  'Check for overwrite conflicts in the transport queue',
  'Show me the system landscapes configured',
  'Generate test cases for the latest change request',
]

export default function AgentChat() {
  const [messages, setMessages] = useState([
    {
      role: 'agent',
      content: 'Hello! I am ChARM AI — your intelligent SAP change management agent.\n\nI can create change requests, check transport dependencies, detect conflicts, submit approvals, generate test cases, and much more — all from natural language.\n\nWhat would you like to do?',
      steps: [],
      time: new Date().toLocaleTimeString()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')

    const userMsg = { role: 'user', content: userText, time: new Date().toLocaleTimeString() }
    const thinkingMsg = { role: 'agent', content: '🤖 Thinking...', steps: [], time: '', loading: true }

    setMessages(prev => [...prev, userMsg, thinkingMsg])
    setLoading(true)

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: JSON.stringify(history)
        })
      })

      const data = await res.json()
      const result = JSON.parse(data.value)

      const agentMsg = {
        role: 'agent',
        content: result.response,
        steps: result.steps || [],
        time: new Date().toLocaleTimeString()
      }

      setMessages(prev => [...prev.slice(0, -1), agentMsg])
      setHistory(result.messages || [])

    } catch (err) {
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'agent',
        content: 'Sorry, something went wrong. Please try again.',
        steps: [],
        time: new Date().toLocaleTimeString()
      }])
    }

    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>

      {/* Header */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid #2d3148', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>ChARM AI Agent</div>
          <div style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            Online · GPT-4o powered
          </div>
        </div>
        <button onClick={() => { setMessages([{ role: 'agent', content: 'New conversation started. How can I help you?', steps: [], time: new Date().toLocaleTimeString() }]); setHistory([]) }}
          style={{ marginLeft: 'auto', padding: '6px 14px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
          New chat
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 32px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)}
              style={{ padding: '7px 14px', background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 20, color: '#94a3b8', fontSize: 12, cursor: 'pointer', transition: 'all .15s' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '16px 32px 24px', borderTop: '1px solid #2d3148', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, padding: '8px 8px 8px 16px', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask the agent anything... e.g. 'Create a hotfix CR for the payroll bug and check dependencies'"
            rows={1}
            disabled={loading}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 13, resize: 'none', lineHeight: 1.6, maxHeight: 120, overflowY: 'auto', padding: '6px 0' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{ width: 36, height: 36, background: loading || !input.trim() ? '#2d3148' : '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 16, cursor: loading || !input.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}>
            {loading ? '⏳' : '↑'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
          Press Enter to send · Shift+Enter for new line · Agent has access to all ChARM AI functions
        </div>
      </div>
    </div>
  )
}