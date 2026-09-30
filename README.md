# Leira admin

A standalone React + Vite + TypeScript web app. Deploy this project independently; NestJS only serves the API. The mobile app is unchanged.

## Run locally

Requires Node 22.12+ (tested on Node 24).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:5173. Set `VITE_API_URL` to your backend base URL including `/api/v1`. For local design review, `VITE_ENABLE_DEMO=true` adds admin and support preview buttons. Preview uses synthetic data, never authenticates, and never saves changes. Disable it for production.

## Stack and structure

- React Router handles page navigation and frontend role gates.
- TanStack Query handles server data, cancellation, cache invalidation and errors.
- React Hook Form + Zod handle validated forms.
- Tailwind CSS v4 and locally owned shadcn/ui components built on Radix provide accessible controls and dialogs. `components.json` supports adding more shadcn components.
- `src/pages`: overview/analytics, members, support, health tips, staff access, audit.
- `src/lib`: API contracts, authentication, queries, and isolated sample data.

## Authentication and permissions

Uses existing NestJS `/auth/login`, `/auth/verify-2fa`, `/auth/resend-2fa-otp`, `/users/me`, and `/auth/logout`. Access tokens live only in memory; refreshing the browser requires signing in again. No member data or credentials are written to browser storage.

| Capability | Admin | Support |
|---|---|---|
| Member account directory | Read/edit/activate/deactivate | Read limited account details |
| Support cases | Read/update status, priority, resolution | Same |
| Health tips | Draft/edit/publish/archive | Read only |
| Analytics | Community, content, support | Support only |
| Staff permissions | Grant/change support or grant admin | No access |
| Audit trail | Read | No access |

All permissions are enforced by the backend, independently of the interface. The member directory excludes clinical records, demographics and authentication fields. Case resolution notes are visible to the member. The dashboard does not send emails or push notifications when updating cases.

Staff access is granted to existing active, email-verified Leira accounts. Entering an email with no Leira account sends that person a single-use invitation (valid 7 days by default). The link opens `/accept-invite`, where they create their account with the invited role, then sign in normally. Re-inviting an email replaces the earlier link. The backend needs `ADMIN_APP_URL` set to this app's public origin to send invitations. Existing administrators and your own account cannot have their roles changed here, preventing accidental lockout. New administrator grants require deliberate selection of the administrator role. Initial admin provisioning uses the backend's existing operator/seeder workflow; this app does not create a default admin or ship credentials.

## Deploy separately

1. Deploy the accompanying NestJS changes first. Dashboard mutations require MongoDB transactions: use Atlas or a replica set, including for local development. A standalone MongoDB server can serve reads but cannot commit these audited mutations.
2. Set backend `CORS_ORIGINS` to comma-separated allowed frontend origins (include any existing web client origins). Example: `https://admin.example.com,http://127.0.0.1:5173`. Native mobile clients do not need CORS origins. If unset, existing backend CORS behavior is preserved.
3. Set build environment `VITE_API_URL=https://your-api.example.com/api/v1` and `VITE_ENABLE_DEMO=false`. Vite variables are public and compiled at build time. Never put secrets in them.
4. Run `npm ci && npm run build`. Publish only `dist/` on your web host.
5. Configure SPA fallback to `/index.html`. Netlify/Cloudflare-style `_redirects` and a Vercel rewrite configuration are included. No backend static hosting is configured.
6. Use HTTPS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `X-Frame-Options: DENY` on your host. Configure CSP for your actual API origin: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://your-api.example.com; frame-ancestors 'none'; base-uri 'self'`. Radix uses inline styles for accessible dialog positioning.

Health content uses the existing health-tip collection and feed. Audit entries cover mutations made through `/admin` only; existing legacy API mutation routes are not retroactively audited. The audit stores actor, action, resource identifier, and changed field names, not previous/new sensitive values.

## Verification

```sh
npm run build
npm run lint
npm test
```

Tests cover guarded navigation, member search/pagination, support content restrictions, and case/member preview updates without network writes. Backend permission/validation and service tests live in `../leirahealth-backend/src/modules/admin`. Live authentication, database transactions, and deployment still need a staging environment with your actual backend configuration.
