import React, { useState, useEffect } from 'react'
import { API } from '../App'

export default function Transports() {
  const [transports, setTransports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [objects, setObjects] = useState([])
  const [checking, setChecking] = useState(false)
  const [depResult, setDepResult] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ transportNumber: '', description: '', owner: '', type: 'Workbench', category: 'ABAP' })

  const load = () => {
    setLoading(true)
    fetch(`${API}/TransportRequests`)
      .then(r => r.json())
      .then(d => { setTransports(d.value || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const selectTransport = async (t) => {
    setSelected(t)
    setDepResult(null)
    const r = await fetch(`${API}/TransportObjects?$filter=transport_ID eq ${t.ID}`)
    const d = await r.json()
    setObjects(d.value || [])
  }

  const checkDeps = async () => {
    setChecking(true)
    setDepResult(null)
    try {
      const r = await fetch(`${API}/checkDependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transportId: selected.ID })
      })
      const d = await r.json()
      setDepResult(JSON.parse(d.value))
    } catch (err) { alert('Check failed') }
    setChecking(false)
  }

  const addObject = async (transportId) => {
    const pgmid = prompt('PGMID (e.g. R3TR):')
    const object = prompt('Object type (e.g. PROG, FUGR, TABL):')
    const objName = prompt('Object name (e.g. ZPROGRAM):')
    if (!pgmid || !object || !objName) return
    await fetch(`${API}/TransportObjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transport_ID: transportId, pgmid, object, objName, activity: 'M' })
    })
    selectTransport(selected)
  }

  const createTransport = async () => {
    await fetch(`${API}/TransportRequests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setShowForm(false)
    setForm({ transportNumber: '', description: '', owner: '', type: 'Workbench', category: 'ABAP' })
    load()
  }

  const severityColor = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444', CRITICAL: '#dc2626' }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Transport Management</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>AI-powered dependency and conflict checking</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New Transport
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 16, padding: 32, width: 480 }}>
            <h2 style={{ color: '#f1f5f9', marginBottom: 20, fontSize: 18 }}>New Transport Request</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Transport number', key: 'transportNumber', placeholder: 'DEV123456' },
                { label: 'Description', key: 'description', placeholder: 'What does this transport contain?' },
                { label: 'Owner', key: 'owner', placeholder: 'developer@company.com' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Type', key: 'type', options: ['Workbench', 'Customizing', 'Transport of Copies'] },
                  { label: 'Category', key: 'category', options: ['ABAP', 'Basis', 'Finance', 'HR', 'Other'] },
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
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={createTransport}
                style={{ flex: 1, padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Create Transport
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Transport list */}
        <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3148', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
            Transport Requests ({transports.length})
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : transports.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No transports yet</div>
          ) : transports.map(t => (
            <div key={t.ID} onClick={() => selectTransport(t)}
              style={{ padding: '14px 20px', borderBottom: '1px solid #2d3148', cursor: 'pointer', background: selected?.ID === t.ID ? '#6366f120' : 'transparent', transition: 'background .15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', fontFamily: 'monospace' }}>{t.transportNumber}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.description}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: t.status === 'Open' ? '#22c55e20' : '#94a3b820', color: t.status === 'Open' ? '#22c55e' : '#94a3b8' }}>{t.status}</span>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{t.type}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Transport detail */}
        {selected && (
          <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3148', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{selected.transportNumber}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ padding: 20 }}>
              {/* Objects */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>TRANSPORT OBJECTS ({objects.length})</div>
                  <button onClick={() => addObject(selected.ID)}
                    style={{ fontSize: 11, padding: '4px 10px', background: '#6366f120', border: '1px solid #6366f140', borderRadius: 6, color: '#818cf8', cursor: 'pointer' }}>
                    + Add Object
                  </button>
                </div>
                {objects.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12, background: '#0f1117', borderRadius: 8 }}>No objects added yet</div>
                ) : (
                  <div style={{ background: '#0f1117', borderRadius: 8, overflow: 'hidden' }}>
                    {objects.map((o, i) => (
                      <div key={o.ID} style={{ padding: '8px 12px', borderBottom: i < objects.length - 1 ? '1px solid #2d3148' : 'none', display: 'flex', gap: 12, fontFamily: 'monospace', fontSize: 12 }}>
                        <span style={{ color: '#6366f1', minWidth: 40 }}>{o.pgmid}</span>
                        <span style={{ color: '#f59e0b', minWidth: 50 }}>{o.object}</span>
                        <span style={{ color: '#e2e8f0' }}>{o.objName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Dependency check */}
              <button onClick={checkDeps} disabled={checking}
                style={{ width: '100%', padding: '12px', background: checking ? '#4338ca' : '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
                {checking ? '🤖 AI analyzing dependencies...' : '🔍 Run AI Dependency Check'}
              </button>

              {depResult && (
                <div style={{ background: '#0f1117', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>AI Dependency Analysis</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, color: severityColor[depResult.severity], background: severityColor[depResult.severity] + '20' }}>{depResult.severity}</span>
                  </div>
                  {depResult.missingDependencies?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>⚠️ Missing dependencies:</div>
                      {depResult.missingDependencies.map((d, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#94a3b8', padding: '3px 0', paddingLeft: 12 }}>• {d}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>{depResult.recommendation}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}