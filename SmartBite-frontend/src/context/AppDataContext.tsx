import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { api } from '../services/api'
import type { AppNotification, DashboardStats, FoodItem, NewFoodItem, WasteAction } from '../types'

interface AppDataContextValue {
  items: FoodItem[]
  notifications: AppNotification[]
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addItems: (items: NewFoodItem[]) => Promise<FoodItem[]>
  updateItem: (id: string, changes: Partial<NewFoodItem>) => Promise<FoodItem>
  deleteItem: (id: string) => Promise<void>
  performAction: (id: string, action: WasteAction) => Promise<void>
  markRead: (id: string) => Promise<void>
  removeNotification: (id: string) => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined)
const emptyStats: DashboardStats = {
  totalItems: 0,
  freshItems: 0,
  expiringSoon: 0,
  expired: 0,
  itemsConsumed: 0,
  itemsExpired: 0,
  itemsDonated: 0,
  itemsComposted: 0,
  monthlyWasteTrend: [],
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<FoodItem[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([])
      setNotifications([])
      setStats(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const results = await Promise.allSettled([
      api.getItems(),
      api.getNotifications(),
      api.getDashboardStats(),
    ])
    const [itemsResult, notificationsResult, statsResult] = results
    let failure: string | null = null
    if (itemsResult.status === 'fulfilled') setItems(itemsResult.value)
    else failure = itemsResult.reason instanceof Error ? itemsResult.reason.message : 'Could not load your pantry.'
    if (notificationsResult.status === 'fulfilled') setNotifications(notificationsResult.value)
    else failure ??= notificationsResult.reason instanceof Error ? notificationsResult.reason.message : 'Could not load notifications.'
    if (statsResult.status === 'fulfilled') setStats(statsResult.value)
    else {
      failure ??= statsResult.reason instanceof Error ? statsResult.reason.message : 'Could not load your kitchen stats.'
      setStats(emptyStats)
    }
    setError(failure)
    setLoading(false)
  }, [user])

  useEffect(() => { void refresh() }, [refresh])

  const addItems = useCallback(async (drafts: NewFoodItem[]) => {
    const created = await Promise.all(drafts.map((draft) => api.createItem(draft)))
    await refresh()
    return created
  }, [refresh])

  const updateItem = useCallback(async (id: string, changes: Partial<NewFoodItem>) => {
    const updated = await api.updateItem(id, changes)
    await refresh()
    return updated
  }, [refresh])

  const deleteItem = useCallback(async (id: string) => {
    await api.deleteItem(id)
    await refresh()
  }, [refresh])

  const performAction = useCallback(async (id: string, action: WasteAction) => {
    await api.applyItemAction(id, action)
    await refresh()
  }, [refresh])

  const markRead = useCallback(async (id: string) => {
    await api.markNotificationRead(id)
    setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read: true } : notification))
  }, [])

  const removeNotification = useCallback(async (id: string) => {
    await api.deleteNotification(id)
    setNotifications((current) => current.filter((notification) => notification.id !== id))
  }, [])

  const value = useMemo(() => ({
    items, notifications, stats, loading, error, refresh, addItems, updateItem, deleteItem, performAction, markRead, removeNotification,
  }), [items, notifications, stats, loading, error, refresh, addItems, updateItem, deleteItem, performAction, markRead, removeNotification])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used inside AppDataProvider')
  return context
}
