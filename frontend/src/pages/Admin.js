import React, { useState, useEffect } from 'react'
import { API } from '../App'

const Toggle = ({ value, onChange }) => (
  <div onClick={() => onChange(!value)} style={{ width: 36, height: 20, background: value ? '#6366f1' : '#2d3148', borderRadius: 10, position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
    <div style={{ width: 16, height: 16, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: value ? 18 : 2, transition: 'left .2s' }} />
  </div>
)

const Badge = ({ label, color }) => {
  const colors = { green: ['#22c55e20', '#22c55e'], amber: ['#f59e0b20', '#f59e0b'], red: ['#ef444420', '#ef4444'], purple: ['#6366f120', '#818cf8'], gray: ['#94a3b820', '#94a3b8'] }
  const [bg, text] = colors[color] || colors.gray
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: bg, color: text, fontWeight: 500 }}>{label}</span>
}

export default function Admin() {
  const [tab, setTab] = useState('workflows')
  const [workflows, setWorkflows] = useState([])
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [rules, setRules] = useState([
    { id: 1, field: 'riskLevel', operator: 'is', value: 'CRITICAL', workflow: 'Critical / CAB' },
    { id: 2, field: 'category', operator: 'is', value: 'Finance', workflow: 'Critical / CAB' },
    { id: 3, field: 'type', operator: 'is', value: 'Hotfix', workflow: 'Standard' },
  ])
  const [settings, setSettings] = useState({
    enforceSoD: true,
    requireTests: true,
    enforceFreezeWindows: true,
    allowEmergencyBypass: true,
    aiAutoScore: true,
    slaLow: 5, slaMedium: 3, slaHigh: 1,
    emailOnApproval: true,
    emailOnSLA: true,
    emailOnImportFail: true
  })
  const [showWorkflowForm, setShowWorkflowForm] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [workflowForm, setWorkflowForm] = useState({ name: '', description: '', isDefault: false })
  const [groupForm, setGroupForm] = useState({ name: '', description: '', members: '', quorum: 'any' })
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'Developer' })
  const [workflowSteps, setWorkflowSteps] = useState({})
  const [expandedWorkflow, setExpandedWorkflow] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [dragItem, setDragItem] = useState(null)

  useEffect(() => {
    loadWorkflows()
    loadGroups()
    loadUsers()
  }, [])

  const loadWorkflows = async () => {
    try {
      const r = await fetch(`${API}/ApprovalWorkflows`)
      const d = await r.json()
      const wfs = d.value || []
      setWorkflows(wfs)
      for (const wf of wfs) {
        const sr = await fetch(`${API}/ApprovalWorkflowSteps?$filter=workflow_ID eq ${wf.ID}&$orderby=stepOrder`)
        const sd = await sr.json()
        setWorkflowSteps(prev => ({ ...prev, [wf.ID]: sd.value || [] }))
      }
    } catch (e) {}
  }

  const loadGroups = async () => {
    try {
      const r = await fetch(`${API}/TransportGroups`)
      const d = await r.json()
      setGroups(d.value || [])
    } catch (e) {}
  }

  const loadUsers = async () => {
    try {
      const r = await fetch(`${API}/Users`)
      const d = await r.json()
      setUsers(d.value || [])
    } catch (e) {}
  }

  const createWorkflow = async () => {
    await fetch(`${API}/ApprovalWorkflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...workflowForm, isActive: true })
    })
    setShowWorkflowForm(false)
    setWorkflowForm({ name: '', description: '', isDefault: false })
    loadWorkflows()
  }

  const deleteWorkflow = async (id) => {
    if (!window.confirm('Delete this workflow?')) return
    await fetch(`${API}/ApprovalWorkflows(${id})`, { method: 'DELETE' })
    loadWorkflows()
  }

  const addStep = async (workflowId) => {
    const steps = workflowSteps[workflowId] || []
    await fetch(`${API}/ApprovalWorkflowSteps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_ID: workflowId,
        stepName: 'New approval step',
        approverRole: 'Approver',
        stepOrder: steps.length + 1,
        slaDays: 2,
        requiresAll: false,
        isCab: false
      })
    })
    loadWorkflows()
  }

  const deleteStep = async (stepId, workflowId) => {
    await fetch(`${API}/ApprovalWorkflowSteps(${stepId})`, { method: 'DELETE' })
    loadWorkflows()
  }

  const createGroup = async () => {
    await fetch(`${API}/TransportGroups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupForm.name, description: groupForm.description, isActive: true, requiresDependencyCheck: true, requiresOverwriteCheck: true, requiresTestCompletion: true })
    })
    setShowGroupForm(false)
    setGroupForm({ name: '', description: '', members: '', quorum: 'any' })
    loadGroups()
  }

  const createUser = async () => {
    await fetch(`${API}/Users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userForm, isActive: true, notifyEmail: true })
    })
    setShowUserForm(false)
    setUserForm({ name: '', email: '', role: 'Developer' })
    loadUsers()
  }

  const addRule = () => {
    setRules([...rules, { id: Date.now(), field: 'riskLevel', operator: 'is', value: 'HIGH', workflow: 'Standard', connector: 'AND', field2: '', value2: '' }])
  }

  const updateRule = (id, key, val) => setRules(rules.map(r => r.id === id ? { ...r, [key]: val } : r))
  const deleteRule = (id) => setRules(rules.filter(r => r.id !== id))

  const s = (label) => ({ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 })
  const input = { width: '100%', padding: '9px 11px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13, marginBottom: 10 }
  const select = { padding: '8px 10px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 7, color: '#e2e8f0', fontSize: 12, flex: 1 }
  const card = { background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, padding: 18, marginBottom: 12 }
  const modal = { position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
  const modalBox = { background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 16, padding: 28, width: 480 }

  const tabs = [
    { id: 'workflows', label: 'Workflows' },
    { id: 'groups', label: 'Groups' },
    { id: 'matrix', label: 'Routing rules' },
    { id: 'users', label: 'Users' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Admin Console</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Configure workflows, groups, routing rules, and system settings</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #2d3148', marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 16px', background: 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent', color: tab === t.id ? '#818cf8' : '#64748b', fontSize: 13, fontWeight: tab === t.id ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* WORKFLOWS */}
      {tab === 'workflows' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8' }}>
            Build approval workflows for your company. Each workflow has steps — drag to reorder. Assign each step to a group. Link workflows to transport groups via Routing Rules.
          </div>

          {workflows.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
              <div style={{ color: '#64748b', marginBottom: 16 }}>No workflows yet. Create your first one.</div>
            </div>
          ) : workflows.map(wf => (
            <div key={wf.ID} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{wf.name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {wf.isActive ? <Badge label="Active" color="green" /> : <Badge label="Inactive" color="gray" />}
                    {wf.isDefault && <Badge label="Default" color="purple" />}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setExpandedWorkflow(expandedWorkflow === wf.ID ? null : wf.ID)}
                    style={{ padding: '6px 14px', background: '#6366f120', border: '1px solid #6366f140', borderRadius: 7, color: '#818cf8', fontSize: 12, cursor: 'pointer' }}>
                    {expandedWorkflow === wf.ID ? 'Collapse' : 'Edit steps'}
                  </button>
                  <button onClick={() => deleteWorkflow(wf.ID)}
                    style={{ padding: '6px 14px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 7, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>

              {expandedWorkflow === wf.ID && (
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Drag steps to reorder · Steps execute in order shown</div>
                  {(workflowSteps[wf.ID] || []).map((step, i) => (
                    <div key={step.ID} draggable
                      onDragStart={() => setDragItem(i)}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(i) }}
                      onDrop={() => {
                        const arr = [...(workflowSteps[wf.ID] || [])]
                        const [moved] = arr.splice(dragItem, 1)
                        arr.splice(dragOver, 0, moved)
                        setWorkflowSteps(prev => ({ ...prev, [wf.ID]: arr }))
                        setDragItem(null); setDragOver(null)
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#0f1117', borderRadius: 8, marginBottom: 6, cursor: 'grab', border: dragOver === i ? '1px solid #6366f1' : '1px solid #2d3148' }}>
                      <span style={{ color: '#64748b', fontSize: 16 }}>⠿</span>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#6366f120', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0' }}>{step.stepName}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Role: {step.approverRole} · SLA: {step.slaDays} days · {step.requiresAll ? 'All must approve' : 'Any one approver'}{step.isCab ? ' · CAB' : ''}</div>
                      </div>
                      <button onClick={() => deleteStep(step.ID, wf.ID)}
                        style={{ padding: '4px 10px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addStep(wf.ID)}
                    style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed #2d3148', borderRadius: 8, color: '#64748b', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                    + Add approval step
                  </button>
                </div>
              )}
            </div>
          ))}

          <button onClick={() => setShowWorkflowForm(true)}
            style={{ width: '100%', padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Create new workflow
          </button>

          {showWorkflowForm && (
            <div style={modal}>
              <div style={modalBox}>
                <h2 style={{ color: '#f1f5f9', fontSize: 17, marginBottom: 20 }}>New approval workflow</h2>
                <label style={s('Name')}><span style={{ fontSize: 11, color: '#94a3b8' }}>Name</span></label>
                <input value={workflowForm.name} onChange={e => setWorkflowForm({ ...workflowForm, name: e.target.value })} placeholder="e.g. Standard change workflow" style={input} />
                <label style={s('Description')}><span style={{ fontSize: 11, color: '#94a3b8' }}>Description</span></label>
                <input value={workflowForm.description} onChange={e => setWorkflowForm({ ...workflowForm, description: e.target.value })} placeholder="When is this workflow used?" style={input} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginBottom: 20 }}>
                  <input type="checkbox" checked={workflowForm.isDefault} onChange={e => setWorkflowForm({ ...workflowForm, isDefault: e.target.checked })} />
                  Set as default workflow
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={createWorkflow} style={{ flex: 1, padding: '11px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Create workflow</button>
                  <button onClick={() => setShowWorkflowForm(false)} style={{ padding: '11px 18px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GROUPS */}
      {tab === 'groups' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8' }}>
            Approval groups are collections of people who approve changes. Create any group your company needs — CAB, Team Leads, Finance Approvers, IT Security. One person can be in multiple groups.
          </div>

          {groups.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ color: '#64748b', marginBottom: 16 }}>No groups yet. Create your first approval group.</div>
            </div>
          ) : groups.map(g => (
            <div key={g.ID} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{g.description}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {g.requiresDependencyCheck ? <Badge label="Dep. check" color="purple" /> : null}
                    {g.requiresOverwriteCheck ? <Badge label="Overwrite check" color="purple" /> : null}
                    {g.requiresTestCompletion ? <Badge label="Tests required" color="green" /> : null}
                    {g.requiresCAB ? <Badge label="CAB required" color="red" /> : null}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={async () => { if (!window.confirm('Delete?')) return; await fetch(`${API}/TransportGroups(${g.ID})`, { method: 'DELETE' }); loadGroups() }}
                    style={{ padding: '6px 14px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 7, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button onClick={() => setShowGroupForm(true)}
            style={{ width: '100%', padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Create new group
          </button>

          {showGroupForm && (
            <div style={modal}>
              <div style={modalBox}>
                <h2 style={{ color: '#f1f5f9', fontSize: 17, marginBottom: 20 }}>New approval group</h2>
                <label><span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Group name</span></label>
                <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="e.g. Change Advisory Board" style={input} />
                <label><span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Description</span></label>
                <input value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="When does this group approve?" style={input} />
                <label><span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Member emails (comma separated)</span></label>
                <input value={groupForm.members} onChange={e => setGroupForm({ ...groupForm, members: e.target.value })} placeholder="user1@company.com, user2@company.com" style={input} />
                <label><span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Quorum</span></label>
                <select value={groupForm.quorum} onChange={e => setGroupForm({ ...groupForm, quorum: e.target.value })} style={{ ...select, width: '100%', marginBottom: 20 }}>
                  <option value="any">Any one member can approve</option>
                  <option value="all">All members must approve</option>
                  <option value="majority">Majority must approve</option>
                </select>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={createGroup} style={{ flex: 1, padding: '11px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Create group</button>
                  <button onClick={() => setShowGroupForm(false)} style={{ padding: '11px 18px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ROUTING RULES MATRIX */}
      {tab === 'matrix' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8' }}>
            Routing rules automatically assign the right workflow to every change request. Rules are evaluated top to bottom — first match wins. No coding needed.
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 14 }}>Workflow routing rules</div>
            {rules.map((rule, i) => (
              <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '10px 12px', background: '#0f1117', borderRadius: 8, border: '1px solid #2d3148', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#64748b', minWidth: 18, fontWeight: 500 }}>{i + 1}</span>
                <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 500 }}>IF</span>
                <select value={rule.field} onChange={e => updateRule(rule.id, 'field', e.target.value)} style={select}>
                  <option value="riskLevel">Risk level</option>
                  <option value="category">Category</option>
                  <option value="type">Type</option>
                  <option value="priority">Priority</option>
                  <option value="affectedModules">Module</option>
                </select>
                <select value={rule.operator} onChange={e => updateRule(rule.id, 'operator', e.target.value)} style={{ ...select, flex: 'none', width: 80 }}>
                  <option value="is">is</option>
                  <option value="is not">is not</option>
                  <option value="contains">contains</option>
                </select>
                <input value={rule.value} onChange={e => updateRule(rule.id, 'value', e.target.value)}
                  style={{ ...select, flex: 1, padding: '8px 10px' }} placeholder="Value..." />
                <span style={{ fontSize: 11, padding: '4px 10px', background: '#2d3148', borderRadius: 6, color: '#94a3b8', whiteSpace: 'nowrap' }}>→ THEN</span>
                <input value={rule.workflow} onChange={e => updateRule(rule.id, 'workflow', e.target.value)}
                  style={{ ...select, flex: 1, padding: '8px 10px' }} placeholder="Workflow name..." />
                <button onClick={() => deleteRule(rule.id)}
                  style={{ padding: '6px 10px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Remove
                </button>
              </div>
            ))}

            {/* Default rule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#0f1117', borderRadius: 8, border: '1px dashed #2d3148', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>✦ Default (no rule matched)</span>
              <span style={{ fontSize: 11, padding: '4px 10px', background: '#2d3148', borderRadius: 6, color: '#94a3b8', marginLeft: 'auto' }}>→ THEN</span>
              <select style={select}>
                <option>Standard workflow</option>
                <option>Critical / CAB workflow</option>
              </select>
            </div>

            <button onClick={addRule}
              style={{ width: '100%', padding: '9px', background: 'transparent', border: '1px dashed #2d3148', borderRadius: 8, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
              + Add routing rule
            </button>
          </div>

          <button style={{ width: '100%', padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Save routing rules
          </button>
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8' }}>
            Add your team and assign roles. Roles control access. One person can have multiple roles and be in multiple groups.
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Team members ({users.length})</div>
              <button onClick={() => setShowUserForm(true)}
                style={{ padding: '7px 14px', background: '#6366f1', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                + Add user
              </button>
            </div>

            {users.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No users yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f1117' }}>
                    {['Name', 'Email', 'Role', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.ID} style={{ borderTop: '1px solid #2d3148' }}>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: '#e2e8f0' }}>{u.name}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{u.email}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge label={u.role} color={u.role === 'Admin' ? 'red' : u.role === 'Approver' ? 'amber' : u.role === 'CAB' ? 'purple' : 'gray'} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge label={u.isActive ? 'Active' : 'Inactive'} color={u.isActive ? 'green' : 'gray'} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={async () => { if (!window.confirm('Delete?')) return; await fetch(`${API}/Users(${u.ID})`, { method: 'DELETE' }); loadUsers() }}
                          style={{ padding: '4px 10px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Role permissions table */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 14 }}>Role permissions</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#0f1117' }}>
                  {['Permission', 'Developer', 'Approver', 'CAB', 'Admin'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Permission' ? 'left' : 'center', fontSize: 11, color: '#64748b', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { perm: 'Create change requests', dev: true, app: true, cab: true, admin: true },
                  { perm: 'View all changes', dev: true, app: true, cab: true, admin: true },
                  { perm: 'Approve changes', dev: false, app: true, cab: true, admin: true },
                  { perm: 'Reject changes', dev: false, app: true, cab: true, admin: true },
                  { perm: 'Trigger imports', dev: false, app: false, cab: true, admin: true },
                  { perm: 'Configure workflows', dev: false, app: false, cab: false, admin: true },
                  { perm: 'Manage users', dev: false, app: false, cab: false, admin: true },
                  { perm: 'View SOX reports', dev: false, app: true, cab: true, admin: true },
                ].map(row => (
                  <tr key={row.perm} style={{ borderTop: '1px solid #2d3148' }}>
                    <td style={{ padding: '9px 12px', color: '#e2e8f0' }}>{row.perm}</td>
                    {[row.dev, row.app, row.cab, row.admin].map((v, i) => (
                      <td key={i} style={{ padding: '9px 12px', textAlign: 'center', color: v ? '#22c55e' : '#ef4444', fontSize: 14 }}>{v ? '✓' : '✗'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showUserForm && (
            <div style={modal}>
              <div style={modalBox}>
                <h2 style={{ color: '#f1f5f9', fontSize: 17, marginBottom: 20 }}>Add team member</h2>
                <label><span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Full name</span></label>
                <input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} placeholder="Full name" style={input} />
                <label><span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Email</span></label>
                <input value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="user@company.com" style={input} />
                <label><span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Role</span></label>
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} style={{ ...select, width: '100%', marginBottom: 20 }}>
                  <option>Developer</option>
                  <option>Approver</option>
                  <option>CAB</option>
                  <option>Admin</option>
                </select>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={createUser} style={{ flex: 1, padding: '11px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add user</button>
                  <button onClick={() => setShowUserForm(false)} style={{ padding: '11px 18px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SETTINGS */}
      {tab === 'settings' && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Approval & compliance policy</div>
            {[
              { key: 'enforceSoD', label: 'Enforce segregation of duties', desc: 'Block imports if requester is also the approver — required for SOX' },
              { key: 'requireTests', label: 'Require test sign-off before import', desc: 'All test cases must be marked Pass before any import is allowed' },
              { key: 'enforceFreezeWindows', label: 'Enforce freeze windows', desc: 'Block imports during month-end, year-end, and go-live periods' },
              { key: 'allowEmergencyBypass', label: 'Allow emergency bypass', desc: 'Emergency changes can bypass freeze windows with CAB approval' },
              { key: 'aiAutoScore', label: 'AI auto-score all change requests', desc: 'GPT-4o automatically scores risk on every CR creation' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #2d3148' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                </div>
                <Toggle value={settings[item.key]} onChange={v => setSettings({ ...settings, [item.key]: v })} />
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 14 }}>Default SLA by risk level</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              {[
                { key: 'slaLow', label: 'LOW (days)' },
                { key: 'slaMedium', label: 'MEDIUM (days)' },
                { key: 'slaHigh', label: 'HIGH (days)' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input type="number" value={settings[f.key]} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}
                    style={{ width: '100%', padding: '9px 11px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }} />
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 14 }}>Email notifications</div>
            {[
              { key: 'emailOnApproval', label: 'New approval request', desc: 'Notify approver when a CR needs their review' },
              { key: 'emailOnSLA', label: 'SLA breach warning', desc: 'Alert when an approval is overdue' },
              { key: 'emailOnImportFail', label: 'Import failure', desc: 'Alert when a transport import fails' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #2d3148' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#e2e8f0' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                </div>
                <Toggle value={settings[item.key]} onChange={v => setSettings({ ...settings, [item.key]: v })} />
              </div>
            ))}
          </div>

          <button style={{ width: '100%', padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Save all settings
          </button>
        </div>
      )}
    </div>
  )
}