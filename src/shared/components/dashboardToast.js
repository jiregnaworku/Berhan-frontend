import { createContext, useContext } from 'react'

export const DashboardToastContext = createContext({ notify: () => {} })

export function useDashboardToast() {
  return useContext(DashboardToastContext)
}
