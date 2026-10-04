import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Apple, Bell, Check, CircleAlert, Clock3, Croissant, Leaf, Milk, Package, RefreshCw, Wheat, X,
} from 'lucide-react'
import type { AppNotification, Category, FoodItem, FreshnessStatus } from '../types'
import { categoryLabel, formatDate, getExpiryTimeHint, getFreshnessStatus, shortQuantity } from '../lib/food'

export function BrandMark({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`relative flex h-9 w-9 items-center justify-center rounded-[13px] ${inverse ? 'bg-white/15 text-white' : 'bg-[#e8f1e7] text-[#286047]'}`}>
        <Leaf size={19} strokeWidth={2.25} />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#f7f8f3] bg-[#edb85f]" />
      </span>
      {!compact && <span className={`font-display text-[18px] font-extrabold tracking-[-.055em] ${inverse ? 'text-white' : 'text-[#274437]'}`}>smartbite<span className="text-[#6b9b74]">.</span></span>}
    </span>
  )
}

const categoryStyles: Record<Category, { icon: typeof Leaf; tint: string; color: string }> = {
  dairy: { icon: Milk, tint: 'bg-[#edf2ff]', color: 'text-[#6175a3]' },
  vegetables: { icon: Leaf, tint: 'bg-[#eaf4e9]', color: 'text-[#48805d]' },
  fruits: { icon: Apple, tint: 'bg-[#fff1e7]', color: 'text-[#c77c46]' },
  meat: { icon: Leaf, tint: 'bg-[#faece9]', color: 'text-[#ba715f]' },
  bakery: { icon: Croissant, tint: 'bg-[#fff4df]', color: 'text-[#ac7c31]' },
  pantry: { icon: Wheat, tint: 'bg-[#f2f0e8]', color: 'text-[#82784c]' },
  other: { icon: Package, tint: 'bg-[#eef1ee]', color: 'text-[#7b8981]' },
}

export function CategoryIcon({ category, size = 'md' }: { category: Category; size?: 'sm' | 'md' | 'lg' }) {
  const style = categoryStyles[category] ?? categoryStyles.other
  const Icon = style.icon
  const dimensions = size === 'lg' ? 'h-14 w-14 rounded-[18px]' : size === 'sm' ? 'h-8 w-8 rounded-[10px]' : 'h-10 w-10 rounded-[13px]'
  const iconSize = size === 'lg' ? 24 : size === 'sm' ? 15 : 18
  return <span className={`flex shrink-0 items-center justify-center ${dimensions} ${style.tint} ${style.color}`}><Icon size={iconSize} strokeWidth={1.9} /></span>
}

export function FoodStatusBadge({ status, expiresAt, compact = false }: { status?: FreshnessStatus; expiresAt?: string; compact?: boolean }) {
  const resolved = status ?? (expiresAt ? getFreshnessStatus(expiresAt) : 'fresh')
  const meta = {
    fresh: { label: 'Fresh', style: 'status-fresh', dot: 'bg-[#4f9565]' },
    expiring_soon: { label: 'Use soon', style: 'status-expiring', dot: 'bg-[#d69b37]' },
    expired: { label: 'Check item', style: 'status-expired', dot: 'bg-[#cb6c5c]' },
  }[resolved]
  const detail = expiresAt ? getExpiryTimeHint(expiresAt) : meta.label
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.style}`} title={detail}>
      <span className={`status-dot ${meta.dot}`} />
      {compact ? meta.label : detail}
    </span>
  )
}

export function StatCard({
  label, value, detail, icon: Icon, iconTone = 'green', footer,
}: {
  label: string; value: string | number; detail?: string; icon: typeof Leaf; iconTone?: 'green' | 'yellow' | 'coral' | 'blue'; footer?: string
}) {
  const tones = {
    green: 'bg-[#eaf3e9] text-[#39795c]',
    yellow: 'bg-[#fff4dc] text-[#aa7b2b]',
    coral: 'bg-[#fceee8] text-[#c46f56]',
    blue: 'bg-[#edf1f8] text-[#677da8]',
  }
  return (
    <div className="surface rounded-[20px] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-[#7e8a82]">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${tones[iconTone]}`}><Icon size={17} strokeWidth={2} /></span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="font-display text-[28px] font-extrabold leading-none tracking-[-.055em] text-[#263b30] sm:text-[31px]">{value}</div>
        {detail && <span className="pb-0.5 text-[11px] font-semibold text-[#8a958e]">{detail}</span>}
      </div>
      {footer && <p className="mt-2 text-[11px] leading-4 text-[#8b968f]">{footer}</p>}
    </div>
  )
}

