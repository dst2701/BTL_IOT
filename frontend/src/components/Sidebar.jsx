import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Home', to: '/dashboard' },
  { label: 'Sensor Data', to: '/sensor-data' },
  { label: 'Device History', to: '/device-history' },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <h2>DASHBOARD</h2>
        <span className="sidebar-icon">[]</span>
      </div>

      <div className="sidebar-search">
        <span>Q</span>
        <input type="text" placeholder="Search" />
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
            <span className="nav-dot" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
