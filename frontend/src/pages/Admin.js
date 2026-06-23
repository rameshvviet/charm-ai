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

const inp = { width: '100%', padding: '9px 11px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13, marginBottom: 10 }
const sel = { width: '100%', padding: '9px 11px', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', fontSize: 13, marginBottom: 10 }
const card = { background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, padding: 18, marginBottom: 12 }
const modal = { position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalBox = { background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 16, padding: 28, width: 500, maxHeight: '90vh', overflowY: 'auto' }
const lbl = { fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 5 }

export default function Admin() {
  const [tab, setTab] = useState('workflows')
  const [workflows, setWorkflows] = useState([])
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [expandedWorkflow, setExpandedWorkflow] = useState(null)
  const [workflowSteps, setWorkflowSteps] = useState({})

  const [showWorkflowForm, setShowWorkflowForm] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [showStepForm, setShowStepForm] = useState(false)
  const [activeWorkflowId, setActiveWorkflowId] = useState(null)

  const [workflowForm, setWorkflowForm] = useState({ name: '', description: '', isDefault: 0 })
  const [groupForm, setGroupForm] = useState({ name: '', description: '', quorum: 'any', requiresDependencyCheck: 1, requiresOverwriteCheck: 1, requiresTestCompletion: 1, requiresCAB: 0 })
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'Developer' })
  const [stepForm, setStepForm] = useState({ stepName: '', approverRole: 'Team Lead', approverEmail: '', slaDays: 2, requiresAll: 0, isCab: 0 })

  const [rules, setRules] = useState([
    { id: 1, field: 'riskLevel', operator: 'is', value: 'CRITICAL', workflow: 'Critical / CAB Workflow' },
    { id: 2, field: 'riskLevel', operator: 'is', value: 'HIGH', workflow: 'Standard Change Workflow' },
    { id: 3, field: 'type', operator: 'is', value: 'Hotfix', workflow: 'Critical / CAB Workflow' },
  ])

  const [settings, setSettings] = useState({
    enforceSoD: true, requireTests: true, enforceFreezeWindows: true,
    allowEmergencyBypass: true, aiAutoScore: true,
    slaLow: 5, slaMedium: 3, slaHigh: 1,
    emailOnApproval: true, emailOnSLA: true, emailOnImportFail: true
  })

  useEffect(() => { loadWorkflows(); loadGroups(); loadUsers() }, [])

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
    } catch (e) { console.error(e) }
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
    if (!workflowForm.name) return alert('Please enter a workflow name')
    await fetch(`${API}/ApprovalWorkflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workflowForm.name, description: workflowForm.description, isActive: 1, isDefault: workflowForm.isDefault ? 1 : 0 })
    })
    setShowWorkflowForm(false)
    setWorkflowForm({ name: '', description: '', isDefault: 0 })
    loadWorkflows()
  }

  const deleteWorkflow = async (id) => {
    if (!window.confirm('Delete this workflow and all its steps?')) return
    const steps = workflowSteps[id] || []
    for (const s of steps) await fetch(`${API}/ApprovalWorkflowSteps(${s.ID})`, { method: 'DELETE' })
    await fetch(`${API}/ApprovalWorkflows(${id})`, { method: 'DELETE' })
    loadWorkflows()
  }

  const openAddStep = (workflowId) => {
    setActiveWorkflowId(workflowId)
    setStepForm({ stepName: '', approverRole: 'Team Lead', approverEmail: '', slaDays: 2, requiresAll: 0, isCab: 0 })
    setShowStepForm(true)
  }

  const createStep = async () => {
    if (!stepForm.stepName) return alert('Please enter a step name')
    const steps = workflowSteps[activeWorkflowId] || []
    await fetch(`${API}/ApprovalWorkflowSteps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_ID: activeWorkflowId,
        stepName: stepForm.stepName,
        approverRole: stepForm.approverRole,
        approverEmail: stepForm.approverEmail,
        slaDays: parseInt(stepForm.slaDays),
        requiresAll: stepForm.requiresAll ? 1 : 0,
        isCab: stepForm.isCab ? 1 : 0,
        stepOrder: steps.length + 1
      })
    })
    setShowStepForm(false)
    loadWorkflows()
  }

  const deleteStep = async (stepId) => {
    await fetch(`${API}/ApprovalWorkflowSteps(${stepId})`, { method: 'DELETE' })
    loadWorkflows()
  }

  const createGroup = async () => {
    if (!groupForm.name) return alert('Please enter a group name')
    await fetch(`${API}/TransportGroups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...groupForm, isActive: 1 })
    })
    setShowGroupForm(false)
    setGroupForm({ name: '', description: '', quorum: 'any', requiresDependencyCheck: 1, requiresOverwriteCheck: 1, requiresTestCompletion: 1, requiresCAB: 0 })
    loadGroups()
  }

  const createUser = async () => {
    if (!userForm.email) return alert('Please enter an email')
    await fetch(`${API}/Users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userForm, isActive: 1, notifyEmail: 1 })
    })
    setShowUserForm(false)
    setUserForm({ name: '', email: '', role: 'Developer' })
    loadUsers()
  }

  const addRule = () => setRules([...rules, { id: Date.now(), field: 'riskLevel', operator: 'is', value: 'HIGH', workflow: 'Standard Change Workflow' }])
  const updateRule = (id, k, v) => setRules(rules.map(r => r.id === id ? { ...r, [k]: v } : r))
  const deleteRule = (id) => setRules(rules.filter(r => r.id !== id))

  const roleColors = { Developer: 'gray', Approver: 'amber', CAB: 'purple', Admin: 'red' }

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Admin Console</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Configure workflows, approval groups, routing rules, users and system settings</p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #2d3148', marginBottom: 24 }}>
        {[
          { id: 'workflows', label: 'Approval workflows' },
          { id: 'groups', label: 'Approval groups' },
          { id: 'matrix', label: 'Routing rules' },
          { id: 'users', label: 'Users and roles' },
          { id: 'settings', label: 'System settings' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 16px', background: 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent', color: tab === t.id ? '#818cf8' : '#64748b', fontSize: 13, fontWeight: tab === t.id ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'workflows' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8', lineHeight: 1.6 }}>
            Build your company approval workflows. Each workflow is a sequence of steps approvers must complete in order. Add steps with role, email and SLA. Link workflows to change types via Routing Rules.
          </div>

          {workflows.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
              <div style={{ color: '#64748b', fontSize: 14, marginBottom: 6 }}>No workflows yet</div>
              <div style={{ color: '#475569', fontSize: 12 }}>Create your first approval workflow below</div>
            </div>
          ) : workflows.map(wf => (
            <div key={wf.ID} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expandedWorkflow === wf.ID ? 16 : 0 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>{wf.name}</div>
                  {wf.description && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{wf.description}</div>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Badge label="Active" color="green" />
                    {wf.isDefault ? <Badge label="Default" color="purple" /> : null}
                    <Badge label={`${(workflowSteps[wf.ID] || []).length} steps`} color="gray" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setExpandedWorkflow(expandedWorkflow === wf.ID ? null : wf.ID)}
                    style={{ padding: '7px 16px', background: '#6366f120', border: '1px solid #6366f140', borderRadius: 8, color: '#818cf8', fontSize: 12, cursor: 'pointer' }}>
                    {expandedWorkflow === wf.ID ? 'Collapse' : 'Edit steps'}
                  </button>
                  <button onClick={() => deleteWorkflow(wf.ID)}
                    style={{ padding: '7px 16px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>

              {expandedWorkflow === wf.ID && (
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, paddingTop: 12, borderTop: '1px solid #2d3148' }}>
                    Approval steps — executed in order shown
                  </div>
                  {(workflowSteps[wf.ID] || []).length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: 12, background: '#0f1117', borderRadius: 8, marginBottom: 8 }}>
                      No steps yet — add your first approval step below
                    </div>
                  ) : (workflowSteps[wf.ID] || []).map((step, i) => (
                    <div key={step.ID} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#0f1117', borderRadius: 8, marginBottom: 6, border: '1px solid #2d3148' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f120', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 3 }}>{step.stepName}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Role: <span style={{ color: '#94a3b8' }}>{step.approverRole}</span>
                          {step.approverEmail && <span> · Email: <span style={{ color: '#94a3b8' }}>{step.approverEmail}</span></span>}
                          <span> · SLA: <span style={{ color: '#94a3b8' }}>{step.slaDays} days</span></span>
                          <span> · <span style={{ color: '#94a3b8' }}>{step.requiresAll ? 'All must approve' : 'Any one approver'}</span></span>
                          {step.isCab ? <span style={{ color: '#818cf8' }}> · CAB</span> : null}
                        </div>
                      </div>
                      <button onClick={() => deleteStep(step.ID)}
                        style={{ padding: '5px 12px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button onClick={() => openAddStep(wf.ID)}
                    style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed #2d3148', borderRadius: 8, color: '#6366f1', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                    + Add approval step
                  </button>
                </div>
              )}
            </div>
          ))}

          <button onClick={() => setShowWorkflowForm(true)}
            style={{ width: '100%', padding: '13px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Create new workflow
          </button>
        </div>
      )}

      {tab === 'groups' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8', lineHeight: 1.6 }}>
            Approval groups are collections of people who approve changes. Create any group your company needs. One person can be in multiple groups.
          </div>
          {groups.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ color: '#64748b', fontSize: 14 }}>No groups yet. Create your first approval group.</div>
            </div>
          ) : groups.map(g => (
            <div key={g.ID} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{g.description}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {g.requiresDependencyCheck ? <Badge label="Dep check required" color="purple" /> : null}
                    {g.requiresOverwriteCheck ? <Badge label="Overwrite check" color="purple" /> : null}
                    {g.requiresTestCompletion ? <Badge label="Tests required" color="green" /> : null}
                    {g.requiresCAB ? <Badge label="CAB required" color="red" /> : null}
                  </div>
                </div>
                <button onClick={async () => { if (!window.confirm('Delete group?')) return; await fetch(`${API}/TransportGroups(${g.ID})`, { method: 'DELETE' }); loadGroups() }}
                  style={{ padding: '6px 14px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 7, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => setShowGroupForm(true)}
            style={{ width: '100%', padding: '13px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Create new group
          </button>
        </div>
      )}

      {tab === 'matrix' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8', lineHeight: 1.6 }}>
            Routing rules automatically assign the right workflow to every change request when submitted. Rules evaluated top to bottom — first match wins. No coding needed.
          </div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Workflow routing rules</div>
            {rules.map((rule, i) => (
              <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '10px 12px', background: '#0f1117', borderRadius: 8, border: '1px solid #2d3148', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#64748b', minWidth: 20, fontWeight: 500 }}>{i + 1}</span>
                <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600 }}>IF</span>
                <select value={rule.field} onChange={e => updateRule(rule.id, 'field', e.target.value)}
                  style={{ flex: 1, padding: '7px 10px', background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 6, color: '#e2e8f0', fontSize: 12 }}>
                  <option value="riskLevel">Risk level</option>
                  <option value="category">Category</option>
                  <option value="type">Type</option>
                  <option value="priority">Priority</option>
                  <option value="affectedModules">Module</option>
                </select>
                <select value={rule.operator} onChange={e => updateRule(rule.id, 'operator', e.target.value)}
                  style={{ width: 90, padding: '7px 10px', background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 6, color: '#e2e8f0', fontSize: 12 }}>
                  <option value="is">is</option>
                  <option value="is not">is not</option>
                  <option value="contains">contains</option>
                </select>
                <input value={rule.value} onChange={e => updateRule(rule.id, 'value', e.target.value)}
                  placeholder="e.g. CRITICAL, Finance, Hotfix"
                  style={{ flex: 1, padding: '7px 10px', background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 6, color: '#e2e8f0', fontSize: 12 }} />
                <span style={{ fontSize: 11, padding: '5px 10px', background: '#2d3148', borderRadius: 6, color: '#94a3b8', whiteSpace: 'nowrap' }}>USE</span>
                <input value={rule.workflow} onChange={e => updateRule(rule.id, 'workflow', e.target.value)}
                  placeholder="Workflow name"
                  style={{ flex: 1, padding: '7px 10px', background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 6, color: '#e2e8f0', fontSize: 12 }} />
                <button onClick={() => deleteRule(rule.id)}
                  style={{ padding: '6px 12px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                  Remove
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#0f1117', borderRadius: 8, border: '1px dashed #2d3148', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Default — no rule matched</span>
              <span style={{ fontSize: 11, padding: '5px 10px', background: '#2d3148', borderRadius: 6, color: '#94a3b8', marginLeft: 'auto' }}>USE</span>
              <select style={{ flex: 1, padding: '7px 10px', background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 6, color: '#e2e8f0', fontSize: 12 }}>
                {workflows.map(w => <option key={w.ID}>{w.name}</option>)}
                {workflows.length === 0 && <option>Standard Change Workflow</option>}
              </select>
            </div>
            <button onClick={addRule}
              style={{ width: '100%', padding: '9px', background: 'transparent', border: '1px dashed #2d3148', borderRadius: 8, color: '#64748b', fontSize: 12, cursor: 'pointer', marginBottom: 12 }}>
              + Add routing rule
            </button>
            <button style={{ width: '100%', padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Save routing rules
            </button>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8', lineHeight: 1.6 }}>
            Add your team members and assign roles. Developers create CRs. Approvers approve them. CAB members review critical changes. Admins configure everything.
          </div>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Team members ({users.length})</div>
              <button onClick={() => setShowUserForm(true)}
                style={{ padding: '7px 16px', background: '#6366f1', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                + Add user
              </button>
            </div>
            {users.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No users yet. Add your first team member.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f1117' }}>
                    {['Name', 'Email', 'Role', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.ID} style={{ borderTop: '1px solid #2d3148' }}>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#e2e8f0' }}>{u.name}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12, color: '#64748b' }}>{u.email}</td>
                      <td style={{ padding: '11px 12px' }}><Badge label={u.role} color={roleColors[u.role] || 'gray'} /></td>
                      <td style={{ padding: '11px 12px' }}><Badge label={u.isActive ? 'Active' : 'Inactive'} color={u.isActive ? 'green' : 'gray'} /></td>
                      <td style={{ padding: '11px 12px' }}>
                        <button onClick={async () => { if (!window.confirm('Remove user?')) return; await fetch(`${API}/Users(${u.ID})`, { method: 'DELETE' }); loadUsers() }}
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
                  { perm: 'Create change requests', d: true, a: true, c: true, ad: true },
                  { perm: 'View all changes', d: true, a: true, c: true, ad: true },
                  { perm: 'Approve and reject changes', d: false, a: true, c: true, ad: true },
                  { perm: 'Trigger imports', d: false, a: false, c: true, ad: true },
                  { perm: 'Configure workflows', d: false, a: false, c: false, ad: true },
                  { perm: 'Manage users', d: false, a: false, c: false, ad: true },
                  { perm: 'View SOX reports', d: false, a: true, c: true, ad: true },
                  { perm: 'Admin console access', d: false, a: false, c: false, ad: true },
                ].map(row => (
                  <tr key={row.perm} style={{ borderTop: '1px solid #2d3148' }}>
                    <td style={{ padding: '9px 12px', color: '#e2e8f0' }}>{row.perm}</td>
                    {[row.d, row.a, row.c, row.ad].map((v, i) => (
                      <td key={i} style={{ padding: '9px 12px', textAlign: 'center', color: v ? '#22c55e' : '#ef4444', fontSize: 15 }}>{v ? '✓' : '✗'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Approval and compliance policy</div>
            {[
              { key: 'enforceSoD', label: 'Enforce segregation of duties (SoD)', desc: 'Block imports if the requester is also the approver — required for SOX compliance' },
              { key: 'requireTests', label: 'Require test sign-off before import', desc: 'All test cases must be marked Pass before any transport import is allowed' },
              { key: 'enforceFreezeWindows', label: 'Enforce freeze windows', desc: 'Block imports during month-end, year-end, and go-live freeze periods' },
              { key: 'allowEmergencyBypass', label: 'Allow emergency bypass of freeze windows', desc: 'Emergency changes can bypass freeze windows but require CAB approval' },
              { key: 'aiAutoScore', label: 'AI auto-score all change requests', desc: 'GPT-4o automatically scores risk level on every CR creation' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #2d3148' }}>
                <div style={{ flex: 1, marginRight: 20 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{item.desc}</div>
                </div>
                <Toggle value={settings[item.key]} onChange={v => setSettings({ ...settings, [item.key]: v })} />
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 14 }}>Default SLA by risk level</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { key: 'slaLow', label: 'LOW risk (days)' },
                { key: 'slaMedium', label: 'MEDIUM risk (days)' },
                { key: 'slaHigh', label: 'HIGH risk (days)' },
              ].map(f => (
                <div key={f.key}>
                  <label style={lbl}>{f.label}</label>
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
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #2d3148' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#e2e8f0' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                </div>
                <Toggle value={settings[item.key]} onChange={v => setSettings({ ...settings, [item.key]: v })} />
              </div>
            ))}
          </div>

          <button style={{ width: '100%', padding: '13px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Save all settings
          </button>
        </div>
      )}

      {showWorkflowForm && (
        <div style={modal}>
          <div style={modalBox}>
            <h2 style={{ color: '#f1f5f9', fontSize: 17, marginBottom: 20 }}>Create approval workflow</h2>
            <label style={lbl}>Workflow name</label>
            <input value={workflowForm.name} onChange={e => setWorkflowForm({ ...workflowForm, name: e.target.value })}
              placeholder="e.g. Standard Change Workflow" style={inp} />
            <label style={lbl}>Description</label>
            <input value={workflowForm.description} onChange={e => setWorkflowForm({ ...workflowForm, description: e.target.value })}
              placeholder="When is this workflow used?" style={inp} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" checked={!!workflowForm.isDefault} onChange={e => setWorkflowForm({ ...workflowForm, isDefault: e.target.checked ? 1 : 0 })} />
              Set as default workflow
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={createWorkflow} style={{ flex: 1, padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Create workflow</button>
              <button onClick={() => setShowWorkflowForm(false)} style={{ padding: '12px 18px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showStepForm && (
        <div style={modal}>
          <div style={modalBox}>
            <h2 style={{ color: '#f1f5f9', fontSize: 17, marginBottom: 20 }}>Add approval step</h2>
            <label style={lbl}>Step name</label>
            <input value={stepForm.stepName} onChange={e => setStepForm({ ...stepForm, stepName: e.target.value })}
              placeholder="e.g. Team Lead Review, CAB Approval, Business Sign-off" style={inp} />
            <label style={lbl}>Approver role</label>
            <select value={stepForm.approverRole} onChange={e => setStepForm({ ...stepForm, approverRole: e.target.value })} style={sel}>
              <option>Team Lead</option>
              <option>Business Owner</option>
              <option>IT Security</option>
              <option>CAB Member</option>
              <option>Finance Approver</option>
              <option>Custom</option>
            </select>
            <label style={lbl}>Approver email (optional)</label>
            <input value={stepForm.approverEmail} onChange={e => setStepForm({ ...stepForm, approverEmail: e.target.value })}
              placeholder="approver@company.com" style={inp} />
            <label style={lbl}>SLA days to approve</label>
            <input type="number" value={stepForm.slaDays} onChange={e => setStepForm({ ...stepForm, slaDays: e.target.value })}
              style={inp} min="1" max="30" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={!!stepForm.requiresAll} onChange={e => setStepForm({ ...stepForm, requiresAll: e.target.checked ? 1 : 0 })} />
              All approvers in this role must approve
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" checked={!!stepForm.isCab} onChange={e => setStepForm({ ...stepForm, isCab: e.target.checked ? 1 : 0 })} />
              This is a CAB step
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={createStep} style={{ flex: 1, padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add step</button>
              <button onClick={() => setShowStepForm(false)} style={{ padding: '12px 18px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showGroupForm && (
        <div style={modal}>
          <div style={modalBox}>
            <h2 style={{ color: '#f1f5f9', fontSize: 17, marginBottom: 20 }}>Create approval group</h2>
            <label style={lbl}>Group name</label>
            <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
              placeholder="e.g. Change Advisory Board, Team Leads, Finance Approvers" style={inp} />
            <label style={lbl}>Description</label>
            <input value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
              placeholder="What does this group approve?" style={inp} />
            <label style={lbl}>Quorum rule</label>
            <select value={groupForm.quorum} onChange={e => setGroupForm({ ...groupForm, quorum: e.target.value })} style={sel}>
              <option value="any">Any one member can approve</option>
              <option value="all">All members must approve</option>
              <option value="majority">Majority must approve</option>
            </select>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, fontWeight: 500 }}>Safety checks required before import:</div>
              {[
                { key: 'requiresDependencyCheck', label: 'AI dependency check must pass' },
                { key: 'requiresOverwriteCheck', label: 'AI overwrite conflict check must pass' },
                { key: 'requiresTestCompletion', label: 'All test cases must be completed' },
                { key: 'requiresCAB', label: 'CAB approval required' },
              ].map(item => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginBottom: 8 }}>
                  <input type="checkbox" checked={!!groupForm[item.key]} onChange={e => setGroupForm({ ...groupForm, [item.key]: e.target.checked ? 1 : 0 })} />
                  {item.label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={createGroup} style={{ flex: 1, padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Create group</button>
              <button onClick={() => setShowGroupForm(false)} style={{ padding: '12px 18px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showUserForm && (
        <div style={modal}>
          <div style={modalBox}>
            <h2 style={{ color: '#f1f5f9', fontSize: 17, marginBottom: 20 }}>Add team member</h2>
            <label style={lbl}>Full name</label>
            <input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })}
              placeholder="Full name" style={inp} />
            <label style={lbl}>Email</label>
            <input value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })}
              placeholder="user@company.com" style={inp} />
            <label style={lbl}>Role</label>
            <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} style={sel}>
              <option>Developer</option>
              <option>Approver</option>
              <option>CAB</option>
              <option>Admin</option>
            </select>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={createUser} style={{ flex: 1, padding: '12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add user</button>
              <button onClick={() => setShowUserForm(false)} style={{ padding: '12px 18px', background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}