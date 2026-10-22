# Shared Living

![Ionic](https://img.shields.io/badge/Ionic-3880FF?style=for-the-badge&logo=ionic&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

**Log house chores, earn credits, and keep your rent down.**

Shared Living is a web app for housemates. Everyone joins their house with an invite code. Doing chores earns credits, and the more credits you earn each month, the less of the rent you pay. The house also shares a weekly dinner menu and a shopping list, and push notifications keep everyone in the loop.

---

## Features

### Houses and invite codes
- Sign up, then create a new house or join one with its 8-character invite code
- Share the invite link with housemates from Settings

### Chores, credits and rent
- Add daily and weekly chores, each worth a number of credits
- **Plan your day:** pick which chores you'll do today
- Mark a chore done, and **a housemate approves or rejects it** before the credits count
- Each housemate has a monthly credit target. The home screen shows credits earned, credits still to go and rent owed so far. Hit your target and you live rent free that month
- **History** of who did what and when

### Dinner and shopping
- Weekly dinner menu (Monday–Sunday) that anyone in the house can edit
- Dinner suggestion box
- Shared shopping list

### Push notifications
- When a housemate marks a chore done, everyone else is asked to approve it
- When your chore is approved or rejected
- 9am reminder to pick your chores for the day
- 7pm reminder if a chore on your list is due tonight

---

## How it's built

| Layer | Technology |
|---|---|
| Front end | Ionic + Angular (standalone components), installable as a PWA |
| Auth | Supabase Auth (email and password) |
| Database | Supabase PostgreSQL |
| Security | Row Level Security on every table: housemates can only see and change their own house's data |
| Notifications | Web Push, sent by a Supabase Edge Function (`notify`) |
| Scheduled jobs | `pg_cron` for the daily reminders and for clearing chore history older than a month |
| Hosting | Netlify |

### Database tables
`houses` · `profiles` · `house_members` · `chores` · `chore_logs` · `push_subscriptions` · `dinner_menu` · `dinner_suggestions` · `shopping_items`

### Code tour
| File | What it does |
|---|---|
| `src/app/supabase.service.ts` | All communication with Supabase: sign up, log in, houses, chores, credits |
| `src/app/push.service.ts` | Turns on push notifications for this phone or browser |
| `src/app/guards.ts` | Sends people to the right screen: not logged in → login, no house → house setup |
| `src/app/pages/` | One file per screen: home, plan, dinner, shopping, history, settings, login, house setup |
| `supabase/*.sql` | Database schema, security policies and scheduled jobs |
| `supabase/functions/notify/` | Edge Function that sends the push notifications |

---

## Run it locally

**You'll need:** Node.js 18+ and a free [Supabase](https://supabase.com) project.

1. **Database.** In Supabase, open the SQL Editor and run the files in `supabase/` in number order.
2. **Keys.** Open `src/environments/environment.ts` and paste in your Project URL and anon public key (Supabase → Project Settings → API).
3. **Email confirmation (optional, for testing).** To skip confirming new users' emails while you test, go to Authentication → Sign In / Providers → Email and turn off "Confirm email".
4. **Install and run:**
   ```bash
   npm install
   npm start
   ```
   Then open http://localhost:4200.

### Push notifications (optional)
1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Deploy the `notify` Edge Function and add its secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and `NOTIFY_SECRET`
3. Put your project ID and the same `NOTIFY_SECRET` in `supabase/005_notifications.sql` before running it

---

### Connect with me
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/liam-kapelianis-a42b3b403)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/LiamAtu)
