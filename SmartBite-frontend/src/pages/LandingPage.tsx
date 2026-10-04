import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowDown, ArrowRight, ArrowUpRight, BellRing, Check, ChevronRight, Heart, Leaf, Menu, PackagePlus, ScanLine, Sparkles, Utensils, X,
} from 'lucide-react'
import { BrandMark, CategoryIcon, FoodStatusBadge } from '../components/Common'
import { useAuth } from '../context/AuthContext'
import { IS_DEMO_MODE } from '../services/api'

const features = [
  { icon: PackagePlus, color: 'bg-[#e8f2e6] text-[#427956]', title: 'Quick logging', text: 'Type a thought, speak a sentence or scan a receipt. Your pantry starts taking shape in seconds.' },
  { icon: BellRing, color: 'bg-[#fff3dc] text-[#aa7c32]', title: 'Thoughtful expiry alerts', text: 'A gentle nudge at just the right time helps you use food while it’s still at its best.' },
  { icon: Utensils, color: 'bg-[#fcece5] text-[#bf725e]', title: 'Recipes that use what you have', text: 'Turn the ingredients that need a little love into something worth looking forward to.' },
  { icon: Leaf, color: 'bg-[#eaf1e9] text-[#658567]', title: 'A lighter footprint', text: 'See what you’ve used, shared and saved — small kitchen choices, made visible.' },
]

