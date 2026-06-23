# Vercel Docker Deployment

This repository can deploy to Vercel using a dedicated Docker container build.

## What changed

- Added `Dockerfile.vercel` for Vercel container deployment.
- Updated `vercel.json` to use `@vercel/docker` with `Dockerfile.vercel`.
- Added `.dockerignore` to exclude dev artifacts from the container build.

## Deploy steps

1. Push the repo to GitHub.
2. In Vercel, create a new project and connect the repo.
3. Ensure Vercel uses the root `vercel.json` configuration.
4. Set environment variables in Vercel:

   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`
   - `FIREBASE_MEASUREMENT_ID` (optional)
   - `FIREBASE_FIRESTORE_DATABASE_ID` (optional)
   - `VITE_API_BASE` (optional, if the client needs to call a separate API host)

5. Deploy.

## Local test

Build locally with:

```bash
docker build -t doseofforever-vercel -f Dockerfile.vercel .
```

Run locally with:

```bash
docker run -p 3000:3000 \
  -e SMTP_HOST=smtp.gmail.com \
  -e SMTP_PORT=587 \
  -e SMTP_USER=youremail@example.com \
  -e SMTP_PASS=your_smtp_password \
  -e FIREBASE_API_KEY=... \
  -e FIREBASE_AUTH_DOMAIN=... \
  -e FIREBASE_PROJECT_ID=... \
  -e FIREBASE_STORAGE_BUCKET=... \
  -e FIREBASE_MESSAGING_SENDER_ID=... \
  -e FIREBASE_APP_ID=... \
  -e FIREBASE_MEASUREMENT_ID=... \
  -e FIREBASE_FIRESTORE_DATABASE_ID=... \
  doseofforever-vercel
```
