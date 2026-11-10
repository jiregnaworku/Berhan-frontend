import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDashboardToast } from './dashboardToast.js'
import { createItRelatedInfo, deleteItRelatedInfo, fetchItRelatedInfos, updateItRelatedInfo } from './itRelatedInfoStore.js'

const emptyCategory = { entryType: 'category', parentId: '', category: '', title: '', description: '', contactName: '', teamPhone: '', officePhone: '' }
const emptyMember = { entryType: 'member', parentId: '', category: '', title: '', description: '', contactName: '', teamPhone: '', officePhone: '' }

function Field({ label, name, value, onChange, type = 'text', required = false, inputMode, pattern }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#52657d]">{label}</span><input name={name} type={type} value={value} onChange={onChange} required={required} inputMode={inputMode} pattern={pattern} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]" /></label>
}

function Avatar({ text, size = 'md' }) {
  const letter = String(text || '?').trim().charAt(0).toUpperCase() || '?'
  const sizing = size === 'lg' ? 'h-11 w-11 text-base' : 'h-9 w-9 text-sm'
  return <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#102d54] to-[#1d5b9e] font-bold text-white ${sizing}`}>{letter}</span>
}

function Chevron({ open }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-[#718096] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}><path d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z" /></svg>
}

// Splits a description into separate lines (by line break, semicolon, bullet, or sentence end).
function descriptionLines(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return []
  let lines = raw.split(/\r?\n|;|•/).map((line) => line.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean)
  if (lines.length <= 1) lines = raw.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean)
  return lines
}

