import { Navigate, Route, Routes } from 'react-router-dom'
import { Link } from 'react-router-dom'
import './App.css'
import Sidebar from './components/Sidebar'
import { ToastProvider } from './context/ToastContext'
import ActionHistory from './pages/ActionHistory'
import Dashboard from './pages/Dashboard'
import DataSensor from './pages/DataSensor'
import Profile from './pages/Profile'

function App() {
  return (
    <ToastProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="app-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sensor-data" element={<DataSensor />} />
            <Route path="/device-history" element={<ActionHistory />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Nút profile nổi cố định — hiện trên mọi trang */}
      <Link to="/profile" className="profile-fab" title="View Profile">
        👤
      </Link>
    </ToastProvider>
  )
}

export default App
