---
Task ID: 2
Agent: Main
Task: Replace custom JWT auth with Clerk authentication

Work Log:
- Installed @clerk/nextjs, removed bcryptjs + jose + @types/bcryptjs
- Deleted src/middleware.ts (conflicts with proxy.ts in Next.js 16)
- Created src/proxy.ts with clerkMiddleware() and proper matcher
- Updated src/app/layout.tsx — wrapped children with ClerkProvider
- Rewrote src/lib/auth.ts — getAuthUser() now uses Clerk auth() + looks up profile by clerk_id
- Updated src/lib/req-helpers.ts — requireAuth/requireAdmin use Clerk internally, kept (req?) signature for backwards compat
- Rewrote /api/auth/session — returns profile from Clerk session
- Rewrote /api/auth/register — now a profile-sync endpoint (creates Supabase profile after Clerk signup)
- Simplified /api/auth/login — Clerk handles login, returns profile if exists
- Simplified /api/auth/logout — Clerk handles session cleanup
- Rewrote /api/auth/verify-otp — uses getAuthUser() (Clerk-based)
- Rewrote src/components/views/AuthView.tsx — Clerk SignIn/SignUp components + profile completion form
- Updated src/store/index.ts — removed localStorage token, apiFetch no longer sends Bearer token
- Updated src/components/views/SettingsView.tsx — logout uses Clerk signOut()
- Created supabase/migrations/003_add_clerk_id.sql
- Build succeeded: all 31 API routes, zero errors

Stage Summary:
- Clerk fully integrated for authentication (SignIn, SignUp, session management)
- Supabase is data-storage only (no auth)
- Flow: Clerk auth → profile completion (username, phone, referral) → dashboard
- No more JWT tokens, no more password hashing, no session pollution
- IMPORTANT: User must create Clerk app, add env vars, and run migration 003