export default function ItRelatedInfoContent({ canManage = false, hideMembers = false }) {
  const { notify } = useDashboardToast()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyCategory)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedCategoryId, setExpandedCategoryId] = useState(null)

  const loadInfos = useCallback(() => {
    return fetchItRelatedInfos().then(setCategories).catch((error) => notify(error.message)).finally(() => setIsLoading(false))
  }, [notify])

  useEffect(() => {
    loadInfos()
  }, [loadInfos])

  function openCategory(category = null) {
    setEditingId(category?.id || null)
    setForm(category ? { ...emptyCategory, ...category } : emptyCategory)
    setIsFormOpen(true)
  }

  function openMember(category, member = null) {
    setEditingId(member?.id || null)
    setForm(member ? { ...emptyMember, ...member, parentId: category.id } : { ...emptyMember, parentId: category.id })
    setIsFormOpen(true)
  }

  function openNewMember() {
    setEditingId(null)
    setForm(emptyMember)
    setIsFormOpen(true)
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    try {
      const selectedCategory = categories.find((category) => String(category.id) === String(form.parentId))
      const submittedForm = !isCategory && selectedCategory
        ? { ...form, description: selectedCategory.description, teamPhone: selectedCategory.officePhone, officePhone: selectedCategory.officePhone }
        : form
      if (editingId) {
        await updateItRelatedInfo(editingId, submittedForm)
      } else {
        await createItRelatedInfo(submittedForm)
      }
      await loadInfos()
      setIsFormOpen(false)
      notify(editingId ? 'IT information updated successfully.' : 'IT information added successfully.', 'success')
    } catch (saveError) {
      notify(Object.values(saveError.errors || {}).flat()[0] || saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteItRelatedInfo(id)
      await loadInfos()
      notify('IT information deleted successfully.', 'success')
    } catch (deleteError) {
      notify(deleteError.message)
    }
  }

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return categories
    if (hideMembers) return categories.filter((category) => [category.title, category.description, category.officePhone].join(' ').toLowerCase().includes(query))
    return categories.map((category) => ({
      ...category,
      members: category.members.filter((member) => [category.title, category.description, category.officePhone, member.title, member.description, member.contactName, member.teamPhone].join(' ').toLowerCase().includes(query)),
    })).filter((category) => [category.title, category.description, category.officePhone].join(' ').toLowerCase().includes(query) || category.members.length > 0)
  }, [categories, search, hideMembers])

  const isCategory = form.entryType === 'category'
  const selectedCategory = categories.find((category) => String(category.id) === String(form.parentId))

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#d7e1e8] pb-5">
        <div><h1 className="text-2xl font-bold text-[#102d54]">IT Related Info</h1><p className="mt-1 text-sm text-[#718096]">IT teams, applications, and contact numbers.</p></div>
        {canManage && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => openCategory()} className="rounded-lg bg-[#102d54] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#1d5b9e]">Add category</button><button type="button" onClick={openNewMember} disabled={categories.length === 0} className="rounded-lg border border-[#1d5b9e] px-4 py-2 text-sm font-bold text-[#1d5b9e] hover:bg-[#e8f0fe] disabled:cursor-not-allowed disabled:opacity-50">Add member</button></div>}
      </div>
      <div className="relative mb-6">
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718096]"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.48l4.31 4.3a1 1 0 01-1.4 1.42l-4.31-4.31A6 6 0 012 8z" clipRule="evenodd" /></svg>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search IT information..." aria-label="Search IT information" className="h-11 w-full rounded-xl border border-[#d6e0ea] bg-white pl-10 pr-3 text-sm text-[#172b4d] shadow-sm outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]" />
      </div>
      {isLoading ? <p className="flex items-center gap-2 rounded-xl border border-[#dce4ee] bg-white p-4 text-sm text-[#718096]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading IT information...</p> : filteredCategories.length === 0 ? <p className="rounded-xl border border-dashed border-[#c9d6e2] bg-white p-6 text-center text-sm text-[#718096]">No IT categories have been added yet.</p> : (
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const isOpen = expandedCategoryId === category.id
            return (
              <section key={category.id} className={`overflow-hidden rounded-2xl border bg-white transition-shadow ${isOpen ? 'border-[#bcd0e6] shadow-[0_10px_28px_rgba(16,45,84,0.10)]' : 'border-[#e1e8f0] shadow-[0_4px_14px_rgba(16,45,84,0.04)] hover:shadow-[0_8px_22px_rgba(16,45,84,0.08)]'}`}>
                <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5 ${isOpen ? 'bg-[#f3f7fb]' : 'bg-white'}`}>
                  <button type="button" onClick={() => setExpandedCategoryId((current) => current === category.id ? null : category.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar text={category.title} size="lg" />
                    <span className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-bold text-[#102d54]">{category.title}</h2>
                      {!hideMembers && <span className="mt-0.5 inline-block rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[0.68rem] font-bold text-[#1d5b9e]">{category.members.length} {category.members.length === 1 ? 'member' : 'members'}</span>}
                    </span>
                    <Chevron open={isOpen} />
                  </button>
                  {canManage && <div className="flex shrink-0 flex-wrap gap-2 text-xs font-bold"><button type="button" onClick={() => openMember(category)} className="rounded-full border border-[#cfe0f3] px-3 py-1 text-[#1d5b9e] hover:bg-[#e8f0fe]">Add member</button><button type="button" onClick={() => openCategory(category)} className="rounded-full border border-[#cfe0f3] px-3 py-1 text-[#1d5b9e] hover:bg-[#e8f0fe]">Edit</button><button type="button" onClick={() => handleDelete(category.id)} className="rounded-full border border-[#f2c5c2] px-3 py-1 text-[#c2413b] hover:bg-[#fff1f0]">Delete</button></div>}
                </div>
                {isOpen && (
                  <div className="border-t border-[#e1e8f0]">
                    <div className="px-4 py-4 sm:px-5">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#102d54]">Category details</h3>
                      <div className="divide-y divide-[#edf1f5] overflow-hidden rounded-xl border border-[#edf1f5] bg-[#fbfcfe]">
                        <div className="px-4 py-3">
                          <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#e09f1f]">Description</p>
                          <ul className="space-y-1.5">
                            {descriptionLines(category.description).map((line, index) => (
                              <li key={index} className="flex items-start gap-2.5 text-sm leading-snug text-[#344256]"><span aria-hidden="true" className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1d5b9e]" /><span>{line}</span></li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#e09f1f]">Office phone</p>
                          <p className="text-sm font-semibold text-[#102d54]">{category.officePhone || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                    {!hideMembers && (canManage || category.members.length > 0) && <div className="px-4 pb-5 sm:px-5">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#102d54]">Members</h3>
                      {category.members.length === 0 ? <p className="rounded-xl border border-dashed border-[#c9d6e2] px-4 py-3 text-sm text-[#718096]">No members added.</p> : (
                        <ul className="divide-y divide-[#edf1f5] overflow-hidden rounded-xl border border-[#edf1f5]">
                          {category.members.map((member) => (
                            <li key={member.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-white px-4 py-3 hover:bg-[#f8fafc]">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar text={member.title} />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-[#102d54]">{member.title}</p>
                                  <p className="text-xs text-[#52657d]"><span className="font-bold text-[#718096]">Phone:</span> {member.contactName || 'Phone not provided'}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-[#52657d]">
                                <p><span className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#e09f1f]">Office phone</span><span className="mt-0.5 block text-sm text-[#344256]">{member.officePhone || category.officePhone || 'No office phone'}</span></p>
                                {canManage && <div className="flex gap-2 font-bold"><button type="button" onClick={() => openMember(category, member)} className="rounded-full border border-[#cfe0f3] px-3 py-1 text-[#1d5b9e] hover:bg-[#e8f0fe]">Edit</button><button type="button" onClick={() => handleDelete(member.id)} className="rounded-full border border-[#f2c5c2] px-3 py-1 text-[#c2413b] hover:bg-[#fff1f0]">Delete</button></div>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
      {canManage && isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/40 p-4"><form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.12)]"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-[#102d54]">{editingId ? `Edit ${isCategory ? 'category' : 'member'}` : `Add ${isCategory ? 'category' : 'member'}`}</h2><p className="mt-1 text-xs text-[#718096]">{isCategory ? 'Create a category for an application or support team.' : 'Add a member under the selected category.'}</p></div><button type="button" onClick={() => setIsFormOpen(false)} className="text-2xl font-semibold text-[#718096]" aria-label="Close IT information form">×</button></div><div className="grid gap-4 sm:grid-cols-2">{!isCategory && <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-[#52657d]">Category</span><select name="parentId" value={form.parentId} onChange={handleChange} required className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937]"><option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>}<Field label={isCategory ? 'Category name' : 'Member name'} name="title" value={form.title} onChange={handleChange} required />{!isCategory && <Field label="Phone number" name="contactName" value={form.contactName} onChange={handleChange} type="tel" required inputMode="numeric" pattern="[0-9]+" />}{isCategory ? <><label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-[#52657d]">Category description</span><textarea name="description" value={form.description} onChange={handleChange} required rows="4" className="w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937]" /></label><Field label="Office phone" name="officePhone" value={form.officePhone} onChange={handleChange} type="tel" required /></> : <><label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-[#52657d]">Member description</span><textarea value={selectedCategory?.description || ''} readOnly rows="4" className="w-full rounded-lg border border-[#dce4ee] bg-[#f1f5f9] px-3 py-2 text-sm text-[#52657d]" /></label><div className="sm:col-span-2 rounded-lg border border-[#dce4ee] bg-[#f1f5f9] px-3 py-2.5 text-sm text-[#52657d]"><span className="font-bold">Team phone</span><p className="mt-1">{selectedCategory?.officePhone || 'Select a category to load the office phone.'}</p><span className="mt-2 block font-bold">Office phone</span><p className="mt-1">{selectedCategory?.officePhone || 'Select a category to load the office phone.'}</p></div></>}</div><div className="mt-6 flex gap-3"><button type="submit" disabled={isSaving} className="rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-70">{isSaving ? 'Saving...' : 'Save'}</button><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d]">Cancel</button></div></form></div>}
    </div>
  )
}