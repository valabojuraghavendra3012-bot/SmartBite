import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Leaf, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { BrandMark } from '../components/Common'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { IS_DEMO_MODE } from '../services/api'

type AuthMode = 'login' | 'signup' | 'forgot'

export function AuthPage() {
  const { user, signIn, signUp, resetPassword, signInDemo } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const modeParam = searchParams.get('mode')
  const mode: AuthMode = modeParam === 'signup' ? 'signup' : modeParam === 'forgot' ? 'forgot' : 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)

  if (user) return <Navigate to="/app/dashboard" replace />

  const setMode = (next: AuthMode) => {
    setError('')
    setSuccess('')
    setNeedsEmailConfirm(false)
    if (next === 'login') setSearchParams({})
    else setSearchParams({ mode: next === 'signup' ? 'signup' : 'forgot' })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'forgot') {
        await resetPassword(email)
        setSuccess(isSupabaseConfigured ? 'If there’s an account for that address, a reset link is on its way.' : 'Password reset is a demo-only flow here. Connect Supabase to send a real reset email.')
      } else if (mode === 'signup') {
        await signUp(email, password, fullName)
        if (isSupabaseConfigured) {
          setNeedsEmailConfirm(true)
          setSuccess('Check your inbox for a confirmation link. Your kitchen will be ready as soon as you confirm.')
        } else {
          navigate('/app/dashboard')
        }
      } else {
        await signIn(email, password)
        const next = searchParams.get('next')
        navigate(next?.startsWith('/app') ? next : '/app/dashboard')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  const handleDemo = async () => {
    setLoading(true)
    setError('')
    try { await signInDemo(); navigate('/app/dashboard') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Couldn’t open the demo workspace.') }
    finally { setLoading(false) }
  }

  return (
    <main className="grid min-h-screen bg-[#fcfdfb] lg:grid-cols-[.95fr_1.05fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#214b3b] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute -right-24 top-[18%] h-[420px] w-[420px] rounded-full border-[70px] border-white/[.035]" /><div className="absolute -bottom-[210px] -left-[100px] h-[480px] w-[480px] rounded-full border-[80px] border-white/[.035]" />
        <Link to="/"><BrandMark inverse /></Link>
        <div className="relative z-10 max-w-[460px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#cadbc9]"><Leaf size={12} />Make room for good food</span>
          <h1 className="mt-5 font-display text-[42px] font-extrabold leading-[1.12] tracking-[-.06em] xl:text-[50px]">Your kitchen,<br />a little more <span className="text-[#b6d0ad]">in sync.</span></h1>
          <p className="mt-4 max-w-[370px] text-sm leading-7 text-[#c1d2c4]">A gentle reminder. One less forgotten ingredient. A meal made from what you already have.</p>
          <div className="mt-8 grid max-w-[390px] grid-cols-2 gap-2.5">
            {['Know what you have', 'Catch food in time', 'Find ideas for dinner', 'Share what you can'].map((value) => <div key={value} className="flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/[.055] px-3 py-3 text-[11px] font-semibold text-[#e0e9df]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#91b08a]/20 text-[#c5dfbd]"><ShieldCheck size={12} /></span>{value}</div>)}
          </div>
        </div>
        <p className="relative z-10 text-[10px] font-medium text-[#a4bcaa]">Less waste is a habit, not a perfect score.</p>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between lg:justify-end"><Link to="/" className="lg:hidden"><BrandMark /></Link><Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#809087] transition hover:text-[#355c42]"><ArrowLeft size={14} />Back to home</Link></div>
        <div className="mx-auto flex w-full max-w-[410px] flex-1 flex-col justify-center py-10">
          <div className="mb-7 lg:hidden"><div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#eaf3e9] text-[#3b7853]"><Leaf size={22} /></div></div>
          <p className="eyebrow">{mode === 'signup' ? 'A fresh start' : mode === 'forgot' ? 'No worries' : 'Welcome back'}</p>
          <h2 className="mt-2 font-display text-[30px] font-extrabold tracking-[-.055em] text-[#2c4235]">{mode === 'signup' ? 'Make yourself at home.' : mode === 'forgot' ? 'Let’s get you back in.' : 'Come on in.'}</h2>
          <p className="mt-2 text-sm leading-6 text-[#849087]">{mode === 'signup' ? 'A more mindful kitchen is just a few details away.' : mode === 'forgot' ? 'Share your email and we’ll send a reset link.' : 'Your food, reminders and small wins are right here.'}</p>

          {success && <div className="mt-5 rounded-xl border border-[#d8e8d7] bg-[#f2f8f1] px-3.5 py-3 text-xs leading-5 text-[#4e7655]">{success}</div>}
          {error && <div className="mt-5 rounded-xl border border-[#f1d6d0] bg-[#fff5f2] px-3.5 py-3 text-xs leading-5 text-[#a55c4d]" role="alert">{error}</div>}

          {!needsEmailConfirm && <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            {mode === 'signup' && <div><label className="field-label" htmlFor="fullName">Your name</label><div className="relative"><input className="field !pl-10" id="fullName" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Alex Morgan" required /><Sparkles size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a2aea3]" /></div></div>}
            <div><label className="field-label" htmlFor="email">Email address</label><div className="relative"><input className="field !pl-10" id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /><Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a2aea3]" /></div></div>
            {mode !== 'forgot' && <div><div className="mb-1.5 flex items-center justify-between"><label className="field-label !mb-0" htmlFor="password">Password</label>{mode === 'login' && <button type="button" onClick={() => setMode('forgot')} className="text-[10px] font-bold text-[#548062] hover:text-[#214b3b]">Forgot password?</button>}</div><div className="relative"><input className="field !pl-10 !pr-11" id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} minLength={mode === 'signup' ? 8 : undefined} required /><LockKeyhole size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a2aea3]" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#95a098] hover:bg-[#f3f6f2]"><span className="sr-only">{showPassword ? 'Hide' : 'Show'}</span>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>{mode === 'signup' && <p className="mt-1.5 text-[10px] text-[#9ba59e]">Use 8 or more characters.</p>}</div>}
            <button type="submit" disabled={loading} className="btn-primary min-h-[47px] w-full !rounded-[12px] !text-sm">{loading ? 'One moment…' : mode === 'signup' ? 'Create my account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'} {!loading && <ArrowRight size={15} />}</button>
          </form>}

          {!isSupabaseConfigured && mode === 'login' && <>
            <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-[#e9ede8]" /><span className="text-[10px] font-bold uppercase tracking-[.08em] text-[#a2aaa4]">or take a look</span><span className="h-px flex-1 bg-[#e9ede8]" /></div>
            <button onClick={() => void handleDemo()} disabled={loading} className="btn-secondary min-h-[46px] w-full !rounded-[12px] !text-sm"><Leaf size={15} className="text-[#528361]" />Explore the demo kitchen</button>
            <p className="mt-3 text-center text-[10px] leading-4 text-[#9ca69f]">No account needed. Demo items stay in this browser only.</p>
          </>}

          <div className="mt-6 text-center text-xs text-[#89948c]">
            {mode === 'signup' ? <>Already have a kitchen here? <button onClick={() => setMode('login')} className="font-bold text-[#3f7651] hover:text-[#214b3b]">Sign in</button></> : mode === 'forgot' ? <button onClick={() => setMode('login')} className="inline-flex items-center gap-1 font-bold text-[#3f7651] hover:text-[#214b3b]">Return to sign in <ArrowRight size={12} /></button> : <>New to SmartBite? <button onClick={() => setMode('signup')} className="font-bold text-[#3f7651] hover:text-[#214b3b]">Create an account</button></>}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#eef1ed] py-4 text-[10px] text-[#9aa49d]"><span>By continuing, you agree to our friendly little terms.</span>{IS_DEMO_MODE && <span className="hidden items-center gap-1 sm:inline-flex"><Leaf size={11} />Local demo</span>}</div>
      </section>
    </main>
  )
}
