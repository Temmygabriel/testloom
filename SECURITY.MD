# Security

Testloom is a hackathon prototype and should be treated as such.

## Secrets

- Never commit API keys, access tokens, cookies, private keys, or environment files.
- Runtime secrets such as `GROQ_API_KEY` are configured through Vercel environment variables.
- Demo credentials used by the controlled sample application are intentionally non-sensitive.

## Browser target safety

The verification API accepts only the controlled `fail` and `pass` targets. The browser runner resolves their URLs server-side and restricts navigation to the target application's origin.

## Evidence

Verification screenshots are stored in Vercel Blob. Evidence is generated from the controlled demo applications and should not contain real user secrets.

## Local development

Use the provided `.env.local.example` files as templates. Do not commit populated `.env.local` files.