export const StatsCard = StatCard

export function EmptyState({
  icon: Icon = Leaf, title, description, action, illustration = 'leaf',
}: {
  icon?: typeof Leaf; title: string; description: string; action?: React.ReactNode; illustration?: 'leaf' | 'bell' | 'search'
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[#dfe7de] bg-white/70 px-6 py-12 text-center sm:py-16">
      <span className={`relative mb-5 flex h-[66px] w-[66px] items-center justify-center rounded-[23px] ${illustration === 'bell' ? 'bg-[#fff4df] text-[#b8832d]' : illustration === 'search' ? 'bg-[#eef2ee] text-[#728177]' : 'bg-[#eaf3e9] text-[#47815d]'}`}>
        <Icon size={28} strokeWidth={1.75} />
        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-[#edb85f]" />
      </span>
      <h3 className="font-display text-lg font-bold tracking-[-.03em] text-[#2e4437]">{title}</h3>
      <p className="mt-2 max-w-[390px] text-sm leading-6 text-[#7b8980]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Gathering your kitchen details…' }: { label?: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[22px] border border-[#e8ede6] bg-white/65 px-5 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3e9] text-[#39795c]"><RefreshCw className="animate-spin" size={19} /></span>
      <p className="mt-4 text-sm font-semibold text-[#53645a]">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-[#f3d6ce] bg-[#fff8f5] p-4 sm:flex-row sm:items-center">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fce9e4] text-[#bd6757]"><CircleAlert size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#815348]">A little connection hiccup</p>
        <p className="mt-0.5 break-words text-xs leading-5 text-[#9b7067]">{message}</p>
      </div>
      {onRetry && <button className="btn-secondary !min-h-[38px] !py-2 !text-xs" onClick={onRetry}><RefreshCw size={13} /> Try again</button>}
    </div>
  )
}

export function InlineNotice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warning' | 'success' }) {
  const style = tone === 'warning' ? 'border-[#f0dfb7] bg-[#fff9e9] text-[#8e6d30]' : tone === 'success' ? 'border-[#d4e7d6] bg-[#f2f8f1] text-[#47734e]' : 'border-[#dbe8df] bg-[#f3f8f3] text-[#577262]'
  return <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-5 ${style}`}><CircleAlert className="mt-0.5 shrink-0" size={14} /><span>{children}</span></div>
}

export function FoodCard({
  item, onUse, onEdit, onDelete, onDonate, onCompost, onClick,
}: {
  item: FoodItem
  onUse?: (item: FoodItem) => void
  onEdit?: (item: FoodItem) => void
  onDelete?: (item: FoodItem) => void
  onDonate?: (item: FoodItem) => void
  onCompost?: (item: FoodItem) => void
  onClick?: (item: FoodItem) => void
}) {
  const status = getFreshnessStatus(item.expiresAt)
  return (
    <article
      onClick={() => onClick?.(item)}
      onKeyDown={(event) => { if (onClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(item) } }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group rounded-[19px] border border-[#e8ede6] bg-white p-4 shadow-[0_4px_15px_rgba(35,62,47,.035)] transition-all hover:-translate-y-0.5 hover:border-[#cbd9cc] hover:shadow-[0_10px_26px_rgba(35,62,47,.08)] ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start gap-3">
        <CategoryIcon category={item.category} />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h3 className="truncate font-display text-[15px] font-bold tracking-[-.025em] text-[#2d4035]">{item.name}</h3>
            <span className="text-[11px] font-semibold text-[#8a958d]">{shortQuantity(item)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#87928b]">
            <span>{categoryLabel(item.category)}</span><span className="text-[#c4ccc6]">·</span><span>Best by {formatDate(item.expiresAt)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f0f2ef] pt-3">
        <FoodStatusBadge status={status} expiresAt={item.expiresAt} />
        <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          {onUse && status !== 'expired' && <button onClick={() => onUse(item)} className="rounded-[9px] px-2.5 py-1.5 text-[11px] font-bold text-[#39795c] transition-colors hover:bg-[#eff5ee]" title="Mark as used">Use</button>}
          {onEdit && <button onClick={() => onEdit(item)} className="rounded-[9px] px-2.5 py-1.5 text-[11px] font-bold text-[#7d8981] transition-colors hover:bg-[#f3f5f2]" title="Edit item">Edit</button>}
          {onDonate && status !== 'expired' && <button onClick={() => onDonate(item)} className="hidden rounded-[9px] px-2.5 py-1.5 text-[11px] font-bold text-[#7d8981] transition-colors hover:bg-[#f3f5f2] sm:inline-flex" title="Donate item">Donate</button>}
          {onCompost && status === 'expired' && <button onClick={() => onCompost(item)} className="rounded-[9px] px-2.5 py-1.5 text-[11px] font-bold text-[#7d8981] transition-colors hover:bg-[#f3f5f2]" title="Compost item">Compost</button>}
          {onDelete && <button onClick={() => onDelete(item)} className="rounded-[9px] px-2 py-1.5 text-[11px] font-bold text-[#b97466] transition-colors hover:bg-[#fff2ef]" title="Delete item">×</button>}
        </div>
      </div>
    </article>
  )
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', tone = 'green', loading = false, onCancel, onConfirm,
}: {
  open: boolean; title: string; message: string; confirmLabel?: string; tone?: 'green' | 'coral'; loading?: boolean; onCancel: () => void; onConfirm: () => void
}) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !loading) onCancel() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, loading, onCancel])
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget && !loading) onCancel() }}>
      <div className="w-full max-w-[420px] rounded-[24px] bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${tone === 'coral' ? 'bg-[#fff0ec] text-[#bd6b5a]' : 'bg-[#edf5ec] text-[#3f7957]'}`}><CircleAlert size={20} /></div>
        <h2 id="confirm-title" className="mt-4 font-display text-xl font-bold tracking-[-.04em] text-[#2b4034]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#78857d]">{message}</p>
        <div className="mt-6 flex justify-end gap-2.5">
          <button className="btn-secondary" disabled={loading} onClick={onCancel}>Cancel</button>
          <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white ${tone === 'coral' ? 'bg-[#b95f51] hover:bg-[#9e4c40]' : 'bg-[#214b3b] hover:bg-[#173c2d]'}`} disabled={loading} onClick={onConfirm}>{loading && <RefreshCw size={14} className="animate-spin" />}{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h1 className="font-display text-[27px] font-extrabold leading-tight tracking-[-.05em] text-[#253b2f] sm:text-[32px]">{title}</h1>{description && <p className="mt-2 max-w-[650px] text-sm leading-6 text-[#7d8981]">{description}</p>}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function ItemExpiryLine({ item }: { item: FoodItem }) {
  return <div className="flex items-center gap-1.5 text-[11px] text-[#7d8a82]"><Clock3 size={12} /><span>{getExpiryTimeHint(item.expiresAt)}</span></div>
}

export function NotificationIcon({ type }: { type: AppNotification['type'] }) {
  if (type === 'expiry') return <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff3dd] text-[#aa7c33]"><Clock3 size={16} /></span>
  if (type === 'impact') return <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf3e9] text-[#39795c]"><Leaf size={16} /></span>
  if (type === 'tip') return <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf2fa] text-[#627ba4]"><Bell size={16} /></span>
  return <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef1ee] text-[#738178]"><Check size={16} /></span>
}

export function CloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return <button onClick={onClick} className="btn-icon !h-9 !w-9" aria-label={label}><X size={17} /></button>
}

export function ItemLink({ item, children }: { item: FoodItem; children: React.ReactNode }) {
  return <Link to={`/app/items/${item.id}`} className="hover:text-[#39795c]">{children}</Link>
}
