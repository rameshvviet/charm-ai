import React, { useState, useEffect } from 'react'
import { API } from '../App'

const RiskBadge = ({ level }) => {
  const colors = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444', CRITICAL: '#dc2626' }
  const bg = { LOW: '#22c55e20', MEDIUM: '#f59e0b20', HIGH: '#ef444420', CRITICAL: '#dc262620' }
  return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: colors[level] || '#94a3b8', background: bg[level] || '#94a3b820' }}>{level || 'N/A'}</span>
}

const StatusBadge = ({ status }) => {
  const colors = { Draft: '#94a3b8', Submitted: '#f59e0b', Approved: '#22c55e', Rejected: '#ef4444', Deployed: '#6366f1' }
  return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: colors[status] || '#94a3b8', background: (colors[status] || '#94a3b8') + '20' }}>{status}</span>
}

export default function ChangeRequests() {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'ABAP', priority: 'Medium', affectedModules: '', requestedBy: '', businessImpact: '', type: 'Normal' })

  const load = () => {
    setLoading(true)
    fetch(`${API}/ChangeRequests?$orderby=createdAt desc`)
      .then(r => r.json())
      .then(d => { setChanges(d.value || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    setSubmitting(true)
    try {
      await fetch(`${API}/ChangeRequests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      setShowForm(false)
      setForm({ title: '', description: '', category: 'ABAP', priority: 'Medium', affectedModules: '', requestedBy: '', businessImpact: '', type: 'Normal' })
      load()
    } catch (err) { alert('Error creating CR') }
    setSubmitting(false)
  }

  const submitForApproval = async (id) => {
    await fetch(`${API}/submitForApproval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeRequestId: id })
    })
    load()
    setSelected(null)
  }

  const generateTests = async (id) => {
    const r = await fetch(`${API}/generateTestCases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeId: id })
    })
    const d = await r.json()
    alert(d.value)
  }

  const detectRetrofit = async (id) => {
    const r = await fetch(`${API}/detectRetrofits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeId: id })
    })
    const d = await r.json()
    const result = JSON.parse(d.value)
    alert(result.retrofitNeeded ? `⚠️ Retrofit needed: ${result.reason}` : '✅ No retrofit needed')
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Change Requests</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>AI auto-scores risk on every submission</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New Change Request
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 16, padding: 32, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f1f5f9', marginBottom: 24, fontSize: 18 }}>New Change Request</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Title', key: 'title', placeholder: 'Brief description of the change' },
                { label: 'Requested by', key: 'requestedBy', placeholder: 'email@company.com' },
                { label: 'Affected modules', key: 'affectedModules', placeholder: 'FI, CO, HR...' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description — AI will auto-score risk based on this"
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Category', key: 'category', options: ['ABAP', 'Basis', 'Finance', 'HR', 'SD', 'MM', 'PP', 'UI', 'Integration', 'Other'] },
                  { label: 'Priority', key: 'priority', options: ['Low', 'Medium', 'High', 'Critical'] },
                  { label: 'Type', key: 'type', options: ['Normal', 'Urgent', 'Defect', 'Hotfix'] },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>{f.label}</label>
                    <select value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}>
                      {f.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Business impact</label>
                <textarea value={form.businessImpact} onChange={e => setForm({ ...form, businessImpact: e.target.value })}
                  placeholder="What business processes are affected?"
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={submit} disabled={submitting || !form.title || !form.description}
                style={{ flex: 1, padding: '12px', background: submitting ? '#4338ca' : '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {submitting ? '🤖 AI scoring risk...' : 'Create + AI Risk Score'}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 16, padding: 32, width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: 18, marginBottom: 8 }}>{selected.title}</h2>
                <div style={{ display: 'flex', gap: 8 }}><StatusBadge status={selected.status} /><RiskBadge level={selected.riskLevel} /></div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Category', value: selected.category },
                { label: 'Priority', value: selected.priority },
                { label: 'Type', value: selected.type },
                { label: 'Requested by', value: selected.requestedBy },
                { label: 'Affected modules', value: selected.affectedModules },
                { label: 'Planned date', value: selected.plannedDate },
              ].map(f => (
                <div key={f.label} style={{ background: '#0f1117', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: '#e2e8f0' }}>{f.value || '—'}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#0f1117', borderRadius: 8, padding: '14px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{selected.description}</div>
            </div>

            {selected.riskReason && (
              <div style={{ background: '#0f1117', borderRadius: 8, padding: '14px', marginBottom: 20, borderLeft: '3px solid #6366f1' }}>
                <div style={{ fontSize: 11, color: '#6366f1', marginBottom: 6 }}>🤖 AI Risk Assessment</div>
                <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{selected.riskReason}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selected.status === 'Draft' && (
                <button onClick={() => submitForApproval(selected.ID)}
                  style={{ padding: '9px 16px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Submit for Approval
                </button>
              )}
              <button onClick={() => generateTests(selected.ID)}
                style={{ padding: '9px 16px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
                🧪 Generate Test Cases
              </button>
              <button onClick={() => detectRetrofit(selected.ID)}
                style={{ padding: '9px 16px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
                🔄 Check Retrofit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f1117' }}>
                {['Title', 'Type', 'Status', 'Risk', 'Priority', 'Category', 'Requested by', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={c.ID} style={{ borderTop: '1px solid #2d3148', cursor: 'pointer' }} onClick={() => setSelected(c)}>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#e2e8f0', maxWidth: 200 }}>
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{c.type}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '12px 16px' }}><RiskBadge level={c.riskLevel} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{c.priority}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{c.category}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{c.requestedBy}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#6366f1' }}>View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}