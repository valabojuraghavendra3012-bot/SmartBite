import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpRight, Filter, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import type { FoodItem, FreshnessStatus, SortOption, WasteAction } from '../types'
import { CATEGORY_OPTIONS } from '../types'
import { getFreshnessStatus, categoryLabel } from '../lib/food'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { useQuickAdd } from '../components/Layout'
import { EmptyState, ErrorState, LoadingState, SectionHeader } from '../components/Common'
import { InventoryTable } from '../components/SmartComponents'
import { ItemActionDialog, ItemEditDialog } from '../components/ItemDialogs'

const freshnessFilters: { value: 'all' | FreshnessStatus; label: string; countKey: 'all' | FreshnessStatus }[] = [
  { value: 'all', label: 'Everything', countKey: 'all' },
  { value: 'fresh', label: 'Fresh', countKey: 'fresh' },
  { value: 'expiring_soon', label: 'Use soon', countKey: 'expiring_soon' },
  { value: 'expired', label: 'Past best-by', countKey: 'expired' },
]

export function InventoryPage() {
  const { items, loading, error, refresh, updateItem, deleteItem, performAction } = useAppData()
  const { toast } = useToast()
  const openQuickAdd = useQuickAdd()
  const [statusFilter, setStatusFilter] = useState<'all' | FreshnessStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('expiry')
  const [search, setSearch] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null)
  const [action, setAction] = useState<WasteAction | 'delete' | null>(null)
  const [editItem, setEditItem] = useState<FoodItem | null>(null)

  const counts = useMemo(() => ({
    all: items.length,
    fresh: items.filter((item) => getFreshnessStatus(item.expiresAt) === 'fresh').length,
    expiring_soon: items.filter((item) => getFreshnessStatus(item.expiresAt) === 'expiring_soon').length,
    expired: items.filter((item) => getFreshnessStatus(item.expiresAt) === 'expired').length,
  }), [items])

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const statusMatch = statusFilter === 'all' || getFreshnessStatus(item.expiresAt) === statusFilter
      const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter
      const searchMatch = !search.trim() || `${item.name} ${categoryLabel(item.category)} ${item.storageLocation || ''}`.toLowerCase().includes(search.trim().toLowerCase())
      return statusMatch && categoryMatch && searchMatch
    })
    return filtered.sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'category') return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      if (sortBy === 'quantity') return b.quantity - a.quantity
      return a.expiresAt.localeCompare(b.expiresAt)
    })
  }, [items, statusFilter, categoryFilter, search, sortBy])

  const activeFilterCount = Number(statusFilter !== 'all') + Number(categoryFilter !== 'all') + Number(Boolean(search.trim()))
  const resetFilters = () => { setStatusFilter('all'); setCategoryFilter('all'); setSearch(''); setSortBy('expiry') }
  const askAction = (item: FoodItem, selectedAction: WasteAction | 'delete') => { setSelectedItem(item); setAction(selectedAction) }
  const confirmAction = async (item: FoodItem, selectedAction: WasteAction | 'delete') => {
    if (selectedAction === 'delete') { await deleteItem(item.id); toast(`${item.name} removed`, 'success') }
    else { await performAction(item.id, selectedAction); toast(selectedAction === 'used' ? `${item.name} marked as used` : `${item.name} logged as ${selectedAction}`, 'success') }
  }

  return (
    <div className="animate-in">
      <SectionHeader eyebrow="Your kitchen" title="Inventory" description="A clear view of what you have and what deserves a little attention." action={<button onClick={openQuickAdd} className="btn-primary min-h-[43px] !rounded-[12px] !px-4 !text-xs"><Plus size={15} />Add food</button>} />
      {error && <div className="mb-5"><ErrorState message={error} onRetry={() => void refresh()} /></div>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-[13px] border border-[#e7ece5] bg-white p-1">
          {freshnessFilters.map((filter) => <button key={filter.value} onClick={() => setStatusFilter(filter.value)} className={`flex min-h-[35px] shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-[11px] font-bold transition ${statusFilter === filter.value ? 'bg-[#eaf2e8] text-[#37684a]' : 'text-[#7f8b83] hover:bg-[#f5f7f4]'}`}>{filter.label}<span className={`text-[9px] ${statusFilter === filter.value ? 'text-[#739277]' : 'text-[#a7afa9]'}`}>{counts[filter.countKey]}</span></button>)}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1 sm:w-[220px] sm:flex-none"><span className="sr-only">Search your inventory</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa49d]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field !min-h-[39px] !rounded-[11px] !pl-9 !pr-8 !text-xs" placeholder="Search your kitchen" />{search && <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ba49d] hover:text-[#54685b]"><X size={14} /></button>}</label>
          <button onClick={() => setMobileFiltersOpen((open) => !open)} className={`btn-secondary !min-h-[39px] !shrink-0 !gap-1.5 !rounded-[11px] !px-3 !py-2 !text-xs ${mobileFiltersOpen ? '!border-[#bfd2c0] !bg-[#f3f8f2] !text-[#39795c]' : ''}`}><Filter size={14} />Filter{activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e4eee2] text-[9px] font-bold text-[#3d7150]">{activeFilterCount}</span>}</button>
        </div>
      </div>

      {(mobileFiltersOpen || categoryFilter !== 'all' || sortBy !== 'expiry') && <div className="mb-4 flex flex-col gap-3 rounded-[15px] border border-[#e7ece5] bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2"><span className="mr-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#99a39c]"><SlidersHorizontal size={12} />Category</span><button onClick={() => setCategoryFilter('all')} className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${categoryFilter === 'all' ? 'bg-[#eaf2e8] text-[#38694a]' : 'bg-[#f5f7f4] text-[#7e8b82]'}`}>All</button>{CATEGORY_OPTIONS.map((category) => <button key={category.value} onClick={() => setCategoryFilter(category.value)} className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${categoryFilter === category.value ? 'bg-[#eaf2e8] text-[#38694a]' : 'bg-[#f5f7f4] text-[#7e8b82]'}`}>{category.label}</button>)}</div>
        <label className="flex items-center gap-2 text-[10px] font-bold text-[#829087]"><ArrowDownWideNarrow size={14} /><span>Sort by</span><select className="rounded-lg border border-[#e8ede6] bg-white px-2.5 py-2 text-[11px] font-semibold text-[#53645a] outline-none" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}><option value="expiry">Expiry date</option><option value="recent">Recently added</option><option value="category">Category</option><option value="quantity">Quantity</option></select></label>
      </div>}

      <div className="mb-3 flex items-center justify-between"><p className="text-xs text-[#8a958e]"><span className="font-bold text-[#52645a]">{filteredItems.length}</span> {filteredItems.length === 1 ? 'item' : 'items'}{activeFilterCount > 0 ? ' match your view' : ' in your kitchen'}</p>{activeFilterCount > 0 && <button onClick={resetFilters} className="text-[10px] font-bold text-[#548061] hover:text-[#214b3b]">Clear filters</button>}</div>

      {loading && items.length === 0 ? <LoadingState label="Gathering your pantry…" /> : filteredItems.length > 0 ? <InventoryTable items={filteredItems} onUse={(item) => askAction(item, 'used')} onDonate={(item) => askAction(item, 'donated')} onCompost={(item) => askAction(item, 'composted')} onEdit={(item) => setEditItem(item)} onDelete={(item) => askAction(item, 'delete')} /> : items.length > 0 ? <EmptyState icon={Search} illustration="search" title="No matches this time" description="Try another search or loosen a filter. Your items are still here." action={<button className="btn-secondary !text-xs" onClick={resetFilters}>Clear filters <ArrowUpRight size={13} /></button>} /> : <EmptyState icon={Plus} title="Nothing in your pantry yet" description="Start with the things you already have. One quick entry is all it takes." action={<button onClick={openQuickAdd} className="btn-primary !text-xs"><Plus size={14} />Add your first item</button>} />}

      <ItemActionDialog item={selectedItem} action={action} onClose={() => { setSelectedItem(null); setAction(null) }} onConfirm={confirmAction} />
      <ItemEditDialog item={editItem} open={Boolean(editItem)} onClose={() => setEditItem(null)} onSave={updateItem} />
    </div>
  )
}
