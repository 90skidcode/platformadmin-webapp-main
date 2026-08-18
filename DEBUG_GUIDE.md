# Debugging the 500 Error on /api/proxy/audit-log

## Problem
Getting a 500 error when accessing `http://localhost:3100/api/proxy/audit-log?page=1&pageSize=10`

## Root Cause Investigation

The proxy endpoint (`src/app/api/proxy/[...path]/route.ts`) forwards requests to the backend with the user's access token. The 500 error could be due to:

1. **Missing or invalid session** - No auth session when proxy tries to access it
2. **Missing accessToken in session** - Token not being passed from JWT to session
3. **Backend auth failure** - Token is invalid or expired
4. **Environment configuration** - Wrong API_URL_DEV or missing URL

## Quick Fixes to Try

### 1. **Check if You're Logged In**
- Visit http://localhost:3000/
- If redirected to `/login`, you need to log in first
- Use credentials: `email: admin@chola.murugappa.com`, `password: password`

### 2. **Verify Session Has Access Token**
Add this temporary logging to `src/app/api/proxy/[...path]/route.ts`:

```typescript
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await auth();
  
  // DEBUG: Log the session
  console.log('[PROXY DEBUG]', {
    hasSession: !!session,
    hasAccessToken: !!session?.accessToken,
    sessionKeys: Object.keys(session || {}),
  });
  
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  
  // ... rest of code
}
```

Then check server logs for the debug output.

### 3. **Verify Environment Configuration**
Check `.env.local`:
```bash
cat .env.local
```

Expected output:
```
AUTH_SECRET=gN7Gh9qQeRYglD9oiZZDOLEroPtOrNZWKLQD4PNi1Rc=
AUTH_API_URL=http://localhost:3100/api/mock-backend
API_URL_DEV=http://localhost:3100/api/mock-backend
NEXT_PUBLIC_API_URL=http://localhost:3100/api/mock-backend
```

### 4. **Test Backend Endpoint Directly**
```bash
# Get a token first by logging in via the UI, then test:
curl -X GET "http://localhost:3100/api/mock-backend/audit-log?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Tenant-Id: tenant-1"
```

### 5. **Check Backend Response**
If the backend returns 401, the token is invalid. If it returns 500, there's an issue with the mock backend itself.

## Steps to Resolve

### Step 1: Restart Everything
```bash
# Kill the dev server
# Clear .next build cache
rm -rf .next

# Start fresh
pnpm dev
```

### Step 2: Log In Properly
- Go to http://localhost:3000/login
- Enter credentials: `admin@chola.murugappa.com` / `password`
- Should redirect to dashboard or main page

### Step 3: Try the Request Again
- Go to http://localhost:3000 (to ensure you're logged in)
- Open Developer Tools → Network tab
- Try the request that was failing
- Check the response and server logs

### Step 4: Add Debug Logging
If still failing, add more detailed logging to understand where it breaks:

```typescript
// In src/app/api/proxy/[...path]/route.ts
console.log('[PROXY]', {
  path: path.join('/'),
  method: request.method,
  hasSession: !!session,
  sessionUser: session?.user?.email,
  accessToken: session?.accessToken?.substring(0, 20) + '...',
});

// Log the backend call
console.log('[BACKEND CALL]', {
  url: `${baseUrl}${finalPath}`,
  method: request.method,
  headers: {
    Authorization: `Bearer ${session?.accessToken?.substring(0, 20)}...`,
  },
});
```

## Expected Flow

1. User logged in ✓
2. Session created with accessToken ✓
3. Proxy receives request with authenticated user ✓
4. Proxy extracts accessToken from session ✓
5. Proxy forwards to backend with Bearer token ✓
6. Backend validates token ✓
7. Backend returns audit-log data ✓
8. Proxy returns data to client ✓

## If All Else Fails

Try a complete reset:

```bash
# Kill dev server
# Remove cache and build files
rm -rf .next node_modules

# Reinstall dependencies
pnpm install

# Restart
pnpm dev
```

Then:
1. Log in fresh
2. Try to access the audit-log page
3. Check server and browser console logs
4. Share the error logs for further investigation

---

**Note:** The mock backend is running on port 3100 (as configured in `package.json`'s dev script). The main app is on port 3000. Both must be running.
