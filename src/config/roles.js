export const roles = {
  ambassador: {
    id: 'ambassador',
    label: 'Ambassador',
    description: 'Support customers and connect them with the right service.',
    route: '/dashboard/ambassador',
    branchRoute: '/dashboard/ambassador/branches',
    networkRoute: '/dashboard/ambassador/network',
    greeting: 'Your customer service overview',
    stats: [
      { label: 'Customers helped', value: '24', change: '+12% this week' },
      { label: 'Open requests', value: '08', change: '3 need attention' },
      { label: 'Resolved today', value: '16', change: '+4 from yesterday' },
    ],
    activities: [
      'New customer onboarding request assigned',
      'Service request #BRH-1048 was resolved',
      'Branch visit scheduled for tomorrow',
    ],
  },
  'service-desk-manager': {
    id: 'service-desk-manager',
    label: 'Service Desk Manager',
    description: 'Coordinate service desk operations and resolve escalations.',
    route: '/dashboard/service-desk-manager',
    greeting: 'Your service desk overview',
    stats: [
      { label: 'Active tickets', value: '42', change: '8 high priority' },
      { label: 'Average response', value: '18m', change: '-6m this week' },
      { label: 'Resolved today', value: '67', change: '94% within SLA' },
    ],
    activities: [
      'Three high-priority tickets need review',
      'Weekly service desk report is ready',
      'Branch support queue is back within SLA',
    ],
  },
  'branch-manager': {
    id: 'branch-manager',
    label: 'Branch Manager',
    description: 'Monitor branch performance and keep teams aligned.',
    route: '/dashboard/branch-manager',
    greeting: 'Your branch performance overview',
    stats: [
      { label: 'Branch requests', value: '31', change: '5 new today' },
      { label: 'Team members', value: '18', change: 'All teams active' },
      { label: 'Satisfaction', value: '96%', change: '+2.4% this month' },
    ],
    activities: [
      'Branch performance review is due Friday',
      'New service request received from operations',
      'Team schedule has been updated',
    ],
  },
}

export const roleList = Object.values(roles)

export function getRoleByRoute(pathname) {
  return roleList.find(
    (role) => role.route === pathname
      || role.branchRoute === pathname
      || role.networkRoute === pathname,
  )
}
