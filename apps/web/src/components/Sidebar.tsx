
import {
  BarChart3,
  CheckSquare,
  Home,
  Repeat,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: Home,
  },
  {
    to: '/goals',
    label: 'Goals',
    icon: Target,
  },
  {
    to: '/tasks',
    label: 'Tasks',
    icon: CheckSquare,
  },
  {
    to: '/habits',
    label: 'Habits',
    icon: Repeat,
  },
  {
    to: '/recovery',
    label: 'Recovery Mode',
    icon: ShieldCheck,
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
]

function Sidebar() {
  return (
    <aside className="min-h-screen w-64 border-r border-slate-200 bg-white p-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-900">
          ConsistencyOS
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Turn goals into consistent execution.
        </p>
      </div>

      <nav>
        <ul className="space-y-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    isActive
                      ? 'bg-slate-100 font-medium text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
