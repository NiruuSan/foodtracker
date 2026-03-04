import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  UtensilsCrossed,
  Dumbbell,
  Trophy,
  UserCircle,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/meals', icon: UtensilsCrossed, label: 'Meals' },
  { to: '/exercise', icon: Dumbbell, label: 'Exercise' },
  { to: '/leaderboard', icon: Trophy, label: 'Board' },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <main className="max-w-lg mx-auto px-4 pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || 
              (to !== '/' && location.pathname.startsWith(to))
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                  active
                    ? 'text-primary-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            )
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  )
}
