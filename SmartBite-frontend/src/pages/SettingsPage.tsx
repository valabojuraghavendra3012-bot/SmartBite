import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Check, ChevronRight, CircleHelp, Laptop, Leaf, LogOut, Mail, Package, Save, Settings2, ShieldCheck, UserRound } from 'lucide-react'
import type { AppSettings, NotificationPreferences } from '../types'
import { api, defaultSettings, IS_DEMO_MODE } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ErrorState, LoadingState, SectionHeader } from '../components/Common'

function PreferenceToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[14px] border border-[#edf0ec] bg-[#fcfdfb] px-3.5 py-3"><span><span className="block text-xs font-bold text-[#52645a]">{label}</span><span className="mt-1 block text-[10px] leading-4 text-[#96a098]">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" /><span className={`relative h-[23px] w-[41px] shrink-0 rounded-full transition-colors ${checked ? 'bg-[#3f7956]' : 'bg-[#dce3db]'}`}><span className={`absolute top-[3px] h-[17px] w-[17px] rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} /></span></label>
}

export function SettingsPage() {
  const { user, updateProfile, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState('')

  useEffect(() => {
    setFullName(user?.fullName ?? '')
  }, [user?.fullName])

  useEffect(() => {
    let active = true
    api.getSettings().then((result) => { if (active) setSettings({ ...defaultSettings, ...result, notificationPreferences: { ...defaultSettings.notificationPreferences, ...result.notificationPreferences } }) })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load your preferences.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.smartbiteTheme = settings.theme
    return () => { delete document.documentElement.dataset.smartbiteTheme }
  }, [settings.theme])

  const updateNotification = (key: keyof NotificationPreferences, value: boolean | number) => setSettings((current) => ({ ...current, notificationPreferences: { ...current.notificationPreferences, [key]: value } }))
  const saveSettings = async () => {
    setSavingSettings(true)
    setError('')
    try { const saved = await api.saveSettings(settings); setSettings(saved); setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })); toast('Preferences saved', 'success') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your preferences.') }
    finally { setSavingSettings(false) }
  }
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavingProfile(true)
    try { await updateProfile({ fullName }); toast('Profile updated', 'success') }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Could not update your profile.', 'error') }
    finally { setSavingProfile(false) }
  }
  const doSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (loading) return <LoadingState label="Loading your preferences…" />
  return (
    <div className="animate-in">
      <SectionHeader eyebrow="Make SmartBite yours" title="Settings" description="A few details to make your kitchen feel like home." />
      {error && <div className="mb-5"><ErrorState message={error} onRetry={() => { setError(''); void api.getSettings().then(setSettings).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not reload settings.')) }} /></div>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-4">
          <section className="surface rounded-[21px] p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#eaf3e9] text-[#47815a]"><UserRound size={18} /></span><div><p className="eyebrow">The person behind the pantry</p><h2 className="mt-1 font-display text-[17px] font-extrabold tracking-[-.035em] text-[#34483a]">Profile</h2></div></div>
            <form onSubmit={(event) => void saveProfile(event)} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div><label className="field-label" htmlFor="profile-name">Your name</label><input id="profile-name" className="field" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="What should we call you?" /></div>
              <div><label className="field-label" htmlFor="profile-email">Email address</label><div className="relative"><input id="profile-email" className="field !bg-[#f7f9f6] !pr-10 !text-[#839087]" value={user?.email ?? ''} readOnly /><Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a2aaa3]" /></div></div>
              <button className="btn-secondary !min-h-[44px] !rounded-[11px] !px-3.5 !py-2 !text-xs" type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : <><Save size={13} />Save profile</>}</button>
            </form>
          </section>

          <section className="surface rounded-[21px] p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#fff4df] text-[#a97c34]"><Bell size={18} /></span><div><p className="eyebrow">Only the useful nudges</p><h2 className="mt-1 font-display text-[17px] font-extrabold tracking-[-.035em] text-[#34483a]">Notifications</h2></div></div>
            <div className="space-y-2.5">
              <PreferenceToggle label="Expiry alerts" description="A reminder when food is getting close to its date." checked={settings.notificationPreferences.pushEnabled} onChange={(value) => updateNotification('pushEnabled', value)} />
              <PreferenceToggle label="Email reminders" description="Send important kitchen alerts to your inbox." checked={settings.notificationPreferences.emailEnabled} onChange={(value) => updateNotification('emailEnabled', value)} />
              <PreferenceToggle label="Daily kitchen digest" description="A once-a-day summary of what could use your attention." checked={settings.notificationPreferences.dailyDigest} onChange={(value) => updateNotification('dailyDigest', value)} />
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-[14px] bg-[#f7f9f6] p-3.5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-[#55675b]">Remind me before</p><p className="mt-1 text-[10px] text-[#99a39b]">How early an item should appear in your expiry alerts.</p></div><select className="field !min-h-[38px] !w-full !rounded-[10px] !py-2 !text-xs sm:!w-[145px]" value={settings.notificationPreferences.alertDaysBefore} onChange={(event) => updateNotification('alertDaysBefore', Number(event.target.value))}><option value={1}>1 day before</option><option value={2}>2 days before</option><option value={3}>3 days before</option><option value={5}>5 days before</option><option value={7}>1 week before</option></select></div>
          </section>

          <section className="surface rounded-[21px] p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#f1f1e8] text-[#817c50]"><Package size={18} /></span><div><p className="eyebrow">A few helpful defaults</p><h2 className="mt-1 font-display text-[17px] font-extrabold tracking-[-.035em] text-[#34483a]">Kitchen preferences</h2></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label" htmlFor="default-unit">Default measurement</label><select id="default-unit" className="field !text-xs" value={settings.defaultUnit} onChange={(event) => setSettings((current) => ({ ...current, defaultUnit: event.target.value as AppSettings['defaultUnit'] }))}><option value="items">Items / packs</option><option value="grams">Grams</option><option value="kilograms">Kilograms</option><option value="cups">Cups</option></select></div><div><label className="field-label" htmlFor="storage-location">Default storage spot</label><input id="storage-location" className="field !text-xs" value={settings.defaultStorageLocation} onChange={(event) => setSettings((current) => ({ ...current, defaultStorageLocation: event.target.value }))} placeholder="Fridge" /></div></div>
            <div className="mt-4 border-t border-[#eff2ee] pt-4"><p className="field-label">Theme</p><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setSettings((current) => ({ ...current, theme: 'light' }))} className={`flex items-center gap-3 rounded-[13px] border px-3.5 py-3 text-left ${settings.theme === 'light' ? 'border-[#b8d0b8] bg-[#f1f7f0]' : 'border-[#e8ede6] bg-white'}`}><span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-[#58805e]"><Check size={15} /></span><span><span className="block text-xs font-bold text-[#52645a]">Light</span><span className="mt-0.5 block text-[10px] text-[#9aa49d]">Soft, easy-on-the-eyes green</span></span></button><button type="button" onClick={() => setSettings((current) => ({ ...current, theme: 'system' }))} className={`flex items-center gap-3 rounded-[13px] border px-3.5 py-3 text-left ${settings.theme === 'system' ? 'border-[#b8d0b8] bg-[#f1f7f0]' : 'border-[#e8ede6] bg-white'}`}><span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#f1f3f0] text-[#69776e]"><Laptop size={15} /></span><span><span className="block text-xs font-bold text-[#52645a]">System</span><span className="mt-0.5 block text-[10px] text-[#9aa49d]">Follow your device preference</span></span></button></div></div>
            <div className="mt-5 flex flex-col gap-2 border-t border-[#eff2ee] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] text-[#a0aaa3]">{savedAt ? `Last saved at ${savedAt}` : 'Changes are saved when you choose Save preferences.'}</p><button onClick={() => void saveSettings()} disabled={savingSettings} className="btn-primary !min-h-[42px] !rounded-[11px] !px-4 !py-2 !text-xs">{savingSettings ? 'Saving…' : <><Save size={13} />Save preferences</>}</button></div>
          </section>
        </div>

        <aside className="space-y-3">
          <div className="rounded-[20px] bg-[#eaf2e8] p-5"><span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/80 text-[#4e8059]"><ShieldCheck size={17} /></span><h3 className="mt-3 font-display text-[15px] font-extrabold tracking-[-.03em] text-[#385640]">Your kitchen is yours.</h3><p className="mt-1.5 text-xs leading-5 text-[#758a77]">Your pantry details are connected to your account. SmartBite uses them to power reminders and recipe ideas.</p></div>
          <div className="surface rounded-[20px] p-5"><p className="eyebrow">Account</p><h3 className="mt-1 font-display text-[15px] font-extrabold tracking-[-.03em] text-[#3d5143]">Sign-in details</h3><div className="mt-3 flex items-center gap-2 rounded-[12px] bg-[#f7f9f6] p-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#62806a]"><UserRound size={14} /></span><div className="min-w-0"><p className="truncate text-xs font-bold text-[#59695e]">{user?.fullName || 'Your account'}</p><p className="truncate text-[10px] text-[#9aa49d]">{user?.email}</p></div></div><button onClick={() => void doSignOut()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-xs font-bold text-[#8b706a] hover:bg-[#fff3ef]"><LogOut size={14} />Sign out</button></div>
          {IS_DEMO_MODE && <div className="rounded-[18px] border border-[#e6ece3] bg-white p-4"><p className="flex items-center gap-2 text-xs font-bold text-[#586a5d]"><Leaf size={14} className="text-[#56815d]" />Demo workspace</p><p className="mt-1.5 text-[10px] leading-4 text-[#99a39b]">Demo data is saved in this browser only. Connect Supabase and the FastAPI service for a shared account.</p></div>}
          <Link to="/app/analytics" className="flex items-center justify-between rounded-[16px] border border-[#e7ece5] bg-white px-4 py-3.5 text-xs font-bold text-[#66806b] hover:border-[#cddbcf]"><span className="flex items-center gap-2"><Settings2 size={15} />View kitchen activity</span><ChevronRight size={15} /></Link>
          <Link to="mailto:hello@smartbite.app" className="flex items-center justify-between rounded-[16px] border border-[#e7ece5] bg-white px-4 py-3.5 text-xs font-bold text-[#849087] hover:border-[#cddbcf]"><span className="flex items-center gap-2"><CircleHelp size={15} />Need a hand?</span><ChevronRight size={15} /></Link>
        </aside>
      </div>
    </div>
  )
}
