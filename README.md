# LendLoop

Borrow what you need. Lend what you don't.

## Setup

Needs Node and pnpm. Convex runs as a local deployment, so no Convex account is needed.

1. Install packages.

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the Clerk keys from your Clerk dashboard.
3. In Clerk, create a JWT template named `convex` with these claims, so Convex gets each neighbour's name and email:

   ```json
   { "name": "{{user.full_name}}", "email": "{{user.primary_email_address}}" }
   ```

4. Start Convex and Next.js. The first Convex push fails until the env vars in the next step are set; that's expected.

   ```bash
   pnpm dev
   ```

5. In a second terminal, set the Convex env vars. `APP_TIMEZONE` is the neighbourhood's timezone and decides what "today" means for loans.

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
   npx convex env set APP_TIMEZONE America/Toronto
   ```

   Then stop and restart `pnpm dev` so Convex pushes again.

6. Load the demo neighbours, tools and loans. It's safe to run more than once, and before or after you sign in.

   ```bash
   npx convex run seed:run
   ```

7. Open http://localhost:3000 and sign in.

## Make the demo admin

1. Sign in once, so your row exists in the `users` table.
2. With `pnpm dev` running, open the local Convex dashboard:

   ```bash
   npx convex dashboard
   ```

3. Go to **Data**, then the `users` table, and edit your row: set `role` to `"admin"`.
4. The Admin link appears in the header without a reload.
