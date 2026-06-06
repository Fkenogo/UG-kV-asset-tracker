## Problem
Your sign-up for `fredkenogo@gmail.com` actually succeeded — the account exists in the auth system. The blocker is that email confirmation is required, so sign-in returns `email_not_confirmed`. The 429 you saw is just Supabase's 50-second rate limit on resending the confirmation email.

## Fix (3 steps)

### 1. Enable auto-confirm on the auth backend
Turn on `auto_confirm_email` so new sign-ups (including your existing one) don't need to click an email link. This is appropriate for an internal UEDCL tool where Super Admins provision users — public email confirmation isn't part of the PRD flow.

### 2. Confirm your existing account and promote to super_admin
Run a single data update that:
- Marks `fredkenogo@gmail.com` as email-confirmed in `auth.users`
- Inserts a `super_admin` row into `public.user_roles` for your user id (the `viewer` row auto-created by the `handle_new_user` trigger stays; `current_user_role()` already prioritizes `super_admin`)

### 3. Sign in
Go to `/auth`, sign in with `fredkenogo@gmail.com` / your password. You'll land on `/dashboard` with full Super Admin navigation.

## Notes
- No code changes are needed — the auth UI, RLS policies, and role priority logic from Phase 1 already handle this correctly.
- If you later want production-grade email confirmation, we can flip `auto_confirm_email` back off and wire up Lovable Emails auth templates. For now, Super-Admin-provisioned accounts is the PRD-aligned model.

Approve and I'll execute steps 1 and 2.