import React, { useState, useEffect } from 'react'
import { API } from '../App'

const StatCard = ({ label, value, color, icon }) => (
  <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, padding: '20px 24px', flex: 1 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: color || '#e2e8f0' }}>{value}</div>
      </div>
      <div style={{ fontSize: 24 }}>{icon}</div>
    </div>
  </div>
)

const RiskBadge = ({ level }) => {
  const colors = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444', CRITICAL: '#dc2626' }
  const bg = { LOW: '#22c55e20', MEDIUM: '#f59e0b20', HIGH: '#ef444420', CRITICAL: '#dc262620' }
  return (
    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: colors[level] || '#94a3b8', background: bg[level] || '#94a3b820' }}>
      {level || 'N/A'}
    </span>
  )
}

export default function Dashboard() {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/ChangeRequests?$orderby=createdAt desc&$top=50`)
      .then(r => r.json())
      .then(d => { setChanges(d.value || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const total = changes.length
  const critical = changes.filter(c => c.riskLevel === 'CRITICAL').length
  const pending = changes.filter(c => c.status === 'Submitted').length
  const approved = changes.filter(c => c.status === 'Approved').length

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>AI-powered change management overview</p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total changes" value={total} icon="📋" color="#818cf8" />
        <StatCard label="Pending approval" value={pending} icon="⏳" color="#f59e0b" />
        <StatCard label="Critical risk" value={critical} icon="🚨" color="#ef4444" />
        <StatCard label="Approved" value={approved} icon="✅" color="#22c55e" />
      </div>

      <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #2d3148', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>Recent change requests</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{total} total</div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>
        ) : changes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div>No change requests yet</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f1117' }}>
                {['Title', 'Status', 'Risk', 'Priority', 'Category', 'Requested by'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={c.ID} style={{ borderTop: '1px solid #2d3148', background: i % 2 === 0 ? 'transparent' : 'rgba(15,17,23,0.5)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#e2e8f0', maxWidth: 220 }}>
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: c.status === 'Approved' ? '#22c55e20' : c.status === 'Submitted' ? '#f59e0b20' : '#94a3b820', color: c.status === 'Approved' ? '#22c55e' : c.status === 'Submitted' ? '#f59e0b' : '#94a3b8', fontWeight: 500 }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}><RiskBadge level={c.riskLevel} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{c.priority}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{c.category}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{c.requestedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}