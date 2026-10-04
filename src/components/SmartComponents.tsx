import { useState } from 'react'
import { ArrowRight, Check, ChefHat, Clock3, Ellipsis, HeartHandshake, Recycle, Sparkles, Trash2, Utensils, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AppNotification, FoodItem, Recipe } from '../types'
import { categoryLabel, formatDate, formatDistanceToNow, getExpiryTimeHint, getFreshnessStatus, shortQuantity } from '../lib/food'
import { CategoryIcon, FoodStatusBadge, NotificationIcon } from './Common'

export function InventoryTable({
  items, onUse, onDonate, onCompost, onEdit, onDelete,
}: {
  items: FoodItem[]
  onUse?: (item: FoodItem) => void
  onDonate?: (item: FoodItem) => void
  onCompost?: (item: FoodItem) => void
  onEdit?: (item: FoodItem) => void
  onDelete?: (item: FoodItem) => void
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#e8ede6] bg-white shadow-[0_4px_15px_rgba(35,62,47,.035)]">
      <div className="hidden grid-cols-[minmax(200px,1.5fr)_minmax(100px,.7fr)_minmax(115px,.85fr)_minmax(130px,1fr)_minmax(168px,1fr)] gap-4 border-b border-[#edf0ec] bg-[#fbfcfa] px-5 py-3 text-[10px] font-bold uppercase tracking-[.09em] text-[#8a958e] lg:grid">
        <span>Food</span><span>Quantity</span><span>Best by</span><span>Freshness</span><span className="text-right">Actions</span>
      </div>
      <div className="divide-y divide-[#f0f2ef]">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(120px,.8fr)] sm:items-center sm:px-5 lg:grid-cols-[minmax(200px,1.5fr)_minmax(100px,.7fr)_minmax(115px,.85fr)_minmax(130px,1fr)_minmax(168px,1fr)] lg:gap-4">
            <Link to={`/app/items/${item.id}`} className="flex min-w-0 items-center gap-3">
              <CategoryIcon category={item.category} size="sm" />
              <span className="min-w-0"><span className="block truncate text-sm font-bold text-[#35473c]">{item.name}</span><span className="mt-0.5 block text-[11px] text-[#98a199]">{categoryLabel(item.category)}</span></span>
            </Link>
            <span className="pl-11 text-xs font-semibold text-[#64736a] sm:pl-0"><span className="mr-2 text-[10px] font-bold uppercase text-[#a1aaa3] sm:hidden">Qty</span>{shortQuantity(item)}</span>
            <span className="pl-11 text-xs text-[#64736a] sm:pl-0"><span className="mr-2 text-[10px] font-bold uppercase text-[#a1aaa3] sm:hidden">Best by</span>{formatDate(item.expiresAt, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <div className="pl-11 sm:pl-0"><span className="mr-2 text-[10px] font-bold uppercase text-[#a1aaa3] sm:hidden">Status</span><FoodStatusBadge expiresAt={item.expiresAt} compact /></div>
            <div className="flex items-center gap-1 pl-10 sm:pl-0 lg:justify-end">
              {onUse && getFreshnessStatus(item.expiresAt) !== 'expired' && <button onClick={() => onUse(item)} className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[#39795c] hover:bg-[#eef5ed]">Use</button>}
              {onDonate && getFreshnessStatus(item.expiresAt) !== 'expired' && <button onClick={() => onDonate(item)} className="hidden rounded-lg px-2 py-1.5 text-[11px] font-bold text-[#718077] hover:bg-[#f3f5f2] xl:block">Donate</button>}
              {onCompost && getFreshnessStatus(item.expiresAt) === 'expired' && <button onClick={() => onCompost(item)} className="hidden rounded-lg px-2 py-1.5 text-[11px] font-bold text-[#718077] hover:bg-[#f3f5f2] xl:block">Compost</button>}
              {onEdit && <button onClick={() => onEdit(item)} className="rounded-lg px-2 py-1.5 text-[11px] font-bold text-[#718077] hover:bg-[#f3f5f2]">Edit</button>}
              {onDelete && <button onClick={() => onDelete(item)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#a1aaa3] hover:bg-[#fff0ed] hover:text-[#b85d4d]" aria-label={`Delete ${item.name}`}><Trash2 size={14} /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ExpiryTimeline({ items, limit = 4 }: { items: FoodItem[]; limit?: number }) {
  const upcoming = [...items].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)).slice(0, limit)
  if (upcoming.length === 0) {
    return <div className="flex min-h-[172px] flex-col items-center justify-center rounded-[18px] bg-[#f8faf6] px-5 py-7 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3e9] text-[#4e8861]"><Check size={18} /></span>
      <p className="text-sm font-bold text-[#42564a]">Nothing urgent in the fridge</p><p className="mt-1 max-w-[230px] text-xs leading-5 text-[#8a968d]">Add a few items and we'll keep the timing on your radar.</p>
    </div>
  }
  return (
    <div className="space-y-0.5">
      {upcoming.map((item, index) => {
        const status = getFreshnessStatus(item.expiresAt)
        const dot = status === 'expired' ? 'bg-[#ce7868]' : status === 'expiring_soon' ? 'bg-[#d9a246]' : 'bg-[#62a072]'
        return (
          <Link key={item.id} to={`/app/items/${item.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[#f6f8f4]">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#f1f5ef] text-[#63806b]">
              <CategoryIcon category={item.category} size="sm" />
              {index < upcoming.length - 1 && <span className="absolute -bottom-4 left-1/2 h-4 w-px -translate-x-1/2 bg-[#e1e8e0]" />}
            </div>
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold text-[#415248]">{item.name}</p><p className="mt-0.5 text-[11px] text-[#8a968d]">{getExpiryTimeHint(item.expiresAt)}</p></div>
            <span className={`h-2 w-2 rounded-full ${dot}`} />
          </Link>
        )
      })}
    </div>
  )
}

export function NotificationCard({
  notification, onRead, onDelete, onAction,
}: {
  notification: AppNotification; onRead?: (notification: AppNotification) => void; onDelete?: (notification: AppNotification) => void; onAction?: (notification: AppNotification) => void
}) {
  return (
    <div className={`flex gap-3 rounded-[18px] border p-4 transition-colors ${notification.read ? 'border-[#edf0ec] bg-white' : 'border-[#dfe9de] bg-[#fbfdf9]'}`}>
      <NotificationIcon type={notification.type} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2"><h3 className="text-sm font-bold text-[#35483c]">{notification.title}</h3>{!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-[#4d8b5c]" />}</div>
          <span className="text-[10px] font-medium text-[#9aa49d]">{formatDistanceToNow(notification.createdAt)}</span>
        </div>
        <p className="mt-1.5 max-w-[620px] text-xs leading-5 text-[#76847a]">{notification.message}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {notification.actionLabel && onAction && <button onClick={() => onAction(notification)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf4eb] px-2.5 py-1.5 text-[11px] font-bold text-[#39795c] hover:bg-[#e1eddf]">{notification.actionLabel}<ArrowRight size={12} /></button>}
          {!notification.read && onRead && <button onClick={() => onRead(notification)} className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[#75837a] hover:bg-[#f1f4f0]">Mark as read</button>}
          {onDelete && <button onClick={() => onDelete(notification)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[#a0aaa3] hover:bg-[#fff1ee] hover:text-[#b95747]" aria-label="Delete notification"><X size={15} /></button>}
        </div>
      </div>
    </div>
  )
}

export function RecipeCard({ recipe, onCook }: { recipe: Recipe; onCook?: (recipe: Recipe) => void }) {
  const [expanded, setExpanded] = useState(false)
  const inventoryIngredients = recipe.ingredients.filter((ingredient) => ingredient.fromInventory)
  return (
    <article className="overflow-hidden rounded-[22px] border border-[#e5ebe3] bg-white shadow-[0_5px_18px_rgba(35,62,47,.045)]">
      <div className="relative flex min-h-[138px] items-end overflow-hidden bg-[#e8f0e6] p-5">
        <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 82% 5%, rgba(255,255,255,.92), transparent 32%), radial-gradient(circle at 98% 93%, rgba(182,204,169,.65), transparent 43%), linear-gradient(135deg, #edf4e9 0%, #dae8d8 100%)' }} />
        <div className="absolute right-5 top-4 flex h-[74px] w-[74px] items-center justify-center rounded-full border border-white/50 bg-white/45 text-[#668569] shadow-[inset_0_0_0_8px_rgba(255,255,255,.16)]"><Utensils size={30} strokeWidth={1.45} /></div>
        <div className="relative z-10 flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#55745c] backdrop-blur-sm"><Sparkles size={12} />{recipe.expiringIngredientsUsed.length ? 'Use these first' : 'Pantry idea'}</div>
        {recipe.source === 'demo' && <div className="absolute right-3 top-3 rounded-full border border-white/60 bg-white/70 px-2 py-1 text-[9px] font-bold uppercase tracking-[.07em] text-[#68816e]">Demo idea</div>}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1"><h3 className="font-display text-lg font-extrabold leading-tight tracking-[-.04em] text-[#2c4235]">{recipe.name}</h3><p className="mt-1.5 text-xs leading-5 text-[#829087]">{recipe.description || 'A fresh idea for making the most of your kitchen.'}</p></div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-[#f6f8f4] px-2.5 py-2 text-[11px] font-bold text-[#738077]"><Clock3 size={13} />{recipe.prepMinutes} min</div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#929d95]">From your kitchen</p>
          <div className="flex flex-wrap gap-1.5">
            {inventoryIngredients.length ? inventoryIngredients.map((ingredient) => {
              const isSoon = ingredient.expiresAt ? getFreshnessStatus(ingredient.expiresAt) !== 'fresh' : false
              return <span key={`${ingredient.name}-${ingredient.itemId}`} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${isSoon ? 'bg-[#fff4dd] text-[#9a722d]' : 'bg-[#eef4ed] text-[#59745e]'}`}>
                {isSoon ? <Clock3 size={11} /> : <Check size={11} />}{ingredient.name}{isSoon && ingredient.expiresAt && <span className="opacity-75">· {getExpiryTimeHint(ingredient.expiresAt)}</span>}
              </span>
            }) : <span className="text-xs text-[#99a29c]">No pantry ingredients matched yet</span>}
          </div>
        </div>
        {recipe.missingIngredients.length > 0 && <p className="mt-3 text-[11px] text-[#97a098]">You may need: {recipe.missingIngredients.join(', ')}</p>}
        <button onClick={() => setExpanded((value) => !value)} className="mt-4 flex w-full items-center justify-between border-t border-[#eff2ee] pt-3 text-left text-xs font-bold text-[#718077] hover:text-[#39795c]">
          {expanded ? 'Hide instructions' : 'See how to make it'}<span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}><Ellipsis size={17} /></span>
        </button>
        {expanded && <ol className="mt-1 space-y-2 pb-2 text-xs leading-5 text-[#728077]">{recipe.instructions.map((step, index) => <li key={step} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#edf4eb] text-[10px] font-bold text-[#578064]">{index + 1}</span><span>{step}</span></li>)}</ol>}
        <button onClick={() => onCook?.(recipe)} className="btn-primary mt-3 w-full !py-2.5"><ChefHat size={15} />Cook this</button>
      </div>
    </article>
  )
}

export function ActionQuickLinks({ onDonate, onCompost }: { onDonate?: () => void; onCompost?: () => void }) {
  return <div className="flex items-center gap-2"><button className="btn-secondary !rounded-[10px] !px-3 !py-2 !text-xs" onClick={onDonate}><HeartHandshake size={14} />Donate</button><button className="btn-secondary !rounded-[10px] !px-3 !py-2 !text-xs" onClick={onCompost}><Recycle size={14} />Compost</button></div>
}
