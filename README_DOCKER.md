# Docker Deployment

This repository can run inside a Docker container for Render, Vercel (container), or any other container host.

## Build & Run

```bash
docker build -t doseofforever-app .
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
  doseofforever-app
```

The container listens on port `3000` and serves both the static frontend and the Express server.

## Environment Variables

Required environment variables:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_APP_ID`

Optional:

- `FIREBASE_MEASUREMENT_ID`
- `FIREBASE_FIRESTORE_DATABASE_ID`
- `VITE_API_BASE` (if the frontend needs to call the API at a different absolute URL)

## Notes

- The Dockerfile builds both the client and the server.
- If you keep `firebase-applet-config.json` in the repo, the server can use it automatically.
- Otherwise, provide the Firebase config through `FIREBASE_*` env vars.
