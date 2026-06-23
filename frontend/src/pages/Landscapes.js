import React, { useState, useEffect } from 'react'
import { API } from '../App'

export default function Landscapes() {
  const [landscapes, setLandscapes] = useState([])
  const [systems, setSystems] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showLandForm, setShowLandForm] = useState(false)
  const [showSysForm, setShowSysForm] = useState(false)
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [landForm, setLandForm] = useState({ name: '', description: '', type: 'S4HANA' })
  const [sysForm, setSysForm] = useState({ sid: '', host: '', client: '100', type: 'ABAP', role: 'DEV', description: '', isSandbox: false, sortOrder: 0 })
  const [routeForm, setRouteForm] = useState({ fromSystem_ID: '', toSystem_ID: '', routeType: 'Standard' })

  const load = async () => {
    setLoading(true)
    const r = await fetch(`${API}/SystemLandscapes`)
    const d = await r.json()
    setLandscapes(d.value || [])
    setLoading(false)
  }

  const loadSystems = async (landscapeId) => {
    const r = await fetch(`${API}/SapSystems?$filter=landscape_ID eq ${landscapeId}&$orderby=sortOrder`)
    const d = await r.json()
    setSystems(d.value || [])
    const r2 = await fetch(`${API}/TransportRoutes?$filter=landscape_ID eq ${landscapeId}`)
    const d2 = await r2.json()
    setRoutes(d2.value || [])
  }

  useEffect(() => { load() }, [])

  const selectLandscape = (l) => {
    setSelected(l)
    loadSystems(l.ID)
  }

  const createLandscape = async () => {
    await fetch(`${API}/SystemLandscapes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(landForm)
    })
    setShowLandForm(false)
    setLandForm({ name: '', description: '', type: 'S4HANA' })
    load()
  }

  const createSystem = async () => {
    await fetch(`${API}/SapSystems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sysForm, landscape_ID: selected.ID })
    })
    setShowSysForm(false)
    setSysForm({ sid: '', host: '', client: '100', type: 'ABAP', role: 'DEV', description: '', isSandbox: false, sortOrder: 0 })
    loadSystems(selected.ID)
  }

  const createRoute = async () => {
    await fetch(`${API}/TransportRoutes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...routeForm, landscape_ID: selected.ID })
    })
    setShowRouteForm(false)
    setRouteForm({ fromSystem_ID: '', toSystem_ID: '', routeType: 'Standard' })
    loadSystems(selected.ID)
  }

  const deleteSystem = async (id) => {
    if (!window.confirm('Delete this system?')) return
    await fetch(`${API}/SapSystems(${id})`, { method: 'DELETE' })
    loadSystems(selected.ID)
  }

  const roleColor = { DEV: '#6366f1', QAS: '#f59e0b', PRD: '#ef4444', SBX: '#22c55e', TRN: '#06b6d4' }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>System Landscapes</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Manage SAP system landscapes — DEV, QAS, PRD, Sandbox, N+1 and more</p>
        </div>
        <button onClick={() => setShowLandForm(true)}
          style={{ padding: '10px 20px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New Landscape
        </button>
      </div>

      {/* Create landscape form */}
      {showLandForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 16, padding: 32, width: 440 }}>
            <h2 style={{ color: '#f1f5f9', marginBottom: 20, fontSize: 18 }}>New Landscape</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Name</label>
                <input value={landForm.name} onChange={e => setLandForm({ ...landForm, name: e.target.value })}
                  placeholder="e.g. S4HANA Production"
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Type</label>
                <select value={landForm.type} onChange={e => setLandForm({ ...landForm, type: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}>
                  {['S4HANA', 'ECC', 'BTP', 'CRM', 'SRM', 'SCM', 'Other'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Description</label>
                <input value={landForm.description} onChange={e => setLandForm({ ...landForm, description: e.target.value })}
                  placeholder="Brief description"
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={createLandscape}
                style={{ flex: 1, padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Create Landscape
              </button>
              <button onClick={() => setShowLandForm(false)}
                style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add system form */}
      {showSysForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 16, padding: 32, width: 500 }}>
            <h2 style={{ color: '#f1f5f9', marginBottom: 20, fontSize: 18 }}>Add SAP System</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>SID</label>
                  <input value={sysForm.sid} onChange={e => setSysForm({ ...sysForm, sid: e.target.value.toUpperCase().substring(0, 3) })}
                    placeholder="DEV"
                    style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Client</label>
                  <input value={sysForm.client} onChange={e => setSysForm({ ...sysForm, client: e.target.value })}
                    placeholder="100"
                    style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Role</label>
                  <select value={sysForm.role} onChange={e => setSysForm({ ...sysForm, role: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}>
                    {['DEV', 'QAS', 'PRD', 'SBX', 'TRN', 'N+1', 'Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Host / Application server</label>
                <input value={sysForm.host} onChange={e => setSysForm({ ...sysForm, host: e.target.value })}
                  placeholder="sap-dev-server.company.com"
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Type</label>
                  <select value={sysForm.type} onChange={e => setSysForm({ ...sysForm, type: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}>
                    {['ABAP', 'JAVA', 'HANA', 'BTP', 'Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Sort order</label>
                  <input type="number" value={sysForm.sortOrder} onChange={e => setSysForm({ ...sysForm, sortOrder: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Description</label>
                <input value={sysForm.description} onChange={e => setSysForm({ ...sysForm, description: e.target.value })}
                  placeholder="Brief description"
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
                <input type="checkbox" checked={sysForm.isSandbox} onChange={e => setSysForm({ ...sysForm, isSandbox: e.target.checked })} />
                This is a sandbox system
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={createSystem}
                style={{ flex: 1, padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Add System
              </button>
              <button onClick={() => setShowSysForm(false)}
                style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add route form */}
      {showRouteForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 16, padding: 32, width: 440 }}>
            <h2 style={{ color: '#f1f5f9', marginBottom: 20, fontSize: 18 }}>Add Transport Route</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>From system</label>
                <select value={routeForm.fromSystem_ID} onChange={e => setRouteForm({ ...routeForm, fromSystem_ID: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}>
                  <option value="">Select system...</option>
                  {systems.map(s => <option key={s.ID} value={s.ID}>{s.sid} — {s.description}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>To system</label>
                <select value={routeForm.toSystem_ID} onChange={e => setRouteForm({ ...routeForm, toSystem_ID: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}>
                  <option value="">Select system...</option>
                  {systems.map(s => <option key={s.ID} value={s.ID}>{s.sid} — {s.description}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Route type</label>
                <select value={routeForm.routeType} onChange={e => setRouteForm({ ...routeForm, routeType: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}>
                  {['Standard', 'Consolidation', 'Delivery', 'Extended'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={createRoute}
                style={{ flex: 1, padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Add Route
              </button>
              <button onClick={() => setShowRouteForm(false)}
                style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap: 20 }}>
        {/* Landscape list */}
        <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3148', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
            Landscapes ({landscapes.length})
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : landscapes.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No landscapes yet</div>
          ) : landscapes.map(l => (
            <div key={l.ID} onClick={() => selectLandscape(l)}
              style={{ padding: '14px 20px', borderBottom: '1px solid #2d3148', cursor: 'pointer', background: selected?.ID === l.ID ? '#6366f120' : 'transparent' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{l.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{l.type} · {l.description}</div>
            </div>
          ))}
        </div>

        {/* Landscape detail */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Systems */}
            <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3148', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>SAP Systems ({systems.length})</div>
                <button onClick={() => setShowSysForm(true)}
                  style={{ fontSize: 11, padding: '5px 12px', background: '#6366f120', border: '1px solid #6366f140', borderRadius: 6, color: '#818cf8', cursor: 'pointer' }}>
                  + Add System
                </button>
              </div>

              {/* Visual landscape route */}
              {systems.length > 0 && (
                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', borderBottom: '1px solid #2d3148' }}>
                  {systems.sort((a, b) => a.sortOrder - b.sortOrder).map((s, i) => (
                    <React.Fragment key={s.ID}>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 12, background: (roleColor[s.role] || '#94a3b8') + '20', border: `2px solid ${roleColor[s.role] || '#94a3b8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: roleColor[s.role] || '#94a3b8', fontFamily: 'monospace', margin: '0 auto' }}>
                          {s.sid}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{s.role}</div>
                        {s.isSandbox && <div style={{ fontSize: 9, color: '#22c55e' }}>SANDBOX</div>}
                      </div>
                      {i < systems.length - 1 && <div style={{ fontSize: 18, color: '#2d3148', flexShrink: 0 }}>→</div>}
                    </React.Fragment>
                  ))}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f1117' }}>
                    {['SID', 'Role', 'Client', 'Host', 'Type', 'Sandbox', ''].map(h => (
                      <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {systems.map(s => (
                    <tr key={s.ID} style={{ borderTop: '1px solid #2d3148' }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 13, color: roleColor[s.role] || '#e2e8f0', fontWeight: 700 }}>{s.sid}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: (roleColor[s.role] || '#94a3b8') + '20', color: roleColor[s.role] || '#94a3b8' }}>{s.role}</span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#94a3b8' }}>{s.client}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{s.host}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{s.type}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: s.isSandbox ? '#22c55e' : '#64748b' }}>{s.isSandbox ? 'Yes' : 'No'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <button onClick={() => deleteSystem(s.ID)}
                          style={{ fontSize: 11, padding: '3px 8px', background: '#ef444420', border: '1px solid #ef444440', borderRadius: 4, color: '#ef4444', cursor: 'pointer' }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Routes */}
            <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3148', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Transport Routes ({routes.length})</div>
                <button onClick={() => setShowRouteForm(true)}
                  style={{ fontSize: 11, padding: '5px 12px', background: '#6366f120', border: '1px solid #6366f140', borderRadius: 6, color: '#818cf8', cursor: 'pointer' }}>
                  + Add Route
                </button>
              </div>
              {routes.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No routes defined yet</div>
              ) : routes.map(r => {
                const from = systems.find(s => s.ID === r.fromSystem_ID)
                const to = systems.find(s => s.ID === r.toSystem_ID)
                return (
                  <div key={r.ID} style={{ padding: '12px 20px', borderBottom: '1px solid #2d3148', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: roleColor[from?.role] || '#e2e8f0' }}>{from?.sid || '?'}</span>
                    <span style={{ color: '#6366f1', fontSize: 16 }}>→</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: roleColor[to?.role] || '#e2e8f0' }}>{to?.sid || '?'}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#6366f120', color: '#818cf8', marginLeft: 8 }}>{r.routeType}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: r.isActive ? '#22c55e20' : '#94a3b820', color: r.isActive ? '#22c55e' : '#94a3b8', marginLeft: 'auto' }}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}