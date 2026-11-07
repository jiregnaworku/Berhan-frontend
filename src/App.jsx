import { getRoleByRoute } from './config/roles.js'
import { getAuthenticatedUser } from './features/auth/auth.js'
import AmbassadorDashboard from './modules/ambassador/AmbassadorDashboard.jsx'
import BranchManagerDashboard from './modules/branch-manager/BranchManagerDashboard.jsx'
import BranchEntry from './modules/ambassador/branchentry.jsx'
import { ComputerWorkbookContent } from './modules/ambassador/computerWorkbook.jsx'
import Network from './modules/ambassador/network.jsx'
import Kaspersky from './modules/ambassador/kaspersky.jsx'
import ServiceDeskManagerDashboard from './modules/service-desk-manager/ServiceDeskManagerDashboard.jsx'
import LoginPage from './pages/login page.jsx'

function App() {
  const path = window.location.pathname
  const user = getAuthenticatedUser()
  const role = getRoleByRoute(path)

  if (!role) {
    return <LoginPage />
  }

  if (!user || user.role !== role.id) {
    window.location.replace('/login')
    return null
  }

  if (path === '/dashboard/ambassador/branches') {
    return <BranchEntry username={user.username} />
  }

  if (path === '/dashboard/ambassador/network') {
    return <Network username={user.username} />
  }

  if (path === '/dashboard/ambassador/computer-workbook') {
    return <ComputerWorkbookContent username={user.username} onBack={() => window.location.assign('/dashboard/ambassador')} />
  }

  if (path === '/dashboard/ambassador/kaspersky') {
    return <Kaspersky username={user.username} />
  }

  if (role.id === 'ambassador') {
    return <AmbassadorDashboard username={user.username} />
  }

  if (role.id === 'service-desk-manager') {
    return <ServiceDeskManagerDashboard username={user.username} />
  }

  return <BranchManagerDashboard username={user.username} />
}

export default App
