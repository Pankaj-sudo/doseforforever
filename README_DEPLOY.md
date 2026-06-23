Deployment Guide — Render / Vercel

This project includes a client (Vite + React) and a small Express server (`server.ts`) that provides endpoints used by the checkout flow:

- `/api/create-order` — creates order in Firestore (or in server-side DB)
- `/api/send-email` — sends transactional emails via SMTP
- `/api/generate-id` — generates unique order IDs with collision checking

Two deployment options are common:

1) Render (recommended for full Node server)
------------------------------------------
- Connect your GitHub repository to Render.
- Create a new Web Service.
  - Build Command: `npm install && npm run build`
  - Start Command: `npm run start`
  - Environment: Node 18+ (default)
- Add Environment Variables (set in Render dashboard Settings → Environment):
  - `SMTP_HOST` (e.g. smtp.gmail.com)
  - `SMTP_PORT` (e.g. 587)
  - `SMTP_USER` (email account or SMTP user)
  - `SMTP_PASS` (app password or SMTP password)
  - Either add `firebase-applet-config.json` to the repo (private) or set FIREBASE config variables in the project (see `.env.example`)
  - Optional: `VITE_API_BASE` — the public URL of this server (e.g. https://my-app.onrender.com). If set, client will POST to `${VITE_API_BASE}/api/...`.

Notes:
- The project `build` script bundles the client with Vite and bundles the server via `esbuild` into `dist/server.cjs`.
- Render will run the server (Node) so server endpoints will be available at the service URL.

2) Vercel (serverless / functions)
----------------------------------
- Vercel prefers serverless functions. You can either deploy the Express server as a single Node service (Serverless Function) or convert endpoints to separate serverless functions.
- Quick option: Deploy with Vercel's Node server runtime by selecting the repo and using the `start` command (`npm run start`). This may need small adjustments to work within Vercel's serverless constraints.
- Alternative: Convert `server.ts` handlers into individual functions under `api/` or `netlify/functions/` for serverless.
- Set Environment Variables in Vercel dashboard (same keys as Render).

Client configuration
--------------------
- The client will call `/api/...` by default (same origin). For static deployments (Netlify, GitHub Pages) use the `VITE_API_BASE` env var to point to the server root (e.g. https://my-server.example.com).
- Example in `.env` (copy from `.env.example`):

  VITE_API_BASE=https://my-server.example.com

Local development
-----------------
- Run the server+client locally with:

```bash
npm install
npm run dev
```

This runs the `tsx server.ts` dev server (hot reload) and the client.

What we changed in this PR
-------------------------
- The client now respects `VITE_API_BASE` for API calls.
- Added a local queue that saves pending orders to `localStorage` and automatically retries when the backend becomes available.
- Added `uploadReceiptWithTimeout()` and `fetchWithTimeout()` to avoid indefinite spinner hangs.
- Updated `.env.example` with necessary keys.

Next steps
----------
- Choose a host (Render recommended) and set the environment variables.
- If you prefer serverless functions, I can help convert `server.ts` into per-endpoint serverless functions for Vercel or Netlify.

Troubleshooting
---------------
- If checkout shows "Order queued locally" after submission on the deployed site, it means the client couldn't reach the backend. Verify `VITE_API_BASE` points to your running server, or deploy the `server.ts` to Render and point the client to it.
- Use browser DevTools → Network to inspect failing requests.

