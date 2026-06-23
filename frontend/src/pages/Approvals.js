import React, { useState, useEffect } from 'react'
import { API } from '../App'

export default function Approvals() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState({})

  const load = () => {
    setLoading(true)
    fetch(`${API}/ApprovalSteps?$expand=changeRequest&$filter=status eq 'Pending'`)
      .then(r => r.json())
      .then(d => { setApprovals(d.value || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const approve = async (step) => {
    await fetch(`${API}/approveChange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeRequestId: step.changeRequest_ID, comments: comments[step.ID] || 'Approved' })
    })
    load()
  }

  const reject = async (step) => {
    if (!comments[step.ID]) return alert('Please enter rejection reason')
    await fetch(`${API}/rejectChange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeRequestId: step.changeRequest_ID, comments: comments[step.ID] })
    })
    load()
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Approvals</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Pending change request approvals</p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>
      ) : approvals.length === 0 ? (
        <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <div style={{ color: '#64748b', fontSize: 15 }}>No pending approvals</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {approvals.map(step => (
            <div key={step.ID} style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
                    {step.changeRequest?.title || 'Change Request'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Approver: {step.approver} · Role: {step.role} · Step {step.stepOrder}
                  </div>
                </div>
                <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#f59e0b20', color: '#f59e0b' }}>
                  Pending
                </span>
              </div>

              {step.changeRequest?.riskReason && (
                <div style={{ background: '#0f1117', borderRadius: 8, padding: 12, marginBottom: 16, borderLeft: '3px solid #6366f1' }}>
                  <div style={{ fontSize: 11, color: '#6366f1', marginBottom: 4 }}>🤖 AI Risk Assessment</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                    {step.changeRequest.riskReason?.substring(0, 300)}...
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <textarea
                  placeholder="Add comments (required for rejection)..."
                  value={comments[step.ID] || ''}
                  onChange={e => setComments({ ...comments, [step.ID]: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13, resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => approve(step)}
                  style={{ padding: '9px 24px', background: '#22c55e', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  ✓ Approve
                </button>
                <button onClick={() => reject(step)}
                  style={{ padding: '9px 24px', background: '#ef444420', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}