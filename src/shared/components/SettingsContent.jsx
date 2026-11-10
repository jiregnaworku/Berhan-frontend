import { useEffect, useState } from 'react'
import { useDashboardToast } from './dashboardToast.js'
import { fetchProfile, updateProfile } from './settingsStore.js'

const emptyForm = {
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const inputClass = 'min-h-11 w-full rounded-xl border border-[#dce4ee] bg-[#fbfcfe] px-3.5 py-2 text-sm text-[#1f2937] outline-none transition focus:border-[#1d5b9e] focus:bg-white focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14] disabled:opacity-70'

function SectionCard({ icon, title, description, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e1e8f0] bg-white shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
      <div className="flex items-start gap-3 border-b border-[#e8eef5] bg-[#f6f9fc] px-5 py-4 sm:px-6">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#1d5b9e]">{icon}</span>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#102d54]">{title}</h2>
          <p className="mt-0.5 text-xs text-[#718096]">{description}</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

function MailIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path d="M2.5 5.5A1.5 1.5 0 014 4h12a1.5 1.5 0 011.5 1.5v.4l-7.5 4.5-7.5-4.5v-.4z" /><path d="M2.5 8.1V14.5A1.5 1.5 0 004 16h12a1.5 1.5 0 001.5-1.5V8.1l-7.1 4.26a.8.8 0 01-.8 0L2.5 8.1z" /></svg>
}

function LockIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5.5A1.5 1.5 0 004 9.5v6A1.5 1.5 0 005.5 17h9a1.5 1.5 0 001.5-1.5v-6A1.5 1.5 0 0014.5 8H14V6a4 4 0 00-4-4zm2.5 6V6a2.5 2.5 0 00-5 0v2h5z" clipRule="evenodd" /></svg>
}

export default function SettingsContent({ username }) {
  const { notify } = useDashboardToast()
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
      .then((profile) => setForm((current) => ({ ...current, email: profile.email || '' })))
      .catch((error) => notify(error.message))
      .finally(() => setIsLoading(false))
  }, [notify])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await updateProfile(form)
      setForm((current) => ({ ...current, currentPassword: '', newPassword: '', confirmPassword: '' }))
      notify('Settings saved successfully.', 'success')
    } catch (saveError) {
      notify(Object.values(saveError.errors || {}).flat()[0] || saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const initial = String(username || '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">Account</p>
        <h1 className="text-2xl font-bold text-[#102d54]">Settings</h1>
        <p className="mt-1 text-sm text-[#718096]">Update the email and password for {username}.</p>
      </div>

      <div className="mb-6 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#102d54] to-[#1d5b9e] p-5 text-white shadow-[0_10px_28px_rgba(16,45,84,0.18)]">
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold ring-1 ring-white/25">{initial}</span>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#f5c46b]">Username</p>
          <p className="truncate text-lg font-bold">{username}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard icon={<MailIcon />} title="Email" description="The email address linked to your account.">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Email</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} required disabled={isLoading || isSaving} className={inputClass} />
          </label>
        </SectionCard>

        <SectionCard icon={<LockIcon />} title="Password" description="Enter your current password to set a new one.">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Current password <span className="font-normal text-[#718096]">(required to change password)</span></span>
              <input name="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={handleChange} disabled={isSaving} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-[#52657d]">New password</span>
              <input name="newPassword" type="password" autoComplete="new-password" value={form.newPassword} onChange={handleChange} disabled={isSaving} placeholder="At least 8 characters" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Confirm new password</span>
              <input name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} disabled={isSaving} className={inputClass} />
            </label>
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <button type="submit" disabled={isLoading || isSaving} className="rounded-xl bg-[#102d54] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#1d5b9e] disabled:cursor-not-allowed disabled:opacity-70">{isSaving ? 'Saving...' : 'Save settings'}</button>
        </div>
      </form>
    </div>
  )
}