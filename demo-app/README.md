# Testloom Demo App

A minimal login application used as the **controlled verification target** for Testloom.

It has two session modes, controlled by the `SESSION_MODE` environment variable:

| `SESSION_MODE` | Behaviour | Testloom result |
|---|---|---|
| `memory` (default) | Session stored in server memory — lost on refresh / serverless cold start | **FAIL** |
| `cookie` | Session stored in an `HttpOnly` cookie — survives refresh | **PASS** |

One codebase is deployed twice to Vercel with different `SESSION_MODE` values.

---

## Routes

| Route | Description |
|---|---|
| `GET /` | Redirects to `/login` |
| `GET /login` | Login form (username: `demo`, password: `demo123`) |
| `POST /api/login` | Authenticates, sets session cookie, returns `{ ok: true }` |
| `GET /api/me` | Returns `{ authenticated: true, username }` or 401 |
| `POST /api/logout` | Clears session |
| `GET /dashboard` | Protected page — redirects to `/login` if not authenticated |

---

## `data-testid` attributes (used by Playwright)

| Attribute | Element |
|---|---|
| `login-heading` | `<h1>` on the login page |
| `login-form` | `<form>` on the login page |
| `username-input` | Username `<input>` |
| `password-input` | Password `<input>` |
| `login-submit` | Submit `<button>` |
| `login-error` | Error message `<p>` (only rendered on failure) |
| `dashboard-heading` | `<h1>` on the dashboard (`Welcome, demo`) |
| `dashboard-status` | Status `<p>` on the dashboard |
| `logout-button` | Logout `<button>` |

---

## Running locally

### Install dependencies

```bash
cd demo-app
npm install
```

### FAIL version (broken session — default)

```bash
SESSION_MODE=memory npm run dev
# App runs on http://localhost:3001
```

1. Open `http://localhost:3001/login`
2. Log in with `demo` / `demo123` — you reach `/dashboard`
3. Refresh the page
4. **Expected:** redirected back to `/login` (session lost)

> **Note:** On a long-running local dev server the module-level `Map` persists
> across requests, so the FAIL behaviour is only reliably demonstrated on a
> Vercel serverless deployment where each invocation gets a fresh module. Locally
> you can simulate it by stopping and restarting the dev server, then refreshing.

### PASS version (working session)

```bash
SESSION_MODE=cookie npm run dev
# App runs on http://localhost:3001
```

1. Open `http://localhost:3001/login`
2. Log in with `demo` / `demo123` — you reach `/dashboard`
3. Refresh the page
4. **Expected:** dashboard remains visible (session survives)

---

## Deploying to Vercel (Phase 1 step — done after local validation)

Deploy twice from the same codebase:

### FAIL deployment

```bash
vercel deploy --prod
# Set environment variable in Vercel dashboard:
#   SESSION_MODE = memory
```

Record the deployed URL as `DEMO_APP_FAIL_URL` in the Testloom `.env.local`.

### PASS deployment

```bash
vercel deploy --prod
# Set environment variable in Vercel dashboard:
#   SESSION_MODE = cookie
```

Record the deployed URL as `DEMO_APP_PASS_URL` in the Testloom `.env.local`.

---

## Lint and typecheck

```bash
npm run lint
npm run typecheck
```
