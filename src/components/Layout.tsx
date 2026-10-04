import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight, BarChart3, Bell, ChefHat, Home, Leaf, LogOut, Package, Plus, Settings, UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { IS_DEMO_MODE } from '../services/api'
import { BrandMark } from './Common'
import { QuickAddModal } from './QuickAdd'

const QuickAddContext = createContext<(() => void) | undefined>(undefined)
export function useQuickAdd() {
  const open = useContext(QuickAddContext)
  if (!open) throw new Error('useQuickAdd must be used inside AppShell')
  return open
}

const navigation = [
  { label: 'Dashboard', to: '/app/dashboard', icon: Home },
  { label: 'Inventory', to: '/app/inventory', icon: Package },
  { label: 'Quick Add', to: '/app/add', icon: Plus },
  { label: 'Recipes', to: '/app/recipes', icon: ChefHat },
  { label: 'Notifications', to: '/app/notifications', icon: Bell },
  { label: 'Analytics', to: '/app/analytics', icon: BarChart3 },
  { label: 'Settings', to: '/app/settings', icon: Settings },
]

export function Sidebar() {
  const { user, isDemoAccount, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { notifications } = useAppData()
  const unreadCount = notifications.filter((notification) => !notification.read).length
  const active = (to: string) => location.pathname === to || (to === '/app/inventory' && location.pathname.startsWith('/app/items/'))
  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[246px] flex-col border-r border-[#e8ece6] bg-[#fcfdfb] px-4 pb-4 pt-5 lg:flex">
      <Link to="/app/dashboard" className="mb-8 flex items-center px-2.5"><BrandMark /></Link>
      <p className="eyebrow mb-2 px-3">Your kitchen</p>
      <nav className="space-y-1" aria-label="Main navigation">
        {navigation.map(({ label, to, icon: Icon }) => (
          <NavLink key={label} to={to} className={() => `sidebar-link ${active(to) ? 'active' : ''}`}>
            <Icon size={17} strokeWidth={1.9} /><span className="flex-1">{label}</span>
            {label === 'Notifications' && unreadCount > 0 && <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#dcebdd] px-1 text-[9px] font-extrabold text-[#3c754e]">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="relative overflow-hidden rounded-[17px] bg-[#eaf2e8] px-3.5 py-3.5">
          <div className="absolute -right-5 -top-6 h-20 w-20 rounded-full border-[11px] border-white/25" />
          <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/75 text-[#4c825b]"><Leaf size={16} /></span>
          <p className="relative mt-2.5 text-xs font-bold text-[#345642]">Good food deserves a plan.</p>
          <p className="relative mt-1 text-[10px] leading-4 text-[#748e78]">Every little save adds up.</p>
          <Link to="/app/analytics" className="relative mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#427552] hover:text-[#214b3b]">See your impact <ArrowUpRight size={11} /></Link>
        </div>
        <div className="my-4 h-px bg-[#edf0ec]" />
        <div className="flex items-center gap-2.5 px-2 py-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dfece0] font-display text-xs font-extrabold text-[#3d704e]">{(user?.fullName?.[0] || user?.email[0] || 'S').toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#394b40]">{user?.fullName || 'My kitchen'}</p><p className="truncate text-[10px] text-[#95a097]">{isDemoAccount ? 'Local demo space' : user?.email}</p></div>
          <button onClick={handleSignOut} aria-label="Sign out" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8b968e] hover:bg-[#f0f4ef] hover:text-[#4d6554]" title="Sign out"><LogOut size={15} /></button>
        </div>
      </div>
    </aside>
  )
}

export function MobileNavigation({ onQuickAdd }: { onQuickAdd: () => void }) {
  const location = useLocation()
  const entries = [
    { label: 'Home', to: '/app/dashboard', icon: Home },
    { label: 'Inventory', to: '/app/inventory', icon: Package },
    { label: 'Recipes', to: '/app/recipes', icon: ChefHat },
    { label: 'Profile', to: '/app/settings', icon: UserRound },
  ]
  const active = (to: string) => location.pathname === to || (to === '/app/inventory' && location.pathname.startsWith('/app/items/'))
  return (
    <nav className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-50 flex h-[72px] items-stretch border-t border-[#e6ebe4] bg-white/95 px-2 pb-1 shadow-[0_-8px_28px_rgba(33,59,43,.07)] backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
      <NavLink to={entries[0].to} className={() => `mobile-nav-item ${active(entries[0].to) ? 'active' : ''}`}><Home size={19} strokeWidth={active(entries[0].to) ? 2.2 : 1.8} /><span>Home</span></NavLink>
      <NavLink to={entries[1].to} className={() => `mobile-nav-item ${active(entries[1].to) ? 'active' : ''}`}><Package size={19} strokeWidth={active(entries[1].to) ? 2.2 : 1.8} /><span>Inventory</span></NavLink>
      <button onClick={onQuickAdd} className="mobile-nav-item !-mt-3 !text-white" aria-label="Quick add food">
        <span className="flex h-[48px] w-[48px] items-center justify-center rounded-[17px] bg-[#214b3b] shadow-[0_7px_15px_rgba(33,75,59,.26)] transition-transform active:scale-95"><Plus size={23} strokeWidth={2.2} /></span><span className="!mt-0.5 !text-[10px] !font-bold !text-[#466750]">Add</span>
      </button>
      <NavLink to={entries[2].to} className={() => `mobile-nav-item ${active(entries[2].to) ? 'active' : ''}`}><ChefHat size={19} strokeWidth={active(entries[2].to) ? 2.2 : 1.8} /><span>Recipes</span></NavLink>
      <NavLink to={entries[3].to} className={() => `mobile-nav-item ${active(entries[3].to) ? 'active' : ''}`}><UserRound size={19} strokeWidth={active(entries[3].to) ? 2.2 : 1.8} /><span>Profile</span></NavLink>
    </nav>
  )
}

export function Navbar({ onQuickAdd }: { onQuickAdd: () => void }) {
  const { user } = useAuth()
  const { notifications } = useAppData()
  const location = useLocation()
  const unread = notifications.filter((notification) => !notification.read).length
  const date = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
  const isDashboard = location.pathname === '/app' || location.pathname === '/app/dashboard'
  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#e8ece6] bg-[#f9faf6]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
      <div className="flex items-center gap-3">
        <Link to="/app/dashboard" className="lg:hidden"><BrandMark compact /></Link>
        <div className="hidden sm:block"><p className="eyebrow !text-[9px]">{isDashboard ? 'YOUR KITCHEN, IN GOOD HANDS' : 'SMARTBITE WORKSPACE'}</p><p className="mt-0.5 text-[11px] font-semibold text-[#9aa49d]">{date}</p></div>
        {IS_DEMO_MODE && <span className="hidden rounded-full border border-[#e4ebdf] bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-[#6b816d] sm:inline-flex">Browser demo</span>}
      </div>
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button onClick={onQuickAdd} className="hidden min-h-[38px] items-center gap-2 rounded-[10px] border border-[#214b3b] bg-[#214b3b] px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#173c2d] sm:inline-flex"><Plus size={14} />Quick add</button>
        <Link to="/app/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-[11px] border border-[#e6ebe4] bg-white text-[#66746b] transition hover:border-[#cddacf] hover:text-[#315f43]" aria-label="Notifications"><Bell size={17} />{unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-[#e58b72]" />}</Link>
        <Link to="/app/settings" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e0e9de] bg-[#eaf3e9] font-display text-[11px] font-extrabold text-[#477a54]" aria-label={`Profile ${user?.fullName || user?.email || ''}`}>{(user?.fullName?.[0] || user?.email[0] || 'S').toUpperCase()}</Link>
      </div>
    </header>
  )
}

export function AppShell() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const openQuickAdd = useMemo(() => () => setQuickAddOpen(true), [])
  return (
    <QuickAddContext.Provider value={openQuickAdd}>
      <div className="min-h-screen bg-[#f7f8f3]">
        <Sidebar />
        <div className="min-h-screen lg:ml-[246px]">
          <Navbar onQuickAdd={openQuickAdd} />
          <main className="app-content mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9"><Outlet /></main>
        </div>
        <MobileNavigation onQuickAdd={openQuickAdd} />
        <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      </div>
    </QuickAddContext.Provider>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f7f8f3]"><div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#6f9b72]" /><span className="text-sm font-semibold text-[#617067]">Opening your kitchen…</span></div></div>
  if (!user) return <NavigateToAuth path={location.pathname} />
  return <>{children}</>
}

function NavigateToAuth({ path }: { path: string }) {
  return <div className="min-h-screen bg-[#f7f8f3]"><div className="mx-auto flex max-w-lg flex-col items-center px-6 pt-20 text-center"><BrandMark /><h1 className="mt-7 font-display text-2xl font-extrabold tracking-[-.04em] text-[#2f4437]">Your kitchen is waiting</h1><p className="mt-2 text-sm leading-6 text-[#7f8b83]">Sign in to keep your food, reminders and little wins all in one place.</p><Link to={`/auth?next=${encodeURIComponent(path)}`} className="btn-primary mt-5">Continue to sign in <ArrowUpRight size={15} /></Link></div></div>
}
