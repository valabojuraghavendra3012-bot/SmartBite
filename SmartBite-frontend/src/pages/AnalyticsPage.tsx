import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CircleHelp, HeartHandshake, Leaf, Recycle, Sprout, Utensils } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardStats } from '../types'
import { api } from '../services/api'
import { useAppData } from '../context/AppDataContext'
import { SectionHeader, StatCard, ErrorState, LoadingState, EmptyState } from '../components/Common'

export function AnalyticsPage() {
  const { stats: dashboardStats } = useAppData()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try { setStats(await api.getAnalytics()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load impact details.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const value = stats ?? dashboardStats
  const chartData = useMemo(() => value?.monthlyWasteTrend ?? [], [value])
  const hasActivity = Boolean(value && (value.itemsConsumed + value.itemsDonated + value.itemsComposted + value.itemsExpired > 0))

  return (
    <div className="animate-in">
      <SectionHeader eyebrow="Small choices, made visible" title="Your impact" description="A transparent look at the food you’ve used, shared and composted. Estimates are only shown when your data supports them." />
      {error && <div className="mb-5"><ErrorState message={error} onRetry={() => void load()} /></div>}
      {loading && !value ? <LoadingState label="Adding up your kitchen activity…" /> : <>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Items used" value={value?.itemsConsumed ?? 0} detail="logged" icon={Utensils} iconTone="green" />
          <StatCard label="Items donated" value={value?.itemsDonated ?? 0} detail="shared" icon={HeartHandshake} iconTone="yellow" />
          <StatCard label="Items composted" value={value?.itemsComposted ?? 0} detail="returned to earth" icon={Recycle} iconTone="green" />
          <StatCard label="Items expired" value={value?.itemsExpired ?? 0} detail="logged" icon={Leaf} iconTone="coral" />
          <StatCard label="Waste prevented" value={value?.estimatedWastePreventedKg == null ? '—' : value.estimatedWastePreventedKg.toFixed(1)} detail="kg estimated" icon={Sprout} iconTone="blue" footer={value?.estimatedWastePreventedKg == null ? 'Estimate appears when weight data is available' : 'Estimate based on recorded weights'} />
        </div>

        <section className="surface rounded-[21px] p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow">Your kitchen over time</p><h2 className="mt-1 font-display text-lg font-extrabold tracking-[-.04em] text-[#304638]">Monthly food journey</h2><p className="mt-1 text-xs text-[#8a968e]">Counts come from the actions you log. Nothing is estimated here.</p></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f4f7f2] px-2.5 py-1.5 text-[10px] font-bold text-[#829087]"><BarChart3 size={12} />Last 6 months</span></div>
          {loading ? <div className="mt-5 h-[270px] animate-pulse rounded-[16px] bg-[#f6f8f4]" /> : hasActivity && chartData.length > 0 ? <div className="chart-grid mt-5 h-[270px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 2, left: -20, bottom: 0 }} barGap={5}>
            <CartesianGrid vertical={false} strokeDasharray="4 5" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={11} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tickMargin={8} />
            <Tooltip cursor={{ fill: '#f6f8f4' }} contentStyle={{ border: '1px solid #e7ece5', borderRadius: 12, boxShadow: '0 10px 24px rgba(35,62,47,.08)', fontSize: 12 }} />
            <Legend verticalAlign="top" align="right" height={32} iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: '#758279' }} />
            <Bar dataKey="used" name="Used" stackId="a" fill="#579269" radius={[0, 0, 0, 0]} maxBarSize={27} />
            <Bar dataKey="donated" name="Donated" stackId="a" fill="#e5b65f" maxBarSize={27} />
            <Bar dataKey="composted" name="Composted" stackId="a" fill="#8e9f74" maxBarSize={27} />
            <Bar dataKey="expired" name="Expired" stackId="a" fill="#dc917c" radius={[5, 5, 0, 0]} maxBarSize={27} />
          </BarChart></ResponsiveContainer></div> : <div className="mt-5"><EmptyState icon={BarChart3} title="Your story starts with the next thing you log" description="Mark an item as used, donated or composted and we'll build your monthly view from those real actions." illustration="leaf" /></div>}
        </section>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[20px] bg-[#eaf2e8] p-5 sm:p-6"><span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/80 text-[#52825a]"><Sprout size={17} /></span><h3 className="mt-3 font-display text-[15px] font-extrabold tracking-[-.03em] text-[#385640]">About your estimate</h3><p className="mt-1.5 text-xs leading-5 text-[#758a77]">Food-waste prevention is shown as an estimate only when your item weights are available from your API. Your logged item counts are always shown separately.</p></div>
          <div className="rounded-[20px] border border-[#e6ece4] bg-white p-5 sm:p-6"><span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#f5f3e9] text-[#8a8050]"><CircleHelp size={17} /></span><h3 className="mt-3 font-display text-[15px] font-extrabold tracking-[-.03em] text-[#45584b]">What counts here?</h3><p className="mt-1.5 text-xs leading-5 text-[#89958d]">Only actions you log in SmartBite. Donating and composting are tracked separately from food you used at home.</p></div>
        </div>
      </>}
    </div>
  )
}
