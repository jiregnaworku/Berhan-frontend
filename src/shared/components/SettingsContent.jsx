import { useEffect, useState } from 'react'
import { useDashboardToast } from './dashboardToast.js'
import { fetchProfile, updateProfile } from './settingsStore.js'

const emptyForm = {
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">Account</p>
        <h1 className="text-2xl font-bold text-[#102d54]">Settings</h1>
        <p className="mt-1 text-sm text-[#718096]">Update the email and password for {username}.</p>
      </div>
      <form onSubmit={handleSubmit} className="rounded-xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.05)] sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Email</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} required disabled={isLoading || isSaving} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14] disabled:opacity-70" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Current password <span className="font-normal text-[#718096]">(required to change password)</span></span>
            <input name="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={handleChange} disabled={isSaving} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14] disabled:opacity-70" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[#52657d]">New password</span>
            <input name="newPassword" type="password" autoComplete="new-password" value={form.newPassword} onChange={handleChange} disabled={isSaving} placeholder="At least 8 characters" className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14] disabled:opacity-70" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Confirm new password</span>
            <input name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} disabled={isSaving} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14] disabled:opacity-70" />
          </label>
        </div>
        <button type="submit" disabled={isLoading || isSaving} className="mt-6 rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d5b9e] disabled:cursor-not-allowed disabled:opacity-70">{isSaving ? 'Saving...' : 'Save settings'}</button>
      </form>
    </div>
  )
}
