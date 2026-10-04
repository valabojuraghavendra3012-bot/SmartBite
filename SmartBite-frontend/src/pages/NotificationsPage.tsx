import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, BellOff, CheckCheck, Settings2 } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { SectionHeader, EmptyState, ErrorState, LoadingState } from '../components/Common'
import { NotificationCard } from '../components/SmartComponents'
import type { AppNotification } from '../types'

export function NotificationsPage() {
  const { notifications, loading, error, refresh, markRead, removeNotification } = useAppData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const unreadCount = notifications.filter((notification) => !notification.read).length
  const visible = useMemo(() => filter === 'unread' ? notifications.filter((notification) => !notification.read) : notifications, [notifications, filter])

  const handleRead = async (notification: AppNotification) => {
    try { await markRead(notification.id); toast('Marked as read', 'success') }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Could not update this notification.', 'error') }
  }
  const handleDelete = async (notification: AppNotification) => {
    try { await removeNotification(notification.id); toast('Notification removed', 'success') }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Could not remove this notification.', 'error') }
  }
  const handleAction = (notification: AppNotification) => {
    if (notification.itemId) navigate(`/app/items/${notification.itemId}`)
    else navigate('/app/recipes')
  }
  const markAll = async () => {
    try { await Promise.all(notifications.filter((entry) => !entry.read).map((entry) => markRead(entry.id))); toast('You’re all caught up', 'success') }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Could not update notifications.', 'error') }
  }

  return (
    <div className="animate-in">
      <SectionHeader eyebrow="A gentle nudge, when it matters" title="Notifications" description="Thoughtful reminders for a kitchen that stays in the loop." action={<Link to="/app/settings" className="btn-secondary !min-h-[41px] !rounded-[11px] !px-3.5 !py-2 !text-xs"><Settings2 size={14} />Preferences</Link>} />
      {error && <div className="mb-5"><ErrorState message={error} onRetry={() => void refresh()} /></div>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-[12px] border border-[#e7ece5] bg-white p-1"><button onClick={() => setFilter('all')} className={`rounded-[9px] px-3 py-2 text-[11px] font-bold ${filter === 'all' ? 'bg-[#eaf2e8] text-[#3b6e4d]' : 'text-[#859088] hover:bg-[#f5f7f4]'}`}>All <span className="ml-1 text-[9px] opacity-65">{notifications.length}</span></button><button onClick={() => setFilter('unread')} className={`rounded-[9px] px-3 py-2 text-[11px] font-bold ${filter === 'unread' ? 'bg-[#eaf2e8] text-[#3b6e4d]' : 'text-[#859088] hover:bg-[#f5f7f4]'}`}>Unread <span className="ml-1 text-[9px] opacity-65">{unreadCount}</span></button></div>
        {unreadCount > 0 && <button onClick={() => void markAll()} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold text-[#5d7e64] hover:bg-[#edf4eb]"><CheckCheck size={14} />Mark all as read</button>}
      </div>
      {loading && notifications.length === 0 ? <LoadingState label="Checking for kitchen reminders…" /> : visible.length ? <div className="space-y-2.5">{visible.map((notification) => <NotificationCard key={notification.id} notification={notification} onRead={handleRead} onDelete={handleDelete} onAction={handleAction} />)}</div> : notifications.length ? <EmptyState icon={BellOff} illustration="bell" title="All caught up" description="There aren't any unread nudges right now. You can switch back to all reminders whenever you like." action={<button onClick={() => setFilter('all')} className="btn-secondary !text-xs"><Bell size={14} />View all reminders</button>} /> : <EmptyState icon={Bell} illustration="bell" title="No reminders just yet" description="When something in your kitchen is coming up on its date, we’ll leave a gentle note right here." action={<Link to="/app/inventory" className="btn-secondary !text-xs">View inventory</Link>} />}
      <div className="mt-5 rounded-[16px] border border-[#e8ede6] bg-[#fbfcfa] p-4 text-[10px] leading-5 text-[#8b978e]"><span className="font-bold text-[#65766a]">Tip:</span> Set your alert timing in preferences. SmartBite reminders are based on the dates you log — always check product packaging too.</div>
    </div>
  )
}
