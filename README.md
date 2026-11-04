# Berhan Bank Role Dashboard

The frontend is organized by role so each role can grow independently:

- `src/modules/ambassador/` - Ambassador dashboard
- `src/modules/service-desk-manager/` - Service Desk Manager dashboard
- `src/modules/branch-manager/` - Branch Manager dashboard
- `src/shared/` - reusable dashboard UI
- `src/features/auth/` - mock session handling
- `src/config/roles.js` - role definitions and dashboard data

## Mock login

Run the app with `npm run dev`, then use one of these hardcoded mock accounts:

| Role | Username | Password |
| --- | --- | --- |
| Ambassador | `ambassador` | `ambassador123` |
| Service Desk Manager | `service.manager` | `service123` |
| Branch Manager | `branch.manager` | `branch123` |

The authenticated role is stored in `sessionStorage` and only its dashboard route is accessible:

- `/dashboard/ambassador`
- `/dashboard/service-desk-manager`
- `/dashboard/branch-manager`

The mock session can be replaced by a backend authentication service through
the helpers in `src/features/auth/auth.js`.
