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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #2d3148', marginBottom: 24 }}>
        {[
          { id: 'workflows', label: 'Approval workflows' },
          { id: 'groups', label: 'Approval groups' },
          { id: 'matrix', label: 'Routing rules' },
          { id: 'users', label: 'Users & roles' },
          { id: 'settings', label: 'System settings' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 16px', background: 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent', color: tab === t.id ? '#818cf8' : '#64748b', fontSize: 13, fontWeight: tab === t.id ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* WORKFLOWS */}
      {tab === 'workflows' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8', lineHeight: 1.6 }}>
            Build your company's approval workflows. Each workflow is a sequence of steps that approvers must complete in order. Assign each step a role, approver email, and SLA. Link workflows to change types via Routing Rules.
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
                          {step.approverEmail && <> · Email: <span style={{ color: '#94a3b8' }}>{step.approverEmail}</span></>}
                          · SLA: <span style={{ color: '#94a3b8' }}>{step.slaDays} days</span>
                          · <span style={{ color: '#94a3b8' }}>{step.requiresAll ? 'All must approve' : 'Any one approver'}</span>
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

      {/* GROUPS */}
      {tab === 'groups' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8', lineHeight: 1.6 }}>
            Approval groups are collections of people who approve changes. Create any group your company needs — CAB, Team Leads, Finance Approvers, IT Security. One person can be in multiple groups.
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
                    {g.requiresDependencyCheck ? <Badge label="Dep. check required" color="purple" /> : null}
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

      {/* ROUTING RULES */}
      {tab === 'matrix' && (
        <div>
          <div style={{ background: '#6366f110', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#818cf8', lineHeight: 1.6 }}>
            Routing rules automatically assign the right workflow to every change request when it is submitted. Rules are evaluated top to bottom — first match wins. No coding needed.
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
                  <option value="type