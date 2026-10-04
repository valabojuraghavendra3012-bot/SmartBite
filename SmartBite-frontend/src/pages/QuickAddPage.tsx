import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Clock3, Leaf, ScanLine, Sparkles } from 'lucide-react'
import { SectionHeader } from '../components/Common'
import { QuickAddPanel } from '../components/QuickAdd'
import type { FoodItemDraft } from '../types'

const captureSteps = [
  { number: '01', title: 'Capture', text: 'Text, voice or receipt' },
  { number: '02', title: 'Review', text: 'A quick check by you' },
  { number: '03', title: 'Get a nudge', text: 'We’ll watch the date' },
]

export function QuickAddPage() {
  const navigate = useNavigate()
  const onSaved = (_items: FoodItemDraft[]) => navigate('/app/inventory')
  return (
    <div className="animate-in">
      <SectionHeader eyebrow="The quickest thing in your kitchen" title="Quick add" description="Get it in your pantry in a few seconds. SmartBite will take it from here." action={<button onClick={() => navigate(-1)} className="btn-secondary !min-h-[40px] !rounded-[11px] !px-3.5 !py-2 !text-xs"><ArrowLeft size={14} />Back</button>} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,.65fr)]">
        <QuickAddPanel onSaved={onSaved} />
        <aside className="space-y-4">
          <div className="surface overflow-hidden rounded-[21px] p-5 sm:p-6">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#eaf3e9] text-[#48815a]"><Sparkles size={18} /></span><div><p className="eyebrow">No tedious forms</p><h2 className="mt-0.5 font-display text-[16px] font-extrabold tracking-[-.03em] text-[#34493a]">From thought to tracked</h2></div></div>
            <div className="mt-5 space-y-3.5">
              {captureSteps.map((step, index) => <div key={step.number} className="flex items-center gap-3"><span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] text-[10px] font-extrabold ${index === 0 ? 'bg-[#214b3b] text-white' : 'bg-[#f0f4ee] text-[#709078]'}`}>{index === 0 ? <Check size={14} /> : step.number}{index < 2 && <span className="absolute -bottom-4 left-1/2 h-4 w-px bg-[#e4ebe2]" />}</span><div><p className="text-xs font-bold text-[#506156]">{step.title}</p><p className="mt-0.5 text-[10px] text-[#99a39b]">{step.text}</p></div></div>)}
            </div>
          </div>
          <div className="rounded-[21px] bg-[#eaf2e8] p-5 sm:p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/80 text-[#4e7f59]"><Clock3 size={17} /></span><h3 className="mt-3 font-display text-sm font-extrabold tracking-[-.025em] text-[#355340]">A best-by date is plenty.</h3><p className="mt-1.5 text-xs leading-5 text-[#738a76]">You can add quantities and categories now, or let us fill in the obvious bits. Your reminder is the important part.</p><div className="mt-4 flex items-start gap-2 border-t border-[#dbe8d8] pt-3 text-[10px] leading-4 text-[#829481]"><Leaf size={13} className="mt-0.5 shrink-0 text-[#688a69]" />Dates are helpful estimates. If food looks or smells off, trust your judgment.</div>
          </div>
          <div className="flex items-center gap-3 rounded-[18px] border border-[#e6ece4] bg-white p-4"><span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#fff4e0] text-[#aa7c33]"><ScanLine size={17} /></span><div className="flex-1"><p className="text-xs font-bold text-[#4d5f53]">Have a receipt?</p><p className="mt-1 text-[10px] leading-4 text-[#94a097]">Choose “Receipt” and let OCR do the first pass.</p></div><ArrowRight size={15} className="text-[#a0aaa3]" /></div>
        </aside>
      </div>
    </div>
  )
}
