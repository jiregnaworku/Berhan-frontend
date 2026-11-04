import { DashboardContent } from '../../shared/components/DashboardLayout.jsx'

function BranchManagerDashboard({ username }) {
  return <DashboardContent roleId="branch-manager" username={username} />
}

export default BranchManagerDashboard
