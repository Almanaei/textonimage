# Deployment Guide

## Why Not Serverless?

This app has two hard constraints that rule out serverless platforms (Vercel, Netlify, Cloudflare Pages):

1. **Native binaries** — `@napi-rs/canvas` and `sharp` require system libraries (`cairo`, `pango`, `pixman`) that serverless runtimes cannot provide.
2. **PostgreSQL** — requires a persistent database, so a managed DB service or self-hosted Postgres is needed.

The app already has a production-ready `Dockerfile` and `docker-compose.yml`, making a Docker-based VPS deployment the natural fit.

---

## Recommended Hosting: Railway

**Railway** is the fastest path from the current state to production.

### Why Railway

- Deploys directly from a GitHub repo using the existing `Dockerfile`
- Managed Postgres plugin — wires up `DATABASE_URL` automatically
- Auto-deploys on every `git push` to `master`
- No server management required

### Deployment Steps

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Create a new project → **Deploy from GitHub repo** → select `Almanaei/textonimage`
3. Set the **root directory** to `app/`
4. Add a **Postgres** plugin from the Railway dashboard
5. Set the following environment variables:

```env
STATS_SECRET=<your-secret>
ADMIN_API_KEYS=<your-api-keys>
ADMIN_AUTH_MAX_ATTEMPTS=30
ADMIN_AUTH_WINDOW_MS=60000
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000
PGSSLMODE=disable
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

6. Deploy — Railway builds the Dockerfile and runs the app

### Alternative Providers

| Provider | Starting Price | Notes |
|---|---|---|
| [Railway](https://railway.app) | ~$5/mo | Easiest — Docker + Postgres, GitHub auto-deploy |
| [Render](https://render.com) | ~$7/mo | Docker deploy + managed Postgres, GitHub integration |
| [Fly.io](https://fly.io) | ~$5/mo | Dockerfile-native, managed Postgres add-on |
| [DigitalOcean Droplet](https://digitalocean.com) | $6/mo | Full control, run `docker compose up` yourself |
| [Hetzner VPS](https://hetzner.com) | €4/mo | Cheapest raw VPS, excellent performance |

---

## Recommended Domain Registrar: Cloudflare

Buy the domain at [Cloudflare Registrar](https://cloudflare.com/products/registrar) and use Cloudflare DNS to proxy traffic to Railway.

### Why Cloudflare

- **At-cost pricing** (~$10/yr for `.com`) — no markup
- **Free CDN + DDoS protection** out of the box
- **Free SSL** managed automatically
- One dashboard for DNS, SSL, caching, and firewall rules

### Architecture

```
User → Cloudflare (CDN + SSL + DDoS) → Railway (Docker app) → PostgreSQL
```

### DNS Setup

Once deployed on Railway:

1. Copy your Railway deploy URL (e.g. `your-app.up.railway.app`)
2. In Cloudflare DNS, add a `CNAME` record:
   - **Name:** `@` (or `www`)
   - **Target:** `your-app.up.railway.app`
   - **Proxy:** Enabled (orange cloud)
3. SSL is handled automatically by Cloudflare

### Alternative Domain Registrars

| Registrar | Price (.com/yr) | Notes |
|---|---|---|
| [Cloudflare Registrar](https://cloudflare.com/products/registrar) | ~$10 | Best overall — at-cost, free DNS + DDoS |
| [Namecheap](https://namecheap.com) | ~$10–13 | Reliable, free WhoisGuard privacy |
| [Porkbun](https://porkbun.com) | ~$10–11 | Cheap, clean UI, free WHOIS privacy |
| GoDaddy | ~$20+ | Avoid — overpriced, pushy upsells |

### Check Domain Availability

- [instantdomainsearch.com](https://instantdomainsearch.com) — real-time across all TLDs
- [namecheap.com/domains/registration](https://www.namecheap.com/domains/registration/results/) — quick search
