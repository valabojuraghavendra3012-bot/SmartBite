import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleAlert, Clock3, HeartHandshake, Leaf, Package, Plus, Recycle, Sprout, Utensils } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { useQuickAdd } from '../components/Layout'
import { EmptyState, ErrorState, FoodCard, LoadingState, StatCard } from '../components/Common'
import { ExpiryTimeline } from '../components/SmartComponents'
import { ItemActionDialog, ItemEditDialog } from '../components/ItemDialogs'
import { getCurrentGreeting, getFreshnessStatus, getGreetingName, relativeExpiry } from '../lib/food'
import type { FoodItem, WasteAction } from '../types'

export function DashboardPage() {
  const { user } = useAuth()
  const { items, stats, loading, error, refresh, updateItem, deleteItem, performAction } = useAppData()
  const { toast } = useToast()
  const openQuickAdd = useQuickAdd()
  const navigate = useNavigate()
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null)
  const [action, setAction] = useState<WasteAction | 'delete' | null>(null)
  const [editItem, setEditItem] = useState<FoodItem | null>(null)

  const expiring = useMemo(() => items.filter((item) => getFreshnessStatus(item.expiresAt) === 'expiring_soon').sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)), [items])
  const pastBest = useMemo(() => items.filter((item) => getFreshnessStatus(item.expiresAt) === 'expired').sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)), [items])
  const freshCount = stats?.freshItems ?? items.filter((item) => getFreshnessStatus(item.expiresAt) === 'fresh').length
  const soonCount = stats?.expiringSoon ?? items.filter((item) => getFreshnessStatus(item.expiresAt) === 'expiring_soon').length
  const expiredCount = stats?.expired ?? items.filter((item) => getFreshnessStatus(item.expiresAt) === 'expired').length
  const estimated = stats?.estimatedWastePreventedKg

  const askAction = (item: FoodItem, selectedAction: WasteAction | 'delete') => { setSelectedItem(item); setAction(selectedAction) }
  const confirmAction = async (item: FoodItem, selectedAction: WasteAction | 'delete') => {
    if (selectedAction === 'delete') {
      await deleteItem(item.id)
      toast(`${item.name} removed from your kitchen`, 'success')
    } else {
      await performAction(item.id, selectedAction)
      toast(selectedAction === 'used' ? `Nice one — ${item.name} logged as used` : selectedAction === 'donated' ? `${item.name} logged as donated` : `${item.name} logged as composted`, 'success')
    }
  }

  const cardActions = {
    onUse: (item: FoodItem) => askAction(item, 'used'),
    onEdit: (item: FoodItem) => setEditItem(item),
    onDelete: (item: FoodItem) => askAction(item, 'delete'),
    onDonate: (item: FoodItem) => askAction(item, 'donated'),
    onCompost: (item: FoodItem) => askAction(item, 'composted'),
    onClick: (item: FoodItem) => navigate(`/app/items/${item.id}`),
  }

  return (
    <div className="animate-in">
      <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p><h1 className="mt-2 font-display text-[27px] font-extrabold tracking-[-.055em] text-[#263b2f] sm:text-[34px]">{getCurrentGreeting()}, {getGreetingName(user?.fullName, user?.email)}.</h1><p className="mt-1.5 text-sm text-[#7e8b82]">Your kitchen, a little more in sync.</p></div>
        <button onClick={openQuickAdd} className="btn-primary min-h-[45px] !rounded-[12px] !px-4"><Plus size={17} />Quick add food</button>
      </div>

      {error && <div className="mb-5"><ErrorState message={error} onRetry={() => void refresh()} /></div>}

      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="In your kitchen" value={stats?.totalItems ?? items.length} detail="items" icon={Package} iconTone="green" />
        <StatCard label="Fresh & ready" value={freshCount} detail="good to go" icon={Leaf} iconTone="green" />
        <StatCard label="Use these soon" value={soonCount} detail="next 3 days" icon={Clock3} iconTone="yellow" />
        <StatCard label="Past best-by" value={expiredCount} detail={expiredCount === 1 ? 'item' : 'items'} icon={CircleAlert} iconTone="coral" />
        <StatCard label="Waste prevented" value={estimated == null ? '—' : estimated.toFixed(1)} detail={estimated == null ? 'kg estimate' : 'kg estimated'} icon={Sprout} iconTone="blue" footer={estimated == null ? 'Shown when weight data is available' : 'Estimate based on your logged actions'} />
      </section>

      {items.length > 0 && expiring.length > 0 && <section className="relative mb-5 overflow-hidden rounded-[22px] bg-[#eaf2e8] p-4 sm:p-5">
        <div className="absolute -right-6 -top-12 h-40 w-40 rounded-full border-[24px] border-white/20" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/80 text-[#51815c]"><Utensils size={18} /></span><div><div className="flex flex-wrap items-center gap-2"><p className="font-display text-[15px] font-extrabold tracking-[-.03em] text-[#33533d]">A little love for the fridge</p><span className="rounded-full bg-white/75 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-[#70896f]">{expiring.length} need a plan</span></div><p className="mt-1 max-w-[570px] text-xs leading-5 text-[#708775]">{expiring.slice(0, 2).map((item) => `${item.name} · ${relativeExpiry(item.expiresAt).toLowerCase()}`).join('  /  ')}{expiring.length > 2 ? `  /  +${expiring.length - 2} more` : ''}</p></div></div>
          <Link to="/app/recipes" className="relative inline-flex min-h-[39px] shrink-0 items-center justify-center gap-2 rounded-[11px] border border-[#c9dbc8] bg-white px-3.5 text-xs font-bold text-[#3a6b48] transition hover:border-[#a9c5a9] hover:bg-[#fcfefb]">Find a recipe <ArrowRight size={14} /></Link>
        </div>
      </section>}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.75fr]">
        <section>
          <div className="mb-3.5 flex items-end justify-between gap-3"><div><p className="eyebrow">The next few days</p><h2 className="mt-1 font-display text-[18px] font-extrabold tracking-[-.04em] text-[#304638]">Use these first</h2></div><Link to="/app/inventory" className="inline-flex items-center gap-1.5 pb-1 text-[11px] font-bold text-[#64806a] hover:text-[#28553b]">Full pantry <ArrowRight size={13} /></Link></div>
          {loading && items.length === 0 ? <LoadingState label="Getting your pantry ready…" /> : items.length === 0 ? <EmptyState icon={Leaf} title="A fresh start, whenever you're ready" description="Add the things already in your fridge. We'll keep the dates in mind, so you don't have to." action={<button onClick={openQuickAdd} className="btn-primary !py-2.5 !text-xs"><Plus size={14} />Add your first item</button>} /> : expiring.length > 0 ? <div className="grid gap-3 sm:grid-cols-2">{expiring.slice(0, 4).map((item) => <FoodCard key={item.id} item={item} {...cardActions} />)}</div> : pastBest.length > 0 ? <div className="rounded-[21px] border border-[#f0e1dd] bg-[#fffaf8] p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#faeae5] text-[#bd6958]"><CircleAlert size={18} /></span><div><h3 className="text-sm font-bold text-[#76564d]">A quick quality check</h3><p className="mt-1 text-xs leading-5 text-[#987b73]">These items are past their best-by date. Check the packaging and use your judgment before deciding what to do.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{pastBest.slice(0, 4).map((item) => <FoodCard key={item.id} item={item} {...cardActions} />)}</div></div> : <div className="rounded-[21px] border border-[#e5ece3] bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#eaf3e9] text-[#4c8059]"><Leaf size={18} /></span><div><h3 className="text-sm font-bold text-[#3c5142]">Nothing urgent right now</h3><p className="mt-1 text-xs leading-5 text-[#8a968e]">Everything you've logged is looking good. We'll bring items here as their dates get closer.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{items.slice(0, 2).map((item) => <FoodCard key={item.id} item={item} {...cardActions} />)}</div></div>}
        </section>
        <section className="surface rounded-[21px] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-2"><div><p className="eyebrow">A gentle heads-up</p><h2 className="mt-1 font-display text-[17px] font-extrabold tracking-[-.04em] text-[#304638]">Expiry timeline</h2></div><span className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-[#fff4df] text-[#ae7f35]"><Clock3 size={15} /></span></div>
          {loading && !items.length ? <div className="space-y-3 py-2">{[0,1,2].map((i) => <div key={i} className="h-[54px] animate-pulse rounded-xl bg-[#f4f6f2]" />)}</div> : <ExpiryTimeline items={items} limit={5} />}
          <div className="mt-3 rounded-xl bg-[#f6f8f4] px-3 py-2.5 text-[10px] leading-4 text-[#8b978e]">Freshness is a helpful guide, not a safety guarantee. Use your best judgment.</div>
        </section>
      </div>

      {items.length > 0 && <section className="mt-7">
        <div className="mb-3.5 flex items-end justify-between"><div><p className="eyebrow">A quick look around</p><h2 className="mt-1 font-display text-[18px] font-extrabold tracking-[-.04em] text-[#304638]">In the kitchen</h2></div><Link to="/app/inventory" className="text-[11px] font-bold text-[#64806a] hover:text-[#28553b]">See all {items.length} items <ArrowRight size={12} className="ml-1 inline" /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.slice(0, 3).map((item) => <FoodCard key={`all-${item.id}`} item={item} {...cardActions} />)}</div>
      </section>}

      {items.length === 0 && !loading && <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="surface flex items-center gap-3 rounded-[18px] p-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef4eb] text-[#4e8059]"><HeartHandshake size={16} /></span><div><p className="text-xs font-bold text-[#44594a]">Sharing is a good option</p><p className="mt-1 text-[10px] text-[#919c94]">Donate unopened food before its date.</p></div></div><div className="surface flex items-center gap-3 rounded-[18px] p-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f1e8] text-[#7b7e55]"><Recycle size={16} /></span><div><p className="text-xs font-bold text-[#44594a]">Compost what can’t be saved</p><p className="mt-1 text-[10px] text-[#919c94]">Keep organic scraps in the loop.</p></div></div></div>}

      <ItemActionDialog item={selectedItem} action={action} onClose={() => { setSelectedItem(null); setAction(null) }} onConfirm={confirmAction} />
      <ItemEditDialog item={editItem} open={Boolean(editItem)} onClose={() => setEditItem(null)} onSave={updateItem} />
    </div>
  )
}
