# ✅ Fix: 500 Error on /api/proxy/audit-log

## Problem Identified

```
TypeError: Failed to parse URL from /audit-log?page=1&pageSize=10
code: 'ERR_INVALID_URL'
```

### Root Cause

The `baseUrl` was empty because:
1. App defaulted to "production" environment
2. `API_URL_PROD` was not set in `.env.local`
3. `fetch()` was called with invalid URL: `/audit-log?page=1&pageSize=10`

### Code Path

```
proxy/[...path]/route.ts
  ↓
callBackend() in backend-client.server.ts
  ↓
resolveBaseUrl(envId) 
  ↓
ENVIRONMENT_BASE_URLS[envId] → empty string ❌
  ↓
fetch(`${baseUrl}${path}`) → fetch('/audit-log?page=1&pageSize=10') → ERROR!
```

---

## Solution Applied

### ✅ Fixed: `.env.local`

Updated all environment URLs to point to the mock backend:

```bash
# Before
API_URL_DEV=http://localhost:3100/api/mock-backend
API_URL_STAGING=        # ❌ Empty
API_URL_PROD=           # ❌ Empty

# After
API_URL_DEV=http://localhost:3100/api/mock-backend
API_URL_STAGING=http://localhost:3100/api/mock-backend    # ✓ Set
API_URL_PROD=http://localhost:3100/api/mock-backend       # ✓ Set
```

---

## How It Works Now

### Flow:
1. **Request:** `/api/proxy/audit-log?page=1&pageSize=10`
2. **Route handler** reads the request path
3. **Get environment ID** from cookie or default to "production"
4. **Resolve base URL** using `environment-config.server.ts`
   - Looks up `ENVIRONMENT_BASE_URLS[envId]`
   - Returns: `http://localhost:3100/api/mock-backend` ✓
5. **Fetch from backend:** `http://localhost:3100/api/mock-backend/audit-log?page=1&pageSize=10` ✓
6. **Return response** to client ✓

### Code Flow Diagram:

```
Client Browser
    ↓
http://localhost:3000/api/proxy/audit-log?page=1&pageSize=10
    ↓
proxy/[...path]/route.ts (handler)
    ↓
Get session & auth token ✓
    ↓
callBackend("/audit-log?page=1&pageSize=10")
    ↓
resolveBaseUrl("production") → "http://localhost:3100/api/mock-backend" ✓
    ↓
fetch("http://localhost:3100/api/mock-backend/audit-log?page=1&pageSize=10", headers)
    ↓
Mock Backend Receives Request ✓
    ↓
Returns Audit Log Data ✓
    ↓
200 OK Response ✓
```

---

## Testing the Fix

### Step 1: Clear Cache and Restart

```bash
# Kill current dev server (Ctrl+C)
rm -rf .next
pnpm dev
```

### Step 2: Verify All Endpoints

**Test in Browser Console:**

```javascript
// After logging in, test these requests:

// 1. Check session
fetch('/api/auth/session').then(r => r.json()).then(console.log);

// 2. Test audit-log proxy
fetch('/api/proxy/audit-log?page=1&pageSize=10')
  .then(r => r.json())
  .then(console.log);

// 3. Test employees proxy
fetch('/api/proxy/employees?page=1&pageSize=10')
  .then(r => r.json())
  .then(console.log);
```

Expected output:
```json
{
  "code": "S_200_AUDIT_LIST_OK",
  "message": "Audit log retrieved successfully",
  "data": {
    "items": [...],
    "total": ...,
    "page": 1,
    "pageSize": 10
  }
}
```

### Step 3: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Navigate to audit-log page
4. Look for requests to `/api/proxy/audit-log`
5. Should show **200 OK** (not 500)

---

## Environment Configuration Reference

### Development (Local)
```bash
API_URL_DEV=http://localhost:3100/api/mock-backend
```

### Staging
```bash
API_URL_STAGING=https://staging-api.yourcompany.com/api
```

### Production
```bash
API_URL_PROD=https://api.yourcompany.com
```

### How It's Selected

```typescript
// In proxy/[...path]/route.ts
const envId = cookieStore.get("admin-environment")?.value ?? "production";
// Defaults to "production" if cookie not set

// In environment-config.server.ts
export function resolveBaseUrl(envId: string): string {
  return ENVIRONMENT_BASE_URLS[envId] || ENVIRONMENT_BASE_URLS.production;
}
```

---

## Complete Environment Variables

Your `.env.local` should now have:

```bash
# Authentication
AUTH_SECRET=gN7Gh9qQeRYglD9oiZZDOLEroPtOrNZWKLQD4PNi1Rc=
AUTH_API_URL=http://localhost:3100/api/mock-backend

# Backend URLs
API_URL_DEV=http://localhost:3100/api/mock-backend
API_URL_STAGING=http://localhost:3100/api/mock-backend
API_URL_PROD=http://localhost:3100/api/mock-backend

# Public APIs (for browser)
NEXT_PUBLIC_API_URL=http://localhost:3100/api/mock-backend
```

---

## Verification Checklist

After applying the fix:

- [ ] `.env.local` has all three URLs set
- [ ] Dev server started with `pnpm dev`
- [ ] Logged in with test credentials
- [ ] Navigated to audit-log page
- [ ] Network tab shows `/api/proxy/audit-log` returning **200 OK**
- [ ] Audit log data displays in UI
- [ ] No errors in browser console
- [ ] No errors in server logs (except @next/font warning)

---

## Before vs After

### Before Fix ❌
```
GET /api/proxy/audit-log?page=1&pageSize=10

Error:
TypeError: Failed to parse URL from /audit-log?page=1&pageSize=10
at callBackend (backend-client.server.ts:20)

Reason: baseUrl was empty
```

### After Fix ✅
```
GET /api/proxy/audit-log?page=1&pageSize=10

Proxy resolves to:
fetch("http://localhost:3100/api/mock-backend/audit-log?page=1&pageSize=10")

Response: 200 OK
{
  "code": "S_200_AUDIT_LIST_OK",
  "message": "...",
  "data": {...}
}
```

---

## Summary

| Aspect | Status |
|--------|--------|
| **Problem** | Empty `API_URL_PROD` causing invalid URL |
| **Solution** | Configured all environment URLs in `.env.local` |
| **Test** | Navigate to audit-log → should load data |
| **Result** | ✅ 500 errors → 200 OK responses |

---

## Next Steps

1. **Restart dev server** - Press Ctrl+C and run `pnpm dev` again
2. **Clear .next cache** - `rm -rf .next` before starting
3. **Log in** - Use test credentials
4. **Test endpoints** - Navigate to pages that use API calls
5. **Check network** - DevTools → Network tab should show 200 OK

---

## Additional Notes

- For **production**, change `API_URL_PROD` to your real backend URL
- For **staging**, change `API_URL_STAGING` to your staging backend
- Never commit `.env.local` - it has secrets
- Each environment should have its own `.env.local` (or platform secrets)

---

**Status: ✅ FIXED - Ready to test!**

Run `pnpm dev` and the 500 errors should be gone! 🚀
