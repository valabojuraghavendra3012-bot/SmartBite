import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, FileImage, Mic, Plus, RefreshCw, ScanLine, Sparkles, Trash2, Type, Upload, X } from 'lucide-react'
import { api } from '../services/api'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { CATEGORY_OPTIONS, type FoodItemDraft, type NewFoodItem, type ParsedItemsResult } from '../types'
import { buildFoodDraft, inferCategory, localDateInput } from '../lib/food'
import { CategoryIcon, CloseButton, InlineNotice } from './Common'

type EntryMode = 'text' | 'voice' | 'receipt'

function DraftEditor({ drafts, onChange, onAdd, onRemove }: { drafts: FoodItemDraft[]; onChange: (index: number, draft: FoodItemDraft) => void; onAdd: () => void; onRemove: (index: number) => void }) {
  if (!drafts.length) return null
  return (
    <div className="mt-5 rounded-[17px] border border-[#e7ece5] bg-[#fafcf9] p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div><p className="text-xs font-bold text-[#43584a]">Review your items</p><p className="mt-0.5 text-[10px] text-[#96a098]">A quick check before they join your kitchen.</p></div>
        <span className="rounded-full bg-[#eaf2e8] px-2.5 py-1 text-[10px] font-bold text-[#4d7856]">{drafts.length} found</span>
      </div>
      <div className="space-y-2.5">
        {drafts.map((draft, index) => (
          <div key={index} className="rounded-[14px] border border-[#edf0ec] bg-white p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2.5 sm:grid-cols-[minmax(150px,1.4fr)_92px_minmax(135px,.9fr)_minmax(128px,.9fr)]">
              <label className="min-w-0"><span className="sr-only">Food name</span><input className="field !min-h-[39px] !rounded-[9px] !px-2.5 !py-2 !text-xs" value={draft.name} onChange={(event) => onChange(index, { ...draft, name: event.target.value, category: inferCategory(event.target.value) })} placeholder="Food name" /></label>
              <label><span className="sr-only">Quantity</span><input className="field !min-h-[39px] !rounded-[9px] !px-2 !py-2 !text-xs" type="number" min="0.1" step="0.1" value={draft.quantity} onChange={(event) => onChange(index, { ...draft, quantity: Math.max(.1, Number(event.target.value)) })} aria-label="Quantity" /></label>
              <label className="col-span-2 sm:col-span-1"><span className="sr-only">Best by date</span><input className="field !min-h-[39px] !rounded-[9px] !px-2.5 !py-2 !text-xs" type="date" value={draft.expiresAt} onChange={(event) => onChange(index, { ...draft, expiresAt: event.target.value })} aria-label="Best by date" /></label>
              <label className="col-span-2 sm:col-span-1"><span className="sr-only">Category</span><select className="field !min-h-[39px] !rounded-[9px] !px-2.5 !py-2 !text-xs" value={draft.category} onChange={(event) => onChange(index, { ...draft, category: event.target.value as FoodItemDraft['category'] })}>{CATEGORY_OPTIONS.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><CategoryIcon category={draft.category} size="sm" /><label className="text-[10px] font-semibold text-[#95a098]">Unit <input value={draft.unit} onChange={(event) => onChange(index, { ...draft, unit: event.target.value })} className="ml-1 w-20 border-b border-[#dfe7df] bg-transparent py-1 text-[11px] font-semibold text-[#58685d] outline-none focus:border-[#6d9977]" aria-label="Quantity unit" placeholder="item" /></label></div>
              <button type="button" onClick={() => onRemove(index)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#a2aaa4] hover:bg-[#fff1ee] hover:text-[#b85d4d]" aria-label={`Remove ${draft.name || 'item'}`}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-[#4c795a] hover:bg-[#edf4eb]"><Plus size={13} />Add another item</button>
    </div>
  )
}

export function TextParser({
  value, onChange, onParsed, drafts, onDraftChange, onAddDraft, onDraftRemove, parsing,
}: {
  value: string
  onChange: (value: string) => void
  onParsed: () => void
  drafts: FoodItemDraft[]
  onDraftChange: (index: number, draft: FoodItemDraft) => void
  onAddDraft: () => void
  onDraftRemove: (index: number) => void
  parsing: boolean
}) {
  const examples = ['Milk — Oct 12', '2 packets spinach — Oct 8']
  return (
    <div>
      <label className="field-label" htmlFor="quick-entry-text">What should we keep an eye on?</label>
      <div className="relative">
        <textarea
          id="quick-entry-text"
          className="field min-h-[112px] resize-y !rounded-[15px] !px-4 !py-3.5 !text-[14px] !leading-6"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') onParsed() }}
          placeholder={'Try “Milk — Oct 12” or “Two packets of milk expire October 12”'}
          autoFocus
        />
        <span className="absolute bottom-3 right-3 hidden rounded-md bg-[#f5f7f4] px-1.5 py-1 text-[9px] font-semibold text-[#9aa49c] sm:block">⌘ / Ctrl + Enter</span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold text-[#99a39b]">Try:</span>
        {examples.map((example) => <button key={example} type="button" onClick={() => onChange(example)} className="rounded-full border border-[#e7ece6] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#66776b] transition hover:border-[#c8d7c9] hover:text-[#39795c]">{example}</button>)}
        <button type="button" onClick={onParsed} disabled={!value.trim() || parsing} className="btn-secondary ml-auto !min-h-[36px] !gap-1.5 !rounded-[10px] !px-3 !py-1.5 !text-[11px]">
          {parsing ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}{drafts.length ? 'Re-check' : 'Find items'}
        </button>
      </div>
      <DraftEditor drafts={drafts} onChange={onDraftChange} onAdd={onAddDraft} onRemove={onDraftRemove} />
    </div>
  )
}

interface SpeechRecognitionResultLike { 0: { transcript: string }; isFinal: boolean }
interface SpeechRecognitionEventLike extends Event { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
}

export function VoiceInput({ onTranscript, onManualTranscript }: { onTranscript: (transcript: string) => void; onManualTranscript: (transcript: string) => void }) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported, setSupported] = useState(true)
  const [speechError, setSpeechError] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setSupported(false); return }
    setSpeechError(false)
    const recognition = new SpeechRecognition()
    recognition.lang = navigator.language || 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(' ').trim()
      if (text) { setTranscript(text); onTranscript(text) }
    }
    recognition.onerror = () => { setListening(false); setSpeechError(true) }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  return (
    <div className="rounded-[18px] border border-[#e7ece5] bg-[#fbfcfa] p-5 text-center sm:p-7">
      <span className={`mx-auto flex h-[74px] w-[74px] items-center justify-center rounded-full ${listening ? 'animate-pulse bg-[#e1f0df] text-[#39795c]' : 'bg-[#edf4eb] text-[#39795c]'}`}><Mic size={29} strokeWidth={1.7} /></span>
      <h3 className="mt-4 font-display text-base font-bold tracking-[-.03em] text-[#34493b]">Say it like you'd tell a friend</h3>
      <p className="mx-auto mt-1.5 max-w-[330px] text-xs leading-5 text-[#8a968e]">For example: “Two packets of milk expire October 12.” We'll turn it into a pantry reminder.</p>
      <button type="button" onClick={listening ? () => recognitionRef.current?.stop() : startListening} className={`mx-auto mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 text-sm font-bold ${listening ? 'bg-[#fff0eb] text-[#b95d4d]' : 'bg-[#214b3b] text-white hover:bg-[#173c2d]'}`}>
        {listening ? <><span className="h-2 w-2 animate-pulse rounded-full bg-[#d56f5b]" />Listening… tap to stop</> : <><Mic size={15} />{supported ? 'Start speaking' : 'Try voice input'}</>}
      </button>
      {!supported && <p className="mt-2 text-[10px] text-[#9a7c3d]">Speech recognition isn't available in this browser. Type the words below instead.</p>}
      {speechError && <p className="mt-2 text-[11px] text-[#b55e4e]">We couldn't hear that. Check microphone permission and try again.</p>}
      {transcript && <div className="mt-5 rounded-[13px] border border-[#e5ece3] bg-white p-3 text-left"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#92a097]">Heard</p><p className="mt-1 text-sm font-semibold text-[#44564a]">“{transcript}”</p></div>}
      {(!supported || transcript) && <div className="mt-4 text-left"><label className="field-label" htmlFor="voice-fallback">Edit transcript</label><div className="flex gap-2"><input id="voice-fallback" className="field !min-h-[42px] !text-xs" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="e.g. 2 packets of milk — Oct 12" /><button type="button" onClick={() => onManualTranscript(transcript)} disabled={!transcript.trim()} className="btn-secondary !min-h-[42px] !px-3 !text-xs">Use</button></div></div>}
      <p className="mt-4 text-[10px] text-[#a2aaa4]">Your voice is only used to create text for this item.</p>
    </div>
  )
}

export function ReceiptUploader({ onExtracted }: { onExtracted: (result: ParsedItemsResult) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const handleFile = async (selected: File | undefined) => {
    if (!selected) return
    setFile(selected)
    setError('')
    setPreviewUrl(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : '')
    setLoading(true)
    try {
      const result = await api.parseReceipt(selected)
      onExtracted(result)
      if (result.message) setError(result.message)
      else if (!result.items.length) setError('We couldn’t find item names and dates. Try a clearer photo, or add the items by text.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Receipt scan did not work. Try again or add items by text.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input ref={inputRef} className="sr-only" type="file" accept="image/*,.txt,.csv" capture="environment" onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = '' }} />
      {!file ? (
        <button type="button" onClick={() => inputRef.current?.click()} className="group flex min-h-[230px] w-full flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-[#dfe8de] bg-[#fbfcfa] px-5 py-8 text-center transition hover:border-[#99b99d] hover:bg-[#f5faf4]">
          <span className="flex h-[62px] w-[62px] items-center justify-center rounded-[19px] bg-[#eaf3e9] text-[#46805a] transition group-hover:scale-105"><ScanLine size={26} strokeWidth={1.7} /></span>
          <span className="mt-4 font-display text-base font-bold tracking-[-.03em] text-[#3c5142]">Drop a receipt photo here</span>
          <span className="mt-1.5 max-w-[300px] text-xs leading-5 text-[#8b978e]">SmartBite reads the items so you don't have to type them one by one.</span>
          <span className="btn-secondary mt-4 !min-h-[38px] !rounded-[10px] !px-3.5 !py-2 !text-xs"><Upload size={14} />Choose a photo</span>
          <span className="mt-3 text-[10px] text-[#a2aba4]">JPG, PNG or HEIC · Use camera on mobile</span>
        </button>
      ) : (
        <div className="rounded-[18px] border border-[#e5ebe4] bg-[#fbfcfa] p-4">
          <div className="flex items-start gap-3">
            {previewUrl ? <img src={previewUrl} alt="Receipt preview" className="h-24 w-20 shrink-0 rounded-xl object-cover" /> : <span className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl bg-[#eef4ed] text-[#5b8263]"><FileImage size={24} /></span>}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#405347]">{file.name}</p><p className="mt-1 text-[11px] text-[#98a199]">{(file.size / 1024).toFixed(0)} KB · {loading ? 'Reading receipt…' : 'Ready for review'}</p>{loading && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7eee5]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#75a47a]" /></div>}</div>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9aa49d] hover:bg-[#f0f3ef]" aria-label="Remove receipt" onClick={() => { setFile(null); setPreviewUrl(''); onExtracted({ items: [] }) }}><X size={15} /></button>
          </div>
          {error && <div className="mt-3"><InlineNotice tone={error.toLowerCase().includes('couldn’t') || error.toLowerCase().includes('could not') ? 'warning' : 'info'}>{error}</InlineNotice></div>}
          {!loading && <button type="button" onClick={() => void handleFile(file)} className="btn-secondary mt-3 !min-h-[37px] !rounded-[10px] !px-3 !py-2 !text-xs"><Camera size={13} />Try scan again</button>}
        </div>
      )}
    </div>
  )
}

function ModeButton({ mode, active, onClick, icon: Icon, title, description }: { mode: EntryMode; active: boolean; onClick: (mode: EntryMode) => void; icon: typeof Type; title: string; description: string }) {
  return <button type="button" onClick={() => onClick(mode)} className={`flex min-w-[104px] flex-1 items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-left transition sm:min-w-0 ${active ? 'border-[#abc7ab] bg-[#edf5ec] text-[#2f6747]' : 'border-transparent bg-transparent text-[#7d8981] hover:bg-[#f3f6f2]'}`}>
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${active ? 'bg-white text-[#39795c]' : 'bg-white text-[#849188]'}`}><Icon size={15} /></span><span className="min-w-0"><span className="block text-xs font-bold">{title}</span><span className="hidden text-[10px] text-[#96a098] sm:block">{description}</span></span>
  </button>
}

export function QuickAddPanel({ onSaved, onCancel, compact = false }: { onSaved: (items: FoodItemDraft[]) => void; onCancel?: () => void; compact?: boolean }) {
  const { addItems } = useAppData()
  const { toast } = useToast()
  const [mode, setMode] = useState<EntryMode>('text')
  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState<FoodItemDraft[]>([])
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parseMessage, setParseMessage] = useState('')
  const [defaultUnit, setDefaultUnit] = useState('item')
  const [defaultStorage, setDefaultStorage] = useState('Fridge')

  useEffect(() => {
    let active = true
    api.getSettings().then((settings) => {
      if (!active) return
      setDefaultUnit(settings.defaultUnit === 'items' ? 'item' : settings.defaultUnit === 'kilograms' ? 'kg' : settings.defaultUnit === 'grams' ? 'g' : 'cup')
      setDefaultStorage(settings.defaultStorageLocation || 'Fridge')
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  const updateDraft = (index: number, draft: FoodItemDraft) => {
    setDrafts((current) => current.map((entry, entryIndex) => entryIndex === index ? draft : entry))
  }
  const addManualDraft = () => setDrafts((current) => [...current, buildFoodDraft({ expiresAt: localDateInput(), unit: defaultUnit })])
  const removeDraft = (index: number) => setDrafts((current) => current.filter((_, entryIndex) => entryIndex !== index))
  const changeMode = (nextMode: EntryMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    setDrafts([])
    setParseMessage('')
  }

  const runParse = async (input = text) => {
    if (!input.trim()) return
    setParsing(true)
    setParseMessage('')
    try {
      const result = mode === 'voice' ? await api.parseVoice(input) : await api.parseText(input)
      setDrafts(result.items)
      setParseMessage(result.message || (result.items.length ? '' : 'Add a best-by date so SmartBite knows when to remind you.'))
    } catch (error) {
      setParseMessage(error instanceof Error ? error.message : 'We couldn’t parse that yet. Try a simpler phrase.')
    } finally { setParsing(false) }
  }

  useEffect(() => {
    if (mode !== 'text' || !text.trim()) return
    let active = true
    const timer = window.setTimeout(async () => {
      setParsing(true)
      setParseMessage('')
      try {
        const result = await api.parseText(text)
        if (!active) return
        setDrafts(result.items)
        setParseMessage(result.message || (result.items.length ? '' : 'Add a best-by date so SmartBite knows when to remind you.'))
      } catch (error) {
        if (active) setParseMessage(error instanceof Error ? error.message : 'We couldn’t parse that yet. Try a simpler phrase.')
      } finally { if (active) setParsing(false) }
    }, 650)
    return () => { active = false; window.clearTimeout(timer) }
  }, [mode, text])

  const onVoiceTranscript = (transcript: string) => {
    setText(transcript)
    setDrafts([])
    void runParse(transcript)
  }

  const onReceiptExtracted = (result: ParsedItemsResult) => {
    setDrafts(result.items)
    setParseMessage(result.message ?? '')
  }

  const canSave = useMemo(() => drafts.length > 0 && drafts.every((draft) => draft.name.trim() && draft.expiresAt && draft.quantity > 0), [drafts])

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const payloads: NewFoodItem[] = drafts.map((draft) => ({
        name: draft.name.trim(),
        quantity: Number(draft.quantity),
        unit: !draft.unit.trim() || draft.unit.trim() === 'item' ? defaultUnit : draft.unit.trim(),
        expiresAt: draft.expiresAt,
        category: draft.category,
        purchasedAt: localDateInput(),
        storageLocation: defaultStorage,
      }))
      await addItems(payloads)
      toast(`${payloads.length} ${payloads.length === 1 ? 'item' : 'items'} added to your kitchen`, 'success')
      onSaved(drafts)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Couldn’t save those items. Try again.', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className={compact ? 'p-5 sm:p-7' : 'rounded-[25px] border border-[#e5ebe4] bg-white p-5 shadow-[0_7px_25px_rgba(35,62,47,.045)] sm:p-7'}>
      {!compact && <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eaf3e9] text-[#39795c]"><Sparkles size={20} /></span><div><h2 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#2f4437]">Add to your kitchen</h2><p className="mt-1 text-xs text-[#8b968e]">Pick the way that's easiest right now.</p></div></div>
        {onCancel && <CloseButton onClick={onCancel} />}
      </div>}
      <div className="flex gap-1 rounded-[15px] bg-[#f5f7f4] p-1.5">
        <ModeButton mode="text" active={mode === 'text'} onClick={changeMode} icon={Type} title="Type" description="Fastest" />
        <ModeButton mode="voice" active={mode === 'voice'} onClick={changeMode} icon={Mic} title="Speak" description="Hands-free" />
        <ModeButton mode="receipt" active={mode === 'receipt'} onClick={changeMode} icon={ScanLine} title="Receipt" description="Scan a photo" />
      </div>
      <div className="mt-5">
        {mode === 'text' && <TextParser value={text} onChange={(value) => { setText(value); setDrafts([]); setParseMessage('') }} onParsed={() => void runParse()} drafts={drafts} onDraftChange={updateDraft} onAddDraft={addManualDraft} onDraftRemove={removeDraft} parsing={parsing} />}
        {mode === 'voice' && <><VoiceInput onTranscript={onVoiceTranscript} onManualTranscript={onVoiceTranscript} />{drafts.length > 0 && <DraftEditor drafts={drafts} onChange={updateDraft} onAdd={addManualDraft} onRemove={removeDraft} />}</>}
        {mode === 'receipt' && <><ReceiptUploader onExtracted={onReceiptExtracted} />{drafts.length > 0 && <DraftEditor drafts={drafts} onChange={updateDraft} onAdd={addManualDraft} onRemove={removeDraft} />}</>}
        {parseMessage && mode !== 'receipt' && <div className="mt-3"><InlineNotice tone={drafts.length ? 'success' : 'warning'}>{parseMessage}</InlineNotice></div>}
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[#edf0ec] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[10px] leading-4 text-[#94a097]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#edf4eb] text-[#53805d]"><Check size={11} /></span>Nothing is saved until you confirm.</div>
        <button type="button" onClick={() => void save()} disabled={!canSave || saving} className="btn-primary min-h-[43px] !rounded-[12px] !px-4 !text-xs">
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={15} />}{saving ? 'Saving…' : `Confirm & save${drafts.length ? ` · ${drafts.length}` : ''}`}
        </button>
      </div>
    </div>
  )
}

export function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const initialFocus = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    window.setTimeout(() => initialFocus.current?.focus(), 20)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey) }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Quick add food" ref={initialFocus} tabIndex={-1}>
        <QuickAddPanel compact onCancel={onClose} onSaved={onClose} />
      </div>
    </div>
  )
}
