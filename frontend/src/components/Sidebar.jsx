import { NavLink } from 'react-router-dom'
import { FiActivity, FiCpu, FiGrid, FiHome } from 'react-icons/fi'

const navItems = [
  { label: 'Home', to: '/dashboard', icon: FiHome },
  { label: 'Sensor Data', to: '/sensor-data', icon: FiActivity },
  { label: 'Device History', to: '/device-history', icon: FiCpu },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <h2>DASHBOARD</h2>
        <FiGrid className="sidebar-icon" aria-hidden="true" />
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'nav-item nav-item-active' : 'nav-item'
            }
          >
            <item.icon className="nav-icon" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
