import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDashboardToast } from './dashboardToast.js'
import { createItRelatedInfo, deleteItRelatedInfo, fetchItRelatedInfos, updateItRelatedInfo } from './itRelatedInfoStore.js'

const emptyCategory = { entryType: 'category', parentId: '', category: '', title: '', description: '', contactName: '', teamPhone: '', officePhone: '' }
const emptyMember = { entryType: 'member', parentId: '', category: '', title: '', description: '', contactName: '', teamPhone: '', officePhone: '' }

function Field({ label, name, value, onChange, type = 'text', required = false, inputMode, pattern }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#52657d]">{label}</span><input name={name} type={type} value={value} onChange={onChange} required={required} inputMode={inputMode} pattern={pattern} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]" /></label>
}

export default function ItRelatedInfoContent({ canManage = false }) {
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
    return categories.map((category) => ({
      ...category,
      members: category.members.filter((member) => [category.title, category.description, category.officePhone, member.title, member.description, member.contactName, member.teamPhone].join(' ').toLowerCase().includes(query)),
    })).filter((category) => [category.title, category.description, category.officePhone].join(' ').toLowerCase().includes(query) || category.members.length > 0)
  }, [categories, search])

  const isCategory = form.entryType === 'category'
  const selectedCategory = categories.find((category) => String(category.id) === String(form.parentId))

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#d7e1e8] pb-5">
        <div><h1 className="text-2xl font-bold text-[#102d54]">IT Related Info</h1><p className="mt-1 text-sm text-[#718096]">IT teams, applications, and contact numbers.</p></div>
        {canManage && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => openCategory()} className="rounded-md bg-[#102d54] px-3 py-2 text-sm font-bold text-white hover:bg-[#1d5b9e]">Add category</button><button type="button" onClick={openNewMember} disabled={categories.length === 0} className="rounded-md border border-[#1d5b9e] px-3 py-2 text-sm font-bold text-[#1d5b9e] hover:bg-[#e8f0fe] disabled:cursor-not-allowed disabled:opacity-50">Add member</button></div>}
      </div>
      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search IT information..." aria-label="Search IT information" className="mb-5 h-10 w-full rounded-md border border-[#d6e0ea] bg-white px-3 text-sm text-[#172b4d] outline-none focus:border-[#1d5b9e]" />
      {isLoading ? <p className="flex items-center gap-2 rounded-lg border border-[#dce4ee] bg-white p-4 text-sm text-[#718096]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading IT information...</p> : filteredCategories.length === 0 ? <p className="rounded-lg border border-[#dce4ee] bg-white p-5 text-sm text-[#718096]">No IT categories have been added yet.</p> : (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <section key={category.id} className="overflow-hidden rounded-md border border-[#d7e1e8] bg-white">
              <div className="flex items-center justify-between gap-3 bg-[#f5f8fa] px-4 py-3">
                <button type="button" onClick={() => setExpandedCategoryId((current) => current === category.id ? null : category.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="text-sm text-[#718096]" aria-hidden="true">{expandedCategoryId === category.id ? '−' : '+'}</span>
                  <h2 className="truncate text-base font-bold text-[#102d54]">{category.title}</h2>
                </button>
                {canManage && <div className="flex shrink-0 gap-3 text-xs font-bold"><button type="button" onClick={() => openMember(category)} className="text-[#1d5b9e] hover:underline">Add member</button><button type="button" onClick={() => openCategory(category)} className="text-[#1d5b9e] hover:underline">Edit</button><button type="button" onClick={() => handleDelete(category.id)} className="text-[#c2413b] hover:underline">Delete</button></div>}
              </div>
              {expandedCategoryId === category.id && <div className="border-t border-[#d7e1e8]"><div className="border-b border-[#edf1f5] px-4 py-3"><p className="text-sm text-[#52657d]">{category.description}</p><p className="mt-2 text-xs text-[#718096]">Office phone: {category.officePhone || 'Not provided'}</p></div>{category.members.length === 0 ? <p className="px-4 py-3 text-sm text-[#718096]">No members added.</p> : <div className="divide-y divide-[#edf1f5]">{category.members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="font-semibold text-[#102d54]">{member.title}</p><p className="text-sm text-[#52657d]">{member.contactName || 'Phone not provided'}</p></div><div className="flex items-center gap-4 text-xs text-[#52657d]"><span>{member.officePhone || category.officePhone || 'No office phone'}</span>{canManage && <div className="flex gap-3 font-bold"><button type="button" onClick={() => openMember(category, member)} className="text-[#1d5b9e] hover:underline">Edit</button><button type="button" onClick={() => handleDelete(member.id)} className="text-[#c2413b] hover:underline">Delete</button></div>}</div></div>)}</div>}</div>}
            </section>
          ))}
        </div>
      )}
      {canManage && isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/40 p-4"><form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.12)]"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-[#102d54]">{editingId ? `Edit ${isCategory ? 'category' : 'member'}` : `Add ${isCategory ? 'category' : 'member'}`}</h2><p className="mt-1 text-xs text-[#718096]">{isCategory ? 'Create a category for an application or support team.' : 'Add a member under the selected category.'}</p></div><button type="button" onClick={() => setIsFormOpen(false)} className="text-2xl font-semibold text-[#718096]" aria-label="Close IT information form">×</button></div><div className="grid gap-4 sm:grid-cols-2">{!isCategory && <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-[#52657d]">Category</span><select name="parentId" value={form.parentId} onChange={handleChange} required className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937]"><option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>}<Field label={isCategory ? 'Category name' : 'Member name'} name="title" value={form.title} onChange={handleChange} required />{!isCategory && <Field label="Phone number" name="contactName" value={form.contactName} onChange={handleChange} type="tel" required inputMode="numeric" pattern="[0-9]+" />}{isCategory ? <><label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-[#52657d]">Category description</span><textarea name="description" value={form.description} onChange={handleChange} required rows="4" className="w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937]" /></label><Field label="Office phone" name="officePhone" value={form.officePhone} onChange={handleChange} type="tel" required /></> : <><label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-[#52657d]">Member description</span><textarea value={selectedCategory?.description || ''} readOnly rows="4" className="w-full rounded-lg border border-[#dce4ee] bg-[#f1f5f9] px-3 py-2 text-sm text-[#52657d]" /></label><div className="sm:col-span-2 rounded-lg border border-[#dce4ee] bg-[#f1f5f9] px-3 py-2.5 text-sm text-[#52657d]"><span className="font-bold">Team phone</span><p className="mt-1">{selectedCategory?.officePhone || 'Select a category to load the office phone.'}</p><span className="mt-2 block font-bold">Office phone</span><p className="mt-1">{selectedCategory?.officePhone || 'Select a category to load the office phone.'}</p></div></>}</div><div className="mt-6 flex gap-3"><button type="submit" disabled={isSaving} className="rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-70">{isSaving ? 'Saving...' : 'Save'}</button><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d]">Cancel</button></div></form></div>}
    </div>
  )
}
