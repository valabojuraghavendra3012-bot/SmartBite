import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock3, HeartHandshake, MapPin, Pencil, Plus, Recycle, Trash2, Utensils } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { getExpiryTimeHint, getFreshnessStatus, formatDate, formatDistanceToNow, shortQuantity, categoryLabel } from '../lib/food'
import { CategoryIcon, EmptyState, ErrorState, FoodStatusBadge, LoadingState } from '../components/Common'
import { ItemActionDialog, ItemEditDialog } from '../components/ItemDialogs'
import type { FoodItem, WasteAction } from '../types'

export function ItemDetailsPage() {
  const { id = '' } = useParams()
  const { items, loading, error, refresh, updateItem, deleteItem, performAction } = useAppData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [action, setAction] = useState<WasteAction | 'delete' | null>(null)
  const item = items.find((entry) => entry.id === id)

  const confirmAction = async (selected: FoodItem, selectedAction: WasteAction | 'delete') => {
    if (selectedAction === 'delete') {
      await deleteItem(selected.id)
      toast(`${selected.name} removed from your kitchen`, 'success')
      navigate('/app/inventory')
    } else {
      await performAction(selected.id, selectedAction)
      toast(selectedAction === 'used' ? `${selected.name} logged as used` : `${selected.name} logged as ${selectedAction}`, 'success')
      navigate('/app/inventory')
    }
  }

  if (loading && !item) return <LoadingState label="Finding this food in your kitchen…" />
  if (!item) return <div className="animate-in">{error && <div className="mb-5"><ErrorState message={error} onRetry={() => void refresh()} /></div>}<EmptyState icon={Plus} title="We couldn't find that item" description="It may have been removed, or the link may be out of date." action={<Link to="/app/inventory" className="btn-secondary !text-xs"><ArrowLeft size={13} />Back to inventory</Link>} /></div>

  const status = getFreshnessStatus(item.expiresAt)
  return (
    <div className="animate-in">
      <Link to="/app/inventory" className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[#819087] hover:text-[#3d714d]"><ArrowLeft size={14} />Back to inventory</Link>
      {error && <div className="mb-5"><ErrorState message={error} onRetry={() => void refresh()} /></div>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="overflow-hidden rounded-[23px] border border-[#e6ece4] bg-white shadow-[0_7px_22px_rgba(35,62,47,.045)]">
          <div className={`relative overflow-hidden p-5 sm:p-7 ${status === 'expired' ? 'bg-[#faeee9]' : status === 'expiring_soon' ? 'bg-[#fbf4e4]' : 'bg-[#edf3e9]'}`}><div className="absolute -right-10 -top-16 h-44 w-44 rounded-full border-[26px] border-white/25" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center"><CategoryIcon category={item.category} size="lg" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-[28px] font-extrabold tracking-[-.055em] text-[#2d4335] sm:text-[34px]">{item.name}</h1><FoodStatusBadge status={status} /></div><p className="mt-1.5 text-sm text-[#75847a]">{shortQuantity(item)} <span className="mx-1.5 text-[#b8c0b9]">·</span>{categoryLabel(item.category)}</p></div><button onClick={() => setEditOpen(true)} className="btn-secondary relative !min-h-[39px] !rounded-[11px] !px-3.5 !py-2 !text-xs"><Pencil size={13} />Edit item</button></div></div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
            <div className="rounded-[16px] border border-[#edf0ec] bg-[#fcfdfb] p-4"><div className="flex items-center gap-2 text-[#829087]"><CalendarDays size={15} /><span className="text-[10px] font-bold uppercase tracking-[.09em]">Best by date</span></div><p className="mt-3 font-display text-xl font-extrabold tracking-[-.04em] text-[#34493b]">{formatDate(item.expiresAt, { month: 'long', day: 'numeric', year: 'numeric' })}</p><p className="mt-1 text-xs text-[#8c988f]">{getExpiryTimeHint(item.expiresAt)}</p></div>
            <div className="rounded-[16px] border border-[#edf0ec] bg-[#fcfdfb] p-4"><div className="flex items-center gap-2 text-[#829087]"><CalendarDays size={15} /><span className="text-[10px] font-bold uppercase tracking-[.09em]">Purchased</span></div><p className="mt-3 font-display text-xl font-extrabold tracking-[-.04em] text-[#34493b]">{item.purchasedAt ? formatDate(item.purchasedAt, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not recorded'}</p><p className="mt-1 text-xs text-[#8c988f]">{item.purchasedAt ? 'Purchase date' : 'Add it in edit details'}</p></div>
            <div className="rounded-[16px] border border-[#edf0ec] bg-[#fcfdfb] p-4"><div className="flex items-center gap-2 text-[#829087]"><MapPin size={15} /><span className="text-[10px] font-bold uppercase tracking-[.09em]">Storage</span></div><p className="mt-3 font-display text-xl font-extrabold tracking-[-.04em] text-[#34493b]">{item.storageLocation || 'Not specified'}</p><p className="mt-1 text-xs text-[#8c988f]">{categoryLabel(item.category)}</p></div>
            <div className="rounded-[16px] border border-[#edf0ec] bg-[#fcfdfb] p-4"><div className="flex items-center gap-2 text-[#829087]"><Utensils size={15} /><span className="text-[10px] font-bold uppercase tracking-[.09em]">Quantity</span></div><p className="mt-3 font-display text-xl font-extrabold tracking-[-.04em] text-[#34493b]">{shortQuantity(item)}</p><p className="mt-1 text-xs text-[#8c988f]">Logged in your kitchen</p></div>
            <div className="rounded-[16px] border border-[#edf0ec] bg-[#fcfdfb] p-4"><div className="flex items-center gap-2 text-[#829087]"><Clock3 size={15} /><span className="text-[10px] font-bold uppercase tracking-[.09em]">Added to SmartBite</span></div><p className="mt-3 font-display text-xl font-extrabold tracking-[-.04em] text-[#34493b]">{formatDate(item.createdAt, { month: 'long', day: 'numeric' })}</p><p className="mt-1 text-xs text-[#8c988f]">{formatDistanceToNow(item.createdAt)}</p></div>
          </div>
          <div className="border-t border-[#eff2ee] px-5 py-4 sm:px-7"><p className="text-[10px] font-bold uppercase tracking-[.09em] text-[#9aa49d]">A note on freshness</p><p className="mt-1.5 text-xs leading-5 text-[#829087]">Best-by dates are a helpful reminder, not a safety guarantee. When in doubt, follow the package guidance and trust your senses.</p></div>
        </section>
        <aside className="space-y-3">
          <div className="surface rounded-[21px] p-5"><p className="eyebrow">When you're ready</p><h2 className="mt-1 font-display text-[17px] font-extrabold tracking-[-.04em] text-[#34483a]">What happened to it?</h2><p className="mt-1.5 text-xs leading-5 text-[#89958d]">Every update helps your kitchen story stay accurate.</p>
            <div className="mt-4 space-y-2">{status !== 'expired' && <button onClick={() => setAction('used')} className="flex min-h-[43px] w-full items-center gap-2.5 rounded-[11px] border border-[#dce9db] bg-[#f2f8f1] px-3 text-left text-xs font-bold text-[#477850] transition hover:bg-[#eaf3e9]"><Utensils size={15} />Mark as used</button>}{status !== 'expired' && <button onClick={() => setAction('donated')} className="flex min-h-[43px] w-full items-center gap-2.5 rounded-[11px] border border-[#e7ece5] bg-white px-3 text-left text-xs font-bold text-[#637168] transition hover:bg-[#f7f9f6]"><HeartHandshake size={15} />Donate</button>}<button onClick={() => setAction('composted')} className="flex min-h-[43px] w-full items-center gap-2.5 rounded-[11px] border border-[#e7ece5] bg-white px-3 text-left text-xs font-bold text-[#637168] transition hover:bg-[#f7f9f6]"><Recycle size={15} />Compost</button></div>
            <button onClick={() => setAction('delete')} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-bold text-[#aa7167] hover:bg-[#fff3ef]"><Trash2 size={12} />Remove from inventory</button>
          </div>
          <div className="rounded-[20px] bg-[#edf3e9] p-4"><div className="flex items-start gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/80 text-[#56805c]"><Clock3 size={14} /></span><div><p className="text-xs font-bold text-[#48654c]">{getExpiryTimeHint(item.expiresAt)}</p><p className="mt-1 text-[10px] leading-4 text-[#829481]">SmartBite will include this in your gentle expiry reminders.</p></div></div></div>
        </aside>
      </div>
      <ItemEditDialog item={item} open={editOpen} onClose={() => setEditOpen(false)} onSave={updateItem} />
      <ItemActionDialog item={item} action={action} onClose={() => setAction(null)} onConfirm={confirmAction} />
    </div>
  )
}