const steps = [
  { number: '01', title: 'Capture', text: 'Type it, say it, or snap a receipt.' },
  { number: '02', title: 'Parse', text: 'SmartBite picks out names, amounts and dates.' },
  { number: '03', title: 'Confirm', text: 'Give the details a quick once-over.' },
  { number: '04', title: 'Get alerted', text: 'A timely nudge keeps good food in mind.' },
  { number: '05', title: 'Cook or share', text: 'Use it up, pass it on, or compost mindfully.' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const { signInDemo, user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  const openDemo = async () => {
    if (!IS_DEMO_MODE && !user) {
      navigate('/auth')
      return
    }
    if (!user) await signInDemo()
    navigate('/app/dashboard')
  }

  return (
    <div className="overflow-hidden bg-[#f7f8f3] text-[#26392e]">
      <header className="relative z-20 mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link to="/" aria-label="SmartBite home"><BrandMark /></Link>
        <nav className="hidden items-center gap-8 text-[13px] font-semibold text-[#718077] md:flex" aria-label="Main">
          <a href="#how-it-works" onClick={(event) => scrollToSection(event, 'how-it-works')} className="transition hover:text-[#214b3b]">How it works</a><a href="#features" onClick={(event) => scrollToSection(event, 'features')} className="transition hover:text-[#214b3b]">Why SmartBite</a><a href="#impact" onClick={(event) => scrollToSection(event, 'impact')} className="transition hover:text-[#214b3b]">Our impact</a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link to={user ? '/app/dashboard' : '/auth'} className="rounded-xl px-3 py-2 text-[13px] font-bold text-[#5d6b62] hover:bg-[#edf2eb]">{user ? 'My kitchen' : 'Sign in'}</Link>
          <Link to={user ? '/app/dashboard' : '/auth?mode=signup'} className="btn-primary !rounded-[11px] !px-4 !py-2.5 !text-xs">Get started <ArrowUpRight size={14} /></Link>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e3eae1] bg-white text-[#567060] md:hidden" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}>{mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        {mobileMenuOpen && <div className="absolute inset-x-4 top-[66px] z-40 rounded-2xl border border-[#e5ebe3] bg-white p-3 shadow-soft md:hidden">
          <a onClick={(event) => scrollToSection(event, 'how-it-works')} href="#how-it-works" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#5c6f63]">How it works</a><a onClick={(event) => scrollToSection(event, 'features')} href="#features" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#5c6f63]">Why SmartBite</a><a onClick={(event) => scrollToSection(event, 'impact')} href="#impact" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#5c6f63]">Our impact</a><div className="my-2 h-px bg-[#eef1ec]" /><Link to={user ? '/app/dashboard' : '/auth'} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#5c6f63]">{user ? 'My kitchen' : 'Sign in'}</Link><Link to="/auth?mode=signup" className="btn-primary mt-1 w-full !text-xs">Get started <ArrowUpRight size={14} /></Link>
        </div>}
      </header>

      <main>
        <section className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-10 lg:px-10 lg:pb-24 lg:pt-12">
          <div className="pointer-events-none absolute -left-40 top-24 h-[460px] w-[460px] rounded-full bg-[#ecf2e7] opacity-65 blur-3xl" />
          <div className="relative z-10 max-w-[590px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dfe8dc] bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#5c8062]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e7f1e5]"><Leaf size={12} /></span>A kinder kitchen starts here</div>
            <h1 className="font-display text-[42px] font-extrabold leading-[1.08] tracking-[-.065em] text-[#263b2f] sm:text-[55px] lg:text-[61px]">Stop food waste<br className="hidden sm:block" /> before it <span className="relative inline-block text-[#4f8760]">starts.<svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 210 12" fill="none" aria-hidden="true"><path d="M3 8.5C50 2.5 134 1.5 207 7" stroke="#e7bd6f" strokeWidth="4" strokeLinecap="round" /></svg></span></h1>
            <p className="mt-5 max-w-[490px] text-[15px] leading-7 text-[#748178] sm:text-[16px] sm:leading-8">SmartBite keeps tabs on what’s in your kitchen, what needs using, and what you can make next. Less guesswork. More good food.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to={user ? '/app/dashboard' : '/auth?mode=signup'} className="btn-primary min-h-[48px] !rounded-[13px] !px-5 !text-sm">Get started <ArrowRight size={16} /></Link>
              <button onClick={() => void openDemo()} className="btn-secondary min-h-[48px] !rounded-[13px] !px-5 !text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e7f0e5] text-[#477c56]"><ArrowDown size={12} /></span>View demo</button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[#89958c]"><span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#65936b]" />Made for real kitchens</span><span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#65936b]" />No perfect pantry required</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
            <div className="hero-grid absolute -right-8 -top-6 h-[94%] w-[83%] rounded-[40px] opacity-45" />
            <div className="float-soft relative z-10 rounded-[31px] border border-white/80 bg-[#edf2e9] p-3 shadow-[0_28px_80px_rgba(49,79,55,.16)] sm:p-4">
              <div className="overflow-hidden rounded-[23px] border border-[#e5ebe2] bg-white">
                <div className="flex items-center justify-between border-b border-[#f0f2ef] px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-[#e9f2e7] text-[#4b8259]"><Leaf size={16} /></span><span><span className="block text-[12px] font-extrabold text-[#384c3e]">My kitchen</span><span className="block text-[9px] text-[#98a39a]">A little preview</span></span></div>
                  <span className="rounded-full bg-[#f2f6ef] px-2.5 py-1 text-[9px] font-bold text-[#68826a]">TODAY</span>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3"><div><p className="font-display text-[17px] font-extrabold tracking-[-.04em] text-[#34483a]">Use these first</p><p className="mt-1 text-[10px] text-[#97a198]">A gentle heads-up for good food</p></div><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff4dc] text-[#aa7b34]"><BellRing size={15} /></span></div>
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center gap-3 rounded-[14px] border border-[#f0eee3] bg-[#fffdf7] p-3"><CategoryIcon category="dairy" size="sm" /><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#45574a]">Oat milk</p><p className="mt-0.5 text-[10px] text-[#9ba39b]">1 carton · Fridge</p></div><FoodStatusBadge status="expiring_soon" expiresAt={new Date(Date.now() + 86400000).toISOString().slice(0,10)} compact /></div>
                    <div className="flex items-center gap-3 rounded-[14px] border border-[#edf1eb] bg-white p-3"><CategoryIcon category="vegetables" size="sm" /><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#45574a]">Baby spinach</p><p className="mt-0.5 text-[10px] text-[#9ba39b]">1 bag · Crisper</p></div><span className="rounded-full bg-[#eaf4e9] px-2.5 py-1 text-[10px] font-bold text-[#4b8057]">Fresh</span></div>
                  </div>
                  <div className="mt-4 rounded-[14px] bg-[#edf5eb] p-3.5">
                    <div className="flex items-start gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#51815a]"><Sparkles size={15} /></span><div className="flex-1"><p className="text-[11px] font-bold text-[#47664b]">Tonight, made easy</p><p className="mt-1 text-[10px] leading-4 text-[#789079]">Your spinach would be lovely in a 5-minute garlic toast.</p></div><ChevronRight size={14} className="mt-1 text-[#789079]" /></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[#f0f2ef] pt-3"><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#89968d]"><ScanLine size={13} className="text-[#62896b]" />Add from a receipt</span><span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#214b3b] text-white"><ArrowRight size={14} /></span></div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-7 -left-5 z-20 hidden items-center gap-2.5 rounded-[16px] border border-[#e6ece4] bg-white px-3.5 py-3 shadow-soft sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eaf3e9] text-[#4c815a]"><Heart size={15} /></span><span><span className="block text-[10px] font-bold text-[#415448]">Waste less, together</span><span className="block text-[9px] text-[#98a39a]">One mindful meal at a time</span></span></div>
          </div>
        </section>

        <section id="features" className="relative border-y border-[#e9eee6] bg-white/60 py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[620px] text-center"><p className="eyebrow">A calmer way to keep track</p><h2 className="mt-3 font-display text-[30px] font-extrabold leading-tight tracking-[-.055em] text-[#2b4134] sm:text-[38px]">The good stuff, right on time.</h2><p className="mt-3 text-sm leading-6 text-[#829087]">Built for busy households, shared fridges and small cafés — not perfect spreadsheets.</p></div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, color, title, text }, index) => <article key={title} className="group rounded-[20px] border border-[#e9eee7] bg-white p-5 transition-all hover:-translate-y-1 hover:border-[#d5e2d3] hover:shadow-card sm:p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${color}`}><Icon size={20} strokeWidth={1.8} /></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[.1em] text-[#a0aaa2]">0{index + 1}</p><h3 className="mt-1.5 font-display text-[16px] font-extrabold tracking-[-.03em] text-[#34483a]">{title}</h3><p className="mt-2 text-xs leading-5 text-[#87938a]">{text}</p>
              </article>)}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">From fridge to feel-good</p><h2 className="mt-3 max-w-[520px] font-display text-[30px] font-extrabold leading-tight tracking-[-.055em] text-[#2b4134] sm:text-[38px]">Five little steps.<br className="hidden sm:block" /> A lot less going off.</h2></div><p className="max-w-[330px] text-sm leading-6 text-[#829087]">SmartBite takes the admin out of remembering what you already bought.</p></div>
            <div className="mt-9 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {steps.map((step, index) => <div key={step.number} className="relative flex gap-3 rounded-[18px] border border-[#e6ece4] bg-white p-4 sm:block sm:min-h-[167px] sm:p-4.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#eef4eb] font-display text-[11px] font-extrabold text-[#4f805a]">{step.number}</div><div className="sm:mt-4"><h3 className="font-display text-sm font-extrabold tracking-[-.02em] text-[#3d5244]">{step.title}</h3><p className="mt-1.5 text-[11px] leading-5 text-[#89958c]">{step.text}</p></div>{index < steps.length - 1 && <span className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[#e6ece4] bg-[#f7f8f3] text-[#9eaaa0] lg:flex"><ChevronRight size={13} /></span>}
              </div>)}
            </div>
          </div>
        </section>

        <section id="impact" className="relative overflow-hidden bg-[#214b3b] py-16 text-white sm:py-20">
          <div className="absolute -right-32 -top-40 h-[430px] w-[430px] rounded-full border-[72px] border-white/[.035]" /><div className="absolute -bottom-52 -left-20 h-[370px] w-[370px] rounded-full border-[64px] border-white/[.035]" />
          <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
            <div className="grid gap-9 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
              <div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.11em] text-[#c2d9c2]"><Leaf size={12} />The bigger picture</span><h2 className="mt-4 max-w-[440px] font-display text-[31px] font-extrabold leading-[1.13] tracking-[-.055em] sm:text-[39px]">A more thoughtful kitchen can start with one thing.</h2><p className="mt-4 max-w-[410px] text-sm leading-6 text-[#c3d2c6]">The best food-waste plan isn’t a big one. It’s noticing what you have — and giving it a chance to be enjoyed.</p><Link to={user ? '/app/dashboard' : '/auth?mode=signup'} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#e3eedf] px-4 py-3 text-xs font-extrabold text-[#214b3b] transition hover:bg-white">Start with your kitchen <ArrowRight size={14} /></Link></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/10 bg-white/[.07] p-5 sm:p-6"><p className="font-display text-[40px] font-extrabold tracking-[-.06em] text-[#e6f1df] sm:text-[48px]">1.05<span className="text-[23px]">bn</span></p><p className="mt-1 text-sm font-bold text-white">tonnes of food waste</p><p className="mt-2 text-[11px] leading-5 text-[#b9cbbd]">Estimated across households, food service and retail in 2022.</p></div>
                <div className="rounded-[20px] border border-white/10 bg-white/[.07] p-5 sm:p-6"><p className="font-display text-[40px] font-extrabold tracking-[-.06em] text-[#f3cd81] sm:text-[48px]">60<span className="text-[23px]">%</span></p><p className="mt-1 text-sm font-bold text-white">from households</p><p className="mt-2 text-[11px] leading-5 text-[#b9cbbd]">A reminder that small home habits can make a meaningful difference.</p></div>
                <p className="text-[9px] leading-4 text-[#9eb8a3] sm:col-span-2">Global context: UNEP Food Waste Index Report 2024, estimates for 2022. SmartBite’s impact estimates are shown separately and only when supported by your logged data.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-7 rounded-[27px] bg-[#eaf1e7] p-6 sm:p-9 md:flex-row md:items-center">
            <div className="max-w-[540px]"><p className="eyebrow">You don't need a perfect pantry</p><h2 className="mt-3 font-display text-[27px] font-extrabold leading-tight tracking-[-.05em] text-[#2e4436] sm:text-[34px]">Just a little more in the know.</h2><p className="mt-2 text-sm leading-6 text-[#74857a]">Start with what’s already in your fridge. We’ll help with the rest.</p></div><Link to="/auth?mode=signup" className="btn-primary min-h-[47px] !rounded-[13px] !px-5">Get started for free <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#e6ebe4] bg-[#f3f6f0]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-7 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="flex items-center gap-3"><BrandMark /><span className="hidden h-5 w-px bg-[#dce4db] sm:block" /><span className="hidden text-[11px] text-[#87938a] sm:block">A little less waste, a lot more good.</span></div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[#849087]"><a href="#features" onClick={(event) => scrollToSection(event, 'features')} className="hover:text-[#315c42]">Product</a><a href="#how-it-works" onClick={(event) => scrollToSection(event, 'how-it-works')} className="hover:text-[#315c42]">How it works</a><Link to="/auth" className="hover:text-[#315c42]">Sign in</Link><a href="mailto:hello@smartbite.app" className="hover:text-[#315c42]">Say hello</a></div>
          <p className="text-[10px] text-[#a0aaa3]">© {new Date().getFullYear()} SmartBite. Made with care.</p>
        </div>
      </footer>
    </div>
  )
}
