# Shared Living

Log house chores, earn credits, and keep your rent down.
Ionic + Angular (standalone components) on the front end, Supabase on the back end.

## First-time setup

1. **Database.** In Supabase, open the SQL Editor and run, in order:
   - `supabase/001_schema.sql` (skip it if you've already run it)
   - `supabase/002_profiles_on_signup.sql`
2. **Keys.** Open `src/environments/environment.ts` and paste in your Project URL and anon public key from Supabase → Project Settings → API.
3. **Email confirmation (optional, for testing).** Supabase asks new users to confirm their email by default. To skip that while you test, go to Authentication → Sign In / Providers → Email and turn off "Confirm email".
4. **Install and run:**
   ```bash
   npm install
   npm start
   ```
   Then open http://localhost:4200.

## How it fits together

| File | What it does |
|---|---|
| `src/app/supabase.service.ts` | All the talking to Supabase: sign up / log in / log out, get your house, create or join a house |
| `src/app/guards.ts` | Sends people to the right screen: not logged in → login, no house → setup |
| `src/app/pages/login.page.ts` | Log in / sign up screen |
| `src/app/pages/house-setup.page.ts` | Join a house with a code, or start a new one |
| `src/app/pages/home.page.ts` | Shows your house, its invite code and the rent (chores come next) |
| `supabase/` | The database schema to run in Supabase |
