import { useEffect, useState } from 'react'
import { fetchBranches } from '../../modules/ambassador/branchStore.js'

function contact(value) {
  return value || 'Not provided'
}

export default function BranchManagerDirectory() {
  const [branches, setBranches] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBranches()
      .then(setBranches)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <section className="mt-7 overflow-hidden rounded-lg border border-[#e0e7ec] bg-white shadow-[0_3px_10px_rgba(16,45,84,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4eaf0] px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-[#075b78]">All Berhan Bank branches</h2>
          <p className="mt-1 text-[11px] text-[#718096]">Read-only branch contact directory</p>
        </div>
        {!isLoading && <span className="text-[11px] text-[#52657d]">{branches.length} branches</span>}
      </div>
      {error ? (
        <p className="p-4 text-sm text-[#c2413b]" role="alert">{error}</p>
      ) : isLoading ? (
        <p className="flex items-center gap-2 p-4 text-sm text-[#718096]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading branches...</p>
      ) : branches.length === 0 ? (
        <p className="p-4 text-sm text-[#718096]">No branches have been added yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead className="border-b border-[#dfe8ee] bg-[#f4f8fa] text-[10px] uppercase tracking-wide text-[#52657d]">
              <tr><th className="px-4 py-3 font-bold">Branch name</th><th className="px-4 py-3 font-bold">Branch code</th><th className="px-4 py-3 font-bold">Location</th><th className="px-4 py-3 font-bold">Manager</th><th className="px-4 py-3 font-bold">Manager phone</th><th className="px-4 py-3 font-bold">Assistant</th><th className="px-4 py-3 font-bold">Assistant phone</th></tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f5]">
              {branches.map((branch) => (
                <tr key={branch.id} className="text-[#52657d]">
                  <td className="px-4 py-3 font-semibold text-[#102d54]">{contact(branch.branchName)}</td>
                  <td className="px-4 py-3">{contact(branch.branchCode)}</td>
                  <td className="px-4 py-3">{contact(branch.branchLocation)}</td>
                  <td className="px-4 py-3">{contact(branch.managerName)}</td>
                  <td className="px-4 py-3">{contact(branch.managerPhone)}</td>
                  <td className="px-4 py-3">{contact(branch.assistantName)}</td>
                  <td className="px-4 py-3">{contact(branch.assistantMobile)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}