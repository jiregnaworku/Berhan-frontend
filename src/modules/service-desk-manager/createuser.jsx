import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { createUser, deleteUser, fetchUsers, updateUser } from './userStore.js'

const emptyUser = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: 'ambassador',
  branch_code: '',
  branch_name: '',
  manager_name: '',
  manager_phone: '',
  assistant_name: '',
  assistant_mobile: '',
  ambassador: '',
  backup_ambassador: '',
  backup_ambassador_phone: '',
}

function Field({ label, name, value, onChange, type = 'text', autoComplete, required = true, readOnly = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#52657d]">{label}</span>
      <input name={name} type={type} value={value} onChange={onChange} autoComplete={autoComplete} required={required} readOnly={readOnly} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14] read-only:bg-[#eef4f8]" />
    </label>
  )
}

function roleLabel(role) {
  return role === 'service-desk-manager' ? 'Service desk manager' : role === 'branch-manager' ? 'Branch manager' : 'Ambassador'
}

function generatedUsername(firstName) {
  return firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function CreateUser({ onCreated, username }) {
  const [form, setForm] = useState(emptyUser)
  const [users, setUsers] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    fetchUsers().then(setUsers).finally(() => setIsLoadingUsers(false))
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleRoleChange(event) {
    const role = event.target.value
    setForm({ ...emptyUser, role })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSaving(true)
    try {
      const savedUser = editingUser ? await updateUser(editingUser.id, form) : await createUser(form)
      setUsers((current) => editingUser
        ? current.map((user) => user.id === savedUser.id ? savedUser : user)
        : [savedUser, ...current])
      setForm(emptyUser)
      setEditingUser(null)
      setIsFormOpen(false)
      onCreated?.(savedUser)
      setSuccess(editingUser ? 'User updated successfully.' : 'User created successfully.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (saveError) {
      setError(Object.values(saveError.errors || {}).flat()[0] || saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(user) {
    setEditingUser(user)
    setForm({ ...emptyUser, ...user, first_name: user.first_name || user.name?.split(' ')[0] || '', last_name: user.last_name || user.name?.split(' ').slice(1).join(' ') || '', password: '', password_confirmation: '' })
    setError('')
    setSuccess('')
    setIsFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(user) {
    if (!window.confirm(`Delete ${user.name}?`)) return
    setError('')
    try {
      await deleteUser(user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      setSuccess('User deleted successfully.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  function cancelEdit() {
    setEditingUser(null)
    setForm(emptyUser)
    setError('')
    setSuccess('')
    setIsFormOpen(false)
  }

  function startCreating() {
    setEditingUser(null)
    setForm(emptyUser)
    setError('')
    setSuccess('')
    setIsFormOpen(true)
  }

  // Branch managers are not listed in the table.
  const managedUsers = useMemo(
    () => users.filter((user) => user.username !== username && user.role !== 'branch-manager'),
    [users, username],
  )

  // Build the lowercase searchable text once per user list (not on every keystroke).
  const searchIndex = useMemo(
    () => managedUsers.map((user) => ({
      user,
      text: [
        user.name,
        user.first_name,
        user.last_name,
        user.username,
        user.email,
        user.phone,
        user.branch?.branch_name,
        roleLabel(user.role),
      ]
        .map((value) => String(value ?? ''))
        .join(' ')
        .toLowerCase(),
    })),
    [managedUsers],
  )

  // Keeps typing responsive: the input updates instantly, filtering runs at lower priority.
  const deferredSearch = useDeferredValue(search)

  const filteredUsers = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    return searchIndex
      .filter(({ user, text }) => (roleFilter === 'all' || user.role === roleFilter) && (!query || text.includes(query)))
      .map(({ user }) => user)
  }, [searchIndex, roleFilter, deferredSearch])

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">User administration</p>
        <h1 className="text-2xl font-bold text-[#102d54]">Managed users</h1>
        <p className="mt-1 text-sm text-[#718096]">Create and manage ambassador and manager accounts. New users receive a default password based on their first name.</p>
        </div>
        <button type="button" onClick={startCreating} className="rounded-lg bg-[#102d54] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d5b9e]">Create new user</button>
      </div>
      {error && !isFormOpen && <p className="mb-4 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
      {success && !isFormOpen && <p className="mb-4 rounded-lg border border-[#c6f6d5] bg-[#f0fdfa] p-3 text-sm text-[#065f46]" role="status">{success}</p>}
      {isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/40 p-4">
      <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.12)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#102d54]">{editingUser ? 'Edit user' : 'Create a user'}</h2>
            <p className="mt-1 text-xs text-[#718096]">Create an account and assign its operational role.</p>
          </div>
          <button type="button" onClick={cancelEdit} className="text-sm font-bold text-[#718096] hover:text-[#102d54]">Close</button>
        </div>
        {error && <p className="mb-4 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
        {success && <p className="mb-4 rounded-lg border border-[#c6f6d5] bg-[#f0fdfa] p-3 text-sm text-[#065f46]" role="status">{success}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block col-span-2 sm:col-span-1">
            <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Role</span>
            <select name="role" value={form.role} onChange={handleRoleChange} required className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]">
              {['ambassador', 'service-desk-manager'].map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
            </select>
          </label>
          <>
            <Field label="First name" name="first_name" value={form.first_name} onChange={handleChange} autoComplete="given-name" />
            <Field label="Last name" name="last_name" value={form.last_name} onChange={handleChange} autoComplete="family-name" />
            <Field label="Username" name="username_preview" value={editingUser?.username || generatedUsername(form.first_name)} onChange={() => {}} autoComplete="username" required={false} readOnly />
            {editingUser?.branch?.branch_name && <Field label="Branch" name="branch_preview" value={editingUser.branch.branch_name} onChange={() => {}} required={false} readOnly />}
            <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" autoComplete="email" />
            <Field label="Phone number" name="phone" value={form.phone} onChange={handleChange} autoComplete="tel" />
            <Field label="ID number" name="id_number" value={form.id_number} onChange={handleChange} />
          </>



          {editingUser && <><Field label="New password (optional)" name="password" value={form.password} onChange={handleChange} type="password" autoComplete="new-password" /><Field label="Confirm new password" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} type="password" autoComplete="new-password" /></>}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="submit" disabled={isSaving} className="rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d5b9e] disabled:cursor-not-allowed disabled:opacity-70">{isSaving ? 'Saving...' : editingUser ? 'Save changes' : 'Create user'}</button>
          {editingUser && <button type="button" onClick={cancelEdit} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e]">Cancel</button>}
        </div>
      </form>
      </div>}
      <section className="rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.05)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-bold text-[#102d54]">Created users</h2><p className="mt-1 text-xs text-[#718096]">{filteredUsers.length} of {managedUsers.length} users</p></div>
          <div className="flex flex-wrap gap-2">
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, username..." aria-label="Search users" className="h-9 rounded-lg border border-[#d6e0ea] px-3 text-xs text-[#172b4d] outline-none focus:border-[#1d5b9e]" />
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter users by role" className="h-9 rounded-lg border border-[#d6e0ea] bg-white px-3 text-xs text-[#172b4d] outline-none focus:border-[#1d5b9e]">
              <option value="all">All roles</option>
              <option value="ambassador">Ambassadors</option>
              <option value="service-desk-manager">Service desk managers</option>
            </select>
          </div>
        </div>
        {isLoadingUsers ? <p className="mt-4 flex items-center gap-2 text-sm text-[#718096]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading users...</p> : managedUsers.length === 0 ? <p className="mt-4 text-sm text-[#718096]">No users created yet.</p> : filteredUsers.length === 0 ? <p className="mt-4 text-sm text-[#718096]">No users match your search.</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-[#e5ebf2] text-xs uppercase tracking-wide text-[#718096]"><tr><th className="px-3 py-3 font-bold">Name</th><th className="px-3 py-3 font-bold">Branch</th><th className="px-3 py-3 font-bold">Username</th><th className="px-3 py-3 font-bold">Email</th><th className="px-3 py-3 font-bold">Role</th><th className="px-3 py-3 font-bold">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1f5]">{filteredUsers.map((user) => <tr key={user.id}><td className="px-3 py-3 font-semibold text-[#102d54]">{user.name}</td><td className="px-3 py-3 text-[#52657d]">{user.branch?.branch_name || '—'}</td><td className="px-3 py-3 text-[#52657d]">{user.username}</td><td className="px-3 py-3 text-[#52657d]">{user.email}</td><td className="px-3 py-3 text-[#52657d]">{roleLabel(user.role)}</td><td className="px-3 py-3"><div className="flex gap-3"><button type="button" onClick={() => startEditing(user)} className="font-bold text-[#1d5b9e] hover:underline">Edit</button><button type="button" onClick={() => handleDelete(user)} className="font-bold text-[#c2413b] hover:underline">Delete</button></div></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}