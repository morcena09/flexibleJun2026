# Flexible Classroom

A simplified Vanilla JavaScript classroom demo with three deployable Vercel projects:

- `frontend/` — static UI and client app
- `backend/restRelay/` — secure request tunnel gateway
- `backend/tokenGenerator/` — token generation backend

## 1. Vercel Project Setup

Create three Vercel projects, each pointing to one of these folders:

1. **Frontend Folder**
   - Project root: `/frontend`
   - Deploys the static classroom launcher UI

2. **Backend/restRelay**
   - Project root: `/backend/restRelay`
   - Deploys the request tunnel gateway

3. **Backend/tokenGenerator**
   - Project root: `/backend/tokenGenerator`
   - Deploys the token generator backend

## 2. Vercel Environment Variables

In the Vercel dashboard, open the **Environment Variables** section.

### 2.1 Shared variables
Use the **Shared** tab to create global variables available across multiple projects.

- `DEMO_PASSCODE` -> set your custom secret value
- `TURNSTILE_SECRET_KEY` -> leave blank until you have the Cloudflare secret
- `TOKEN_GENERATOR_DOMAIN` -> fill in with the Vercel assigned domain name for backend/tokenGenerator

## 3. Cloudflare Turnstile Setup

If you do not already have a Cloudflare account:

1. Create a Cloudflare account.
2. Search for **Turnstile**.
3. Add a widget manually.
4. Add the Frontend Vercel domain under Hostname Management.
5. Optionally add `localhost` to test locally.
6. Set **Widget Mode** to **Managed**.
7. Save the widget.
8. Copy the **Site key** and **Secret key**.
9. Paste the **Secret key** into the Vercel shared environment variable `TURNSTILE_SECRET_KEY`.

Then place the Cloudflare site key into `frontend/config/config.js`:

```js
TURNSTILE_SITE_KEY: '<your-cloudflare-site-key>'
```

## 4. Vercel Dashboard — Backend/restRelay

1. Open the **Backend/restRelay** project overview.
2. Go to **Environment Variables**.
3. Link shared variables.
4. Ensure `DEMO_PASSCODE`, `TURNSTILE_SECRET_KEY` and `TOKEN_GENERATOR_DOMAIN` are available to this project.

## 5. Vercel Dashboard — Backend/tokenGenerator

1. Open the **Backend/tokenGenerator** project overview.
2. Go to **Environment Variables**.
3. Link the shared variables.
4. Ensure `DEMO_PASSCODE` is available to this project.

## 6. Deployment Notes

- Deploy the three projects separately.
- Link the local folders to the corresponding Vercel projects:
  - `frontend/` -> Frontend project
  - `backend/restRelay/` -> Backend/restRelay project
  - `backend/tokenGenerator/` -> Backend/tokenGenerator project
- After each deployment, confirm the assigned domains and update `frontend/config/config.js`.

### 6.1 Deploy using the Vercel CLI

You can deploy directly from your machine using the Vercel CLI. This is useful when you want to create or update a project from the terminal and verify domains quickly.

Install and authenticate the Vercel CLI (one-time):

```bash
npm install -g vercel
vercel login
```

Deploy each project folder (run these from the workspace root or from each folder):

```bash
# from workspace root
cd frontend
vercel       # follow interactive prompts to link or create a project

cd ../backend/restRelay
vercel

cd ../backend/tokenGenerator
vercel
```

To create a production deployment directly use `vercel --prod` instead of `vercel`:

```bash
cd frontend
vercel --prod

cd ../backend/restRelay
vercel --prod

cd ../backend/tokenGenerator
vercel --prod
```

### 6.2 After deployment

Copy the assigned Vercel domains for each project into `frontend/config/config.js`.

Update the config values for:
- `REST_RELAY_URL`
- `TOKEN_GENERATOR_URL`
- `CLASSROOM_HOST`
- `LANDING_PAGE_URL`

Example placeholders in `frontend/config/config.js`:

```js
const envConfig = {
  REST_RELAY_URL: 'https://<restRelay-domain>/api/v1/request-tunnel',
  TOKEN_GENERATOR_URL: 'https://<tokenGenerator-domain>/api/v1/generateRtmToken',
  CLASSROOM_HOST: 'https://<frontend-domain>/classroom',
  TURNSTILE_SITE_KEY: '',
  LANDING_PAGE_URL: 'https://<frontend-domain>'
};
```

### 6.3 Production deploy (`vercel --prod`)

If you want to create a production deployment directly, use `vercel --prod` from the project folder. This skips the preview flow and publishes to production.

```bash
cd frontend
vercel --prod

cd ../backend/restRelay
vercel --prod

cd ../backend/tokenGenerator
vercel --prod
```

## Local Development

### Frontend

The frontend is a static Vanilla JS app. Open `frontend/index.html` in the browser or serve it from a local static server.

### Backend/restRelay

```bash
cd backend/restRelay
npm install
node server.js
```

### Backend/tokenGenerator

```bash
cd backend/tokenGenerator
npm install
node server.js
```

## Project Structure

```text
frontend/
  app.js
  index.html
  styles.css
  config/config.js
  classroom/
    app.js
    restClient.js
    sendRequest.js
backend/
  restRelay/
    server.js
    package.json
    config/config.cjs
  tokenGenerator/
    server.js
    package.json
```

## Important Notes

- Vercel server-side env vars are available in server code via `process.env`.
- The browser cannot directly load `.env` values at runtime.
- `frontend/config/config.js` is the client-side config entrypoint used by the static app.
- Use Vercel shared env vars for secrets and keep local `.env` out of the repo.

## Post-Deployment Checklist

- [ ] `frontend/config/config.js` contains the correct Vercel URLs.
- [ ] `DEMO_PASSCODE` exists in Vercel shared variables.
- [ ] `TURNSTILE_SECRET_KEY` exists and is linked to backend projects.
- [ ] Cloudflare Turnstile site key is set in `frontend/config/config.js`.
- [ ] Frontend, restRelay, and tokenGenerator projects are deployed and healthy.
