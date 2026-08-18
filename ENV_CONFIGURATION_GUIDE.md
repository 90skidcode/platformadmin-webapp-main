# Environment Configuration Guide

## 🎯 Optimized Configuration Strategy

This guide explains the simplified environment variable setup for your application.

---

## 📋 Overview

Instead of maintaining 5+ environment variables, we now use a **cleaner, domain-specific approach**:

### Old Approach (Complex) ❌
```bash
AUTH_API_URL=http://localhost:3100/api/mock-backend
API_URL_DEV=http://localhost:3100/api/mock-backend
API_URL_STAGING=http://localhost:3100/api/mock-backend  # Wrong - should point to staging
API_URL_PROD=http://localhost:3100/api/mock-backend     # Wrong - should point to prod
NEXT_PUBLIC_API_URL=http://localhost:3100/api/mock-backend
```

### New Approach (Simple) ✅
```bash
# .env.local (Local Development)
API_URL_DEV=http://localhost:3100/api/mock-backend
NEXT_PUBLIC_API_URL=http://localhost:3100/api/mock-backend

# .env.staging (Staging Deployment)
API_URL_STAGING=https://staging-api.com
NEXT_PUBLIC_API_URL=https://staging-api.com

# .env.production (Production Deployment)
API_URL_PROD=https://api.yourcompany.com
NEXT_PUBLIC_API_URL=https://api.yourcompany.com
```

---

## 📁 Environment Files

### `.env.local` (Local Development)
**Location:** Root of project  
**Purpose:** Local testing with mock backend  
**Committed to git:** ❌ NO (in .gitignore)

```bash
# Authentication Secret (for local testing only)
AUTH_SECRET=gN7Gh9qQeRYglD9oiZZDOLEroPtOrNZWKLQD4PNi1Rc=

# Local backend URL
API_URL_DEV=http://localhost:3100/api/mock-backend

# Public API URL (for browser-side requests)
NEXT_PUBLIC_API_URL=http://localhost:3100/api/mock-backend
```

**When used:** `pnpm dev` (local development)

---

### `.env.staging` (Staging Deployment)
**Location:** Root of project  
**Purpose:** Staging environment configuration  
**Committed to git:** ❌ NO (in .gitignore)  
**How deployed:** Via CI/CD pipeline (GitHub Actions, GitLab CI, etc.)

```bash
# Authentication Secret (generate new one)
AUTH_SECRET=<your-staging-auth-secret>

# Staging backend URL (your staging server)
API_URL_STAGING=https://staging-api.com

# Public API URL
NEXT_PUBLIC_API_URL=https://staging-api.com
```

**When used:** Deployed to staging environment

**How to deploy:**
```bash
# Via environment variables (CI/CD platform)
export AUTH_SECRET=<staging-secret>
export API_URL_STAGING=https://staging-api.com
export NEXT_PUBLIC_API_URL=https://staging-api.com
pnpm build
pnpm start
```

---

### `.env.production` (Production Deployment)
**Location:** Root of project  
**Purpose:** Production environment configuration  
**Committed to git:** ❌ NO (in .gitignore)  
**How deployed:** Via CI/CD pipeline with secrets management

```bash
# Authentication Secret (generate new one)
AUTH_SECRET=<your-production-auth-secret>

# Production backend URL (your production server)
API_URL_PROD=https://api.yourcompany.com

# Public API URL
NEXT_PUBLIC_API_URL=https://api.yourcompany.com
```

**When used:** Deployed to production environment

**How to deploy:**
```bash
# Via environment variables (CI/CD platform secrets)
# NEVER commit production secrets to git!
export AUTH_SECRET=<production-secret>
export API_URL_PROD=https://api.yourcompany.com
export NEXT_PUBLIC_API_URL=https://api.yourcompany.com
pnpm build
pnpm start
```

---

## 🔧 How It Works

### Variable Resolution

The application resolves the correct API URL based on which environment variable is set:

**In `src/auth/auth.config.ts` (Login):**
```typescript
const apiUrl =
  process.env.API_URL_DEV ||        // Local dev (localhost:3100)
  process.env.API_URL_STAGING ||    // Staging (staging-api.com)
  process.env.API_URL_PROD ||       // Production (api.yourcompany.com)
  "";

const res = await fetch(`${apiUrl}/auth/login`, {...});
```

**In `src/lib/backend-client/environment-config.server.ts` (Server requests):**
```typescript
export const ENVIRONMENT_BASE_URLS: Record<string, string> = {
  dev: process.env.API_URL_DEV ?? "",
  staging: process.env.API_URL_STAGING ?? "",
  production: process.env.API_URL_PROD ?? "",
};

export function resolveBaseUrl(envId: string): string {
  return ENVIRONMENT_BASE_URLS[envId] || ENVIRONMENT_BASE_URLS.production;
}
```

---

## 📊 Environment Variables Explained

### Required Variables

| Variable | Purpose | Example | Used By |
|----------|---------|---------|---------|
| **AUTH_SECRET** | Encrypts JWT sessions | (random 32 chars) | NextAuth.js |
| **API_URL_DEV** | Local development API | `http://localhost:3100/api/mock-backend` | Auth & Proxy |
| **API_URL_STAGING** | Staging API server | `https://staging-api.com` | Auth & Proxy |
| **API_URL_PROD** | Production API server | `https://api.yourcompany.com` | Auth & Proxy |
| **NEXT_PUBLIC_API_URL** | Browser-accessible API | `https://api.yourcompany.com` | Client-side code |

### What Each Does

**AUTH_SECRET**
- Encrypts and signs JWT tokens
- Must be different for each environment
- Generate: `openssl rand -base64 32`

**API_URL_DEV/STAGING/PROD**
- Server-side only (not exposed to browser)
- Used for authentication and proxy requests
- Each environment has different URL

**NEXT_PUBLIC_API_URL**
- Prefixed with `NEXT_PUBLIC_` = exposed to browser
- Used by client-side API calls
- Must be HTTPS in production
- Can differ from server-side URL if needed

---

## 🚀 Deployment Scenarios

### Scenario 1: Local Development
```bash
# .env.local
AUTH_SECRET=gN7Gh9qQeRYglD9oiZZDOLEroPtOrNZWKLQD4PNi1Rc=
API_URL_DEV=http://localhost:3100/api/mock-backend
NEXT_PUBLIC_API_URL=http://localhost:3100/api/mock-backend

# Run
pnpm dev
```

### Scenario 2: Staging on Vercel
```bash
# Vercel Environment Variables (Settings → Environment Variables)
AUTH_SECRET=<generate-new>
API_URL_STAGING=https://staging-api.com
NEXT_PUBLIC_API_URL=https://staging-api.com

# Push to staging branch
git push origin staging
# Vercel auto-deploys with those env vars
```

### Scenario 3: Production on AWS/Heroku
```bash
# Platform Secrets Management
export AUTH_SECRET=<production-secret>
export API_URL_PROD=https://api.yourcompany.com
export NEXT_PUBLIC_API_URL=https://api.yourcompany.com

# Deploy
pnpm build
pnpm start
```

---

## ✅ Configuration Checklist

### Local Development
- [ ] `.env.local` created with DEV variables
- [ ] `AUTH_SECRET` set
- [ ] `API_URL_DEV` points to localhost:3100
- [ ] `NEXT_PUBLIC_API_URL` matches
- [ ] `.env.local` is in `.gitignore`

### Staging Setup
- [ ] `.env.staging` created with STAGING variables
- [ ] `AUTH_SECRET` generated (new one)
- [ ] `API_URL_STAGING` points to staging server
- [ ] `NEXT_PUBLIC_API_URL` matches staging
- [ ] `.env.staging` in `.gitignore`
- [ ] CI/CD platform has env variables configured

