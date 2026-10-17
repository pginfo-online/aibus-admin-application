# AiBus Admin Panel

The admin panel is a Next.js application. Vercel detects and builds it automatically; no custom `vercel.json` is required.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to the backend's absolute API URL, including its version path (for example, `https://api.example.com/api/v1`). The browser calls the backend directly, so the backend must be reachable from the public internet and allow requests from the admin panel's origin.

## Deploy to Vercel

1. Push the admin app to a Git provider that Vercel can access, then import that repository in Vercel. If importing a monorepo containing the other AiBus apps, set **Root Directory** to `admin`; if the repository itself is the admin app, use its root.
2. Leave the framework preset as **Next.js** and use the detected install/build settings (`npm install` and `npm run build`). Leave the output directory at its default.
3. In **Project Settings → Environment Variables**, add `NEXT_PUBLIC_API_URL` with the HTTPS URL of the production backend API, including `/api/v1`. Add it to each environment where the app will be built (Production, and Preview/Development if used).
4. Configure the backend's CORS allowlist to include the Vercel deployment URL and any custom admin domain. Ensure the backend and its database are independently deployed and available; Vercel only hosts this admin app.
5. Redeploy after adding or changing the variable. `NEXT_PUBLIC_` values are embedded in the client bundle at build time, so do not put secrets in this variable.
6. Open the deployed `/login` page and verify that an authorized admin can sign in and reach the dashboard.

## Validate before deployment

```bash
npm run lint
npm run build
```

The lint command currently reports pre-existing lint findings elsewhere in the app; the production build is the deployment check.
