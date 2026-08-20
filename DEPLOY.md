# Deploying The Paddocks Hotel app to Plesk (Node.js / Passenger)

This is a Next.js app with a SQLite database. It runs as a **Node.js application**
on Plesk (Phusion Passenger), the same way the Freedom Church site runs.

## Environment variables (set in Plesk → Node.js → Custom environment variables)

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `file:./prisma/dev.db` |
| `AUTH_SECRET` | `19d1b54e653b3b77a51a6277d4d8a5c9a0813c42042aa500e883b2b907c7d58b` |

## Plesk setup (one time)

1. **Enable Node.js** for the domain (Websites & Domains → paddockshotel.com → Node.js).
2. Set:
   - **Application Root**: the folder this repo is deployed to (e.g. `paddocks_app`)
   - **Application Startup File**: `server.js`
   - **Application Mode**: `production`
   - **Custom environment variables**: the three above
3. Get the code onto the server (Plesk Git → this repo → deploy to the Application Root).
4. Click **NPM install**.
5. Click **Run script** → `build` (compiles the site; runs `prisma generate` + `next build`).
6. Click **Run script** → `setup:db` (creates + seeds the SQLite database - safe to re-run).
7. Click **Restart App**.
8. Point the domain's document root / proxy at the Node app (Plesk does this automatically
   when Node.js is enabled for the domain).

## Admin login (change the password after first login)

- URL: `/admin`
- Email: `admin@paddockshotel.com`
- Password: `Paddocks2026!`

## Notes

- The SQLite database (`prisma/dev.db`) and user-uploaded images (`public/uploads/…`)
  are **not** in git, so redeploys don't wipe your content.
- Public pages are `force-dynamic` - edits in `/admin` appear on the live site immediately.
- `npm run setup:db` is safe on every deploy: it never overwrites existing content or the admin password.
