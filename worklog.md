---
Task ID: 1
Agent: Main
Task: Remove Supabase Auth, replace with custom JWT + bcrypt auth, keep Supabase for data storage only

Work Log:
- Explored full auth architecture: 5 files using Supabase Auth (login, register, verify-otp, admin/users, auth.ts)
- Installed bcryptjs + jose for password hashing and JWT signing/verification
- Rewrote src/lib/auth.ts: replaced supabaseAdmin.auth.getUser(token) with jose jwtVerify, added hashPassword/verifyPassword/signToken/verifyToken
- Rewrote src/lib/supabase/admin.ts: removed createSignInClient(), removed anon key dependency, kept data-only service role client
- Deleted unused src/lib/supabase/server.ts (cookie-based SSR client, zero imports)
- Rewrote src/app/api/auth/register/route.ts: replaced admin.createUser() with direct profiles INSERT (email + password_hash), signs custom JWT
- Rewrote src/app/api/auth/login/route.ts: replaced listUsers()/signInWithPassword() with profiles SELECT + bcrypt.compare, signs custom JWT
- Rewrote src/app/api/auth/verify-otp/route.ts: replaced listUsers()/signInWithPassword()/generateLink() with profiles SELECT + custom JWT
- Rewrote src/app/api/admin/users/route.ts: replaced auth.admin.listUsers() with profiles email column, removed auth.admin.deleteUser()
- Removed @supabase/ssr dependency
- Added JWT_SECRET to .env
- Created supabase/migrations/002_remove_supabase_auth.sql to add email + password_hash columns, drop RLS policies, disable RLS
- Verified zero Supabase Auth references remain in codebase
- Build succeeded: all 31 API routes compile with zero errors

Stage Summary:
- Supabase Auth completely removed. Supabase is now data-storage only.
- Custom auth uses bcryptjs (password hashing) + jose (JWT signing/verification via HS256)
- Email and password_hash now stored directly in profiles table
- No more session pollution issue: each login/register generates a fresh JWT with jose (stateless, no shared client)
- IMPORTANT: User must run migration 002_remove_supabase_auth.sql in Supabase SQL editor AND re-create existing users (old profiles lack email/password_hash)