### Production Setup
- [ ] `.env.production` created with PROD variables
- [ ] `AUTH_SECRET` generated (new one)
- [ ] `API_URL_PROD` points to production server
- [ ] `NEXT_PUBLIC_API_URL` matches production
- [ ] `.env.production` in `.gitignore`
- [ ] CI/CD platform has secrets configured
- [ ] All secrets use platform secrets management

---

## 🔐 Security Best Practices

### ✅ DO
- ✅ Generate new `AUTH_SECRET` for each environment
- ✅ Use platform secrets management (GitHub Secrets, Vercel, AWS Secrets Manager)
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use HTTPS for all production URLs
- ✅ Rotate secrets regularly

### ❌ DON'T
- ❌ Commit `.env.local` to git
- ❌ Commit `.env.staging` or `.env.production` with real secrets
- ❌ Use same `AUTH_SECRET` for multiple environments
- ❌ Share `AUTH_SECRET` via email or chat
- ❌ Log environment variables

---

## 🔄 CI/CD Integration Examples

### GitHub Actions
```yaml
name: Deploy Staging
on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy
        env:
          AUTH_SECRET: ${{ secrets.STAGING_AUTH_SECRET }}
          API_URL_STAGING: ${{ secrets.STAGING_API_URL }}
          NEXT_PUBLIC_API_URL: ${{ secrets.STAGING_PUBLIC_API_URL }}
        run: |
          pnpm install
          pnpm build
          pnpm start
```

### Vercel
```json
// vercel.json
{
  "env": {
    "AUTH_SECRET": "@staging_auth_secret",
    "API_URL_STAGING": "@staging_api_url",
    "NEXT_PUBLIC_API_URL": "@staging_public_api_url"
  }
}
```

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY . .

ARG AUTH_SECRET
ARG API_URL_PROD
ARG NEXT_PUBLIC_API_URL

ENV AUTH_SECRET=$AUTH_SECRET
ENV API_URL_PROD=$API_URL_PROD
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm install && pnpm build
CMD ["pnpm", "start"]
```

---

## 📝 File Reference

### Local Development
- **File:** `.env.local`
- **Variables:** `AUTH_SECRET`, `API_URL_DEV`, `NEXT_PUBLIC_API_URL`
- **Git:** ❌ Ignored
- **When:** Local development with `pnpm dev`

### Staging
- **File:** `.env.staging`
- **Variables:** `AUTH_SECRET`, `API_URL_STAGING`, `NEXT_PUBLIC_API_URL`
- **Git:** ❌ Ignored
- **When:** Staging deployment via CI/CD
- **How:** Platform environment variables

### Production
- **File:** `.env.production`
- **Variables:** `AUTH_SECRET`, `API_URL_PROD`, `NEXT_PUBLIC_API_URL`
- **Git:** ❌ Ignored
- **When:** Production deployment via CI/CD
- **How:** Platform secrets management

---

## 🎯 Summary

### Benefits of This Approach
✅ **Cleaner** - Only 3 variables per environment (not 5)  
✅ **Domain-specific** - URLs change per environment  
✅ **Secure** - Secrets never in version control  
✅ **Scalable** - Easy to add more environments  
✅ **Clear** - File naming matches environment  

### How It Works
1. Local: Use `.env.local` with `localhost`
2. Staging: Use `.env.staging` with staging URL
3. Production: Use `.env.production` with prod URL
4. Each has own `AUTH_SECRET`
5. CI/CD injects environment variables during deployment

---

## 🔗 Related Documentation

- `FINAL_CHECKLIST.md` - Overall setup checklist
- `COMPLETE_SETUP.md` - Full setup guide
- `.env.local` - Local configuration example
- `.env.staging` - Staging configuration template
- `.env.production` - Production configuration template

---

**Last Updated:** 2026-08-18  
**Status:** ✅ Simplified & Optimized
