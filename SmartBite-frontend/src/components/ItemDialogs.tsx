import { useEffect, useState } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import type { Category, FoodItem, NewFoodItem, WasteAction } from '../types'
import { CATEGORY_OPTIONS } from '../types'
import { useToast } from '../context/ToastContext'
import { inferCategory, localDateInput } from '../lib/food'
import { ConfirmDialog, CloseButton } from './Common'

export function ItemEditDialog({
  item, open, onClose, onSave,
}: {
  item: FoodItem | null; open: boolean; onClose: () => void; onSave: (id: string, changes: Partial<NewFoodItem>) => Promise<unknown>
}) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('item')
  const [expiresAt, setExpiresAt] = useState(localDateInput())
  const [purchasedAt, setPurchasedAt] = useState('')
  const [category, setCategory] = useState<Category>('other')
  const [location, setLocation] = useState('Fridge')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!item) return
    setName(item.name)
    setQuantity(String(item.quantity))
    setUnit(item.unit)
    setExpiresAt(item.expiresAt)
    setPurchasedAt(item.purchasedAt || '')
    setCategory(item.category)
    setLocation(item.storageLocation || 'Fridge')
  }, [item])

  if (!open || !item) return null
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(item.id, { name: name.trim(), quantity: Number(quantity), unit: unit.trim() || 'item', expiresAt, purchasedAt: purchasedAt || undefined, category, storageLocation: location.trim() || undefined })
      toast(`${name.trim()} updated`, 'success')
      onClose()
    } catch (error) { toast(error instanceof Error ? error.message : 'Couldn’t update this item.', 'error') }
    finally { setSaving(false) }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <div className="modal-card max-w-[510px]" role="dialog" aria-modal="true" aria-labelledby="edit-item-title">
      <div className="flex items-start justify-between border-b border-[#eff2ee] px-5 py-4 sm:px-6"><div><p className="eyebrow">Update your pantry</p><h2 id="edit-item-title" className="mt-1 font-display text-xl font-extrabold tracking-[-.04em] text-[#2f4437]">Edit {item.name}</h2></div><CloseButton onClick={onClose} /></div>
      <form onSubmit={(event) => void submit(event)} className="space-y-4 p-5 sm:p-6">
        <div><label className="field-label" htmlFor="edit-name">Food name</label><input id="edit-name" className="field" value={name} onChange={(event) => { setName(event.target.value); setCategory(inferCategory(event.target.value)) }} required /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="field-label" htmlFor="edit-quantity">Quantity</label><div className="flex gap-2"><input id="edit-quantity" type="number" min="0.1" step="0.1" className="field !w-24" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /><input className="field" value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Unit" /></div></div><div><label className="field-label" htmlFor="edit-expiry">Best by</label><input id="edit-expiry" type="date" className="field" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} required /></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="field-label" htmlFor="edit-category">Category</label><select id="edit-category" className="field" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div><div><label className="field-label" htmlFor="edit-location">Storage location</label><input id="edit-location" className="field" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Fridge" /></div></div>
        <div><label className="field-label" htmlFor="edit-purchase">Purchase date <span className="font-normal text-[#a1aaa3]">· optional</span></label><input id="edit-purchase" type="date" className="field" value={purchasedAt} onChange={(event) => setPurchasedAt(event.target.value)} /></div>
        <div className="flex justify-end gap-2 border-t border-[#eff2ee] pt-4"><button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>Cancel</button><button type="submit" className="btn-primary !py-2.5" disabled={saving || !name.trim()}>{saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}Save changes</button></div>
      </form>
    </div>
  </div>
}

export function ItemActionDialog({
  item, action, onClose, onConfirm,
}: {
  item: FoodItem | null; action: WasteAction | 'delete' | null; onClose: () => void; onConfirm: (item: FoodItem, action: WasteAction | 'delete') => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  if (!item || !action) return null
  const copy = action === 'used'
    ? { title: `Mark ${item.name} as used?`, message: 'We’ll move it out of your pantry and count it in your kitchen activity.', confirm: 'Mark as used', tone: 'green' as const }
    : action === 'donated'
      ? { title: `Pass ${item.name} along?`, message: 'We’ll log this as donated and remove it from your current pantry.', confirm: 'Log donation', tone: 'green' as const }
      : action === 'composted'
        ? { title: `Compost ${item.name}?`, message: 'This will move the item out of your pantry and record it as composted.', confirm: 'Log compost', tone: 'coral' as const }
        : { title: `Remove ${item.name}?`, message: 'This item will be removed from your pantry. This action won’t be counted as used or donated.', confirm: 'Delete item', tone: 'coral' as const }
  const confirm = async () => {
    setLoading(true)
    try { await onConfirm(item, action); onClose() }
    catch (error) { toast(error instanceof Error ? error.message : 'That action didn’t work. Try again.', 'error') }
    finally { setLoading(false) }
  }
  return <ConfirmDialog open title={copy.title} message={copy.message} confirmLabel={copy.confirm} tone={copy.tone} loading={loading} onCancel={onClose} onConfirm={() => void confirm()} />
}
