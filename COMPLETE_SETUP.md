# Complete Setup & Testing Guide

## ✅ Everything Has Been Configured!

Here's what was done:
- ✅ `.env.local` - Added AUTH_SECRET and backend URLs
- ✅ `src/auth/auth.ts` - Added secret parameter
- ✅ `src/constants/apiendpoints.ts` - Created centralized endpoints
- ✅ Services updated - Using API_ENDPOINTS constants

---

## 🚀 **Quick Start**

### Step 1: Start the Development Server

```bash
pnpm dev
```

The server will start on **http://localhost:3000** and **http://localhost:3100** (mock backend).

### Step 2: Log In

Open http://localhost:3000 in your browser

**Test Credentials:**
```
Email: admin@platform.local
Password: Admin123!
```

### Step 3: Test the Audit Log Endpoint

Once logged in, you should be able to access:
- http://localhost:3000/dashboard/audit-log (or wherever audit logs are in your app)
- The network request to `/api/proxy/audit-log?page=1&pageSize=10` should now return **200 OK** with data

---

## 🔍 **Verify Everything is Working**

### Check 1: Environment Variables Loaded
```bash
# After starting dev server, you should see:
# - No AUTH_SECRET errors
# - No "missing secret" errors
```

### Check 2: Authentication Flow
1. Go to http://localhost:3000/login
2. Enter credentials above
3. Should redirect to dashboard
4. Session should be created with access token

### Check 3: API Requests
Open browser DevTools → Network tab

Expected behavior:
- ✅ `/login` POST → 200 (credentials accepted)
- ✅ `/api/auth/session` GET → 200 (session exists)
- ✅ `/api/auth/providers` GET → 200 (auth configured)
- ✅ `/api/proxy/audit-log` GET → 200 (proxied request works)

---

## 📁 **Available Mock Accounts**

### Account 1: Platform Admin
```
Email: admin@platform.local
Password: Admin123!
Permissions: All (admin role)
Tenants: Acme Corp, Globex Inc
```

### Account 2: Manager
```
Email: manager@platform.local
Password: Manager123!
Permissions: Limited manager permissions
Tenants: Acme Corp
```

### Account 3: Employee
```
Email: employee@platform.local
Password: Employee123!
Permissions: Minimal permissions
Tenants: Acme Corp
```

---

## 🔧 **Troubleshooting**

### Issue: Still Getting 500 Errors

**Solution 1: Restart Dev Server**
```bash
# Stop the server (Ctrl+C)
# Clear build cache
rm -rf .next

# Restart
pnpm dev
```

**Solution 2: Clear Browser Cache**
- Press F12 (Developer Tools)
- Settings (⚙️) → Application → Clear storage
- Hard refresh: Ctrl+Shift+R

**Solution 3: Verify Login**
- Check that you're logged in (look for user profile menu)
- If redirected to login, log in with correct credentials
- Check browser console for auth errors

### Issue: "Session Error" or "Auth Error"

This means the session doesn't have a valid access token.

**Fix:**
1. Log out (or clear cookies)
2. Log in again with the correct credentials
3. Wait for session to be established
4. Try the request again

### Issue: 401 Unauthorized on Proxy Request

The access token is invalid or expired.

**Fix:**
1. Make sure you're using the admin account
2. Check that session was created successfully
3. Log in again

---

## 📊 **Testing the API Endpoints**

### Test 1: Auth Endpoints
```bash
# Test login directly (without UI)
curl -X POST http://localhost:3100/api/mock-backend/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@platform.local","password":"Admin123!"}'

# Response should include:
# {
#   "code": "S_200_AUTH_LOGIN_OK",
#   "message": "...",
#   "data": {
#     "user": {...},
#     "accessToken": "...",
#     "refreshToken": "...",
#     "accessTokenExpires": ...,
#     "roles": [...],
#     "permissions": [...],
#     "tenants": [...]
#   }
# }
```

### Test 2: Protected Audit Log Endpoint
```bash
# Replace TOKEN with the accessToken from login response above
curl -X GET "http://localhost:3100/api/mock-backend/audit-log?page=1&pageSize=10" \
  -H "Authorization: Bearer TOKEN" \
  -H "X-Tenant-Id: acme"

# Response should include:
# {
#   "code": "S_200_AUDIT_LIST_OK",
#   "message": "...",
#   "data": {...}
# }
```

### Test 3: Proxy Endpoint (Via Web)
```bash
# This works after you're logged in via browser:
curl -X GET "http://localhost:3000/api/proxy/audit-log?page=1&pageSize=10" \
  -H "Cookie: your-session-cookie"

# Should return data (200 OK)
```

---

## 🎯 **Next Steps**

1. **Verify Everything Works**
   - [ ] Start dev server
   - [ ] Log in successfully
   - [ ] Access audit-log page
   - [ ] Check network requests in DevTools

2. **Test All Endpoints**
   - [ ] Test each API endpoint listed in `src/constants/apiendpoints.ts`
   - [ ] Verify auth, users, employees endpoints work
   - [ ] Check filter, pagination, search functionality

3. **Update Other Services** (if needed)
   - Review any other services/components with hardcoded endpoints
   - Update them to use `API_ENDPOINTS` constant
   - See `src/constants/API_ENDPOINTS_GUIDE.md` for examples

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: centralized API endpoints and auth setup"
   ```

---

## 📝 **Environment Variables Reference**

Your `.env.local` has:

```bash
# Authentication secret (never commit this!)
AUTH_SECRET=gN7Gh9qQeRYglD9oiZZDOLEroPtOrNZWKLQD4PNi1Rc=

# Backend URLs (currently mock backend for local dev)
AUTH_API_URL=http://localhost:3100/api/mock-backend
API_URL_DEV=http://localhost:3100/api/mock-backend
NEXT_PUBLIC_API_URL=http://localhost:3100/api/mock-backend

# To be set for staging/production
API_URL_STAGING=
API_URL_PROD=
```

**For Real Backend Later:**
```bash
AUTH_API_URL=https://your-backend.com/api
API_URL_DEV=https://dev-backend.com/api
API_URL_STAGING=https://staging-backend.com/api
API_URL_PROD=https://api.yourdomain.com
```

---

## 🔐 **Security Notes**

1. **Never commit `.env.local`** - It's in `.gitignore` for a reason
2. **Generate new AUTH_SECRET for production** - Run `openssl rand -base64 32`
3. **Use environment variables in CI/CD** - Set via platform secrets, not files
4. **Rotate tokens regularly** - Implement token rotation in production
5. **Use HTTPS in production** - Secure credentials in transit

---

## 📞 **Need Help?**

Check these files for debugging:
- `DEBUG_GUIDE.md` - Detailed debugging steps
- `FIXES_APPLIED.md` - Summary of what was fixed
- `src/constants/API_ENDPOINTS_GUIDE.md` - How to use centralized endpoints
- `SETUP_SUMMARY.md` - Overview of API endpoints setup

---

## ✨ **You're All Set!**

Everything is configured. Just:
1. Start the dev server
2. Log in with `admin@platform.local` / `Admin123!`
3. Access the app features
4. Enjoy the clean, centralized API endpoints! 🚀

---

**Last Updated:** 2026-08-18
**Status:** ✅ Ready to go
