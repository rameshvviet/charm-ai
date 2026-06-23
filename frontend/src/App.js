import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ChangeRequests from './pages/ChangeRequests'
import Landscapes from './pages/Landscapes'
import Transports from './pages/Transports'
import Approvals from './pages/Approvals'
import './App.css'

const API = process.env.REACT_APP_API_URL || 'http://localhost:4004/api'
export { API }

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif', background: '#0f1117', color: '#e2e8f0' }}>

        {/* Sidebar */}
        <div style={{ width: sidebarOpen ? 240 : 60, background: '#1a1d27', borderRight: '1px solid #2d3148', transition: 'width .2s', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

          {/* Logo */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #2d3148', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>C</div>
            {sidebarOpen && <div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>ChARM AI</div><div style={{ fontSize: 10, color: '#6366f1' }}>Change Management</div></div>}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 8px' }}>
            {[
              { to: '/', icon: '⬡', label: 'Dashboard' },
              { to: '/changes', icon: '📋', label: 'Changes' },
              { to: '/approvals', icon: '✅', label: 'Approvals' },
              { to: '/transports', icon: '🚚', label: 'Transports' },
              { to: '/landscapes', icon: '🌐', label: 'Landscapes' },
            ].map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                  textDecoration: 'none', fontSize: 13,
                  background: isActive ? '#6366f120' : 'transparent',
                  color: isActive ? '#818cf8' : '#94a3b8',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all .15s'
                })}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && item.label}
              </NavLink>
            ))}
          </nav>

          {/* Toggle */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ margin: 12, padding: 8, background: '#2d3148', border: 'none', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
            {sidebarOpen ? '◀ Collapse' : '▶'}
          </button>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/changes" element={<ChangeRequests />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/transports" element={<Transports />} />
            <Route path="/landscapes" element={<Landscapes />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}