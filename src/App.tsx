import { lazy, Suspense } from 'react'
import { BrowserRouter, HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppDataProvider } from './context/AppDataContext'
import { ToastProvider } from './context/ToastContext'
import { AppShell, RequireAuth } from './components/Layout'
import { BrandMark } from './components/Common'

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const InventoryPage = lazy(() => import('./pages/InventoryPage').then((module) => ({ default: module.InventoryPage })))
const QuickAddPage = lazy(() => import('./pages/QuickAddPage').then((module) => ({ default: module.QuickAddPage })))
const ItemDetailsPage = lazy(() => import('./pages/ItemDetailsPage').then((module) => ({ default: module.ItemDetailsPage })))
const RecipesPage = lazy(() => import('./pages/RecipesPage').then((module) => ({ default: module.RecipesPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
function NotFoundPage() {
  const { user } = useAuth()
  return <div className="grid min-h-screen place-items-center bg-[#f7f8f3] px-5"><div className="text-center"><Link to="/"><BrandMark /></Link><p className="eyebrow mt-8">404 · A little detour</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-.05em] text-[#2c4235]">This page isn't on the menu.</h1><p className="mt-2 text-sm text-[#87938a]">Let's get you back to something useful.</p><Link to={user ? '/app/dashboard' : '/'} className="btn-primary mt-5">{user ? 'Back to my kitchen' : 'Back to home'}</Link></div></div>
}

function ProtectedApp() {
  return <RequireAuth><AppDataProvider><AppShell /></AppDataProvider></RequireAuth>
}

function PageLoading() {
  return <div className="grid min-h-screen place-items-center bg-[#f7f8f3]"><div className="flex items-center gap-3 rounded-2xl border border-[#e6ece4] bg-white px-5 py-4 shadow-sm"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#6f9b72]" /><span className="text-sm font-semibold text-[#617067]">Setting the table…</span></div></div>
}

export default function App() {
  const Router = import.meta.env.VITE_PREVIEW_BUILD === 'true' ? HashRouter : BrowserRouter
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Suspense fallback={<PageLoading />}>
            <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/app" element={<ProtectedApp />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="add" element={<QuickAddPage />} />
              <Route path="items/:id" element={<ItemDetailsPage />} />
              <Route path="recipes" element={<RecipesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  )
}
