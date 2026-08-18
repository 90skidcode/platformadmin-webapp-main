# API Endpoints Guide

This document explains how to use the centralized API endpoints configuration in your application.

## Overview

The `apiendpoints.ts` file provides a single source of truth for all API endpoint paths used throughout the application. This eliminates the need to hardcode endpoint strings in services and components.

## File Location

```
src/constants/apiendpoints.ts
```

## Quick Start

### Import the Endpoints

```typescript
import { API_ENDPOINTS } from '@/constants/apiendpoints';
```

### Use in Your Code

```typescript
// Simple endpoint
const endpoint = API_ENDPOINTS.AUTH.TRIGGER_OTP;
// Returns: "/auth/trigger-otp"

// Dynamic endpoint
const userEndpoint = API_ENDPOINTS.USER.BY_ID('user-123');
// Returns: "/user/user-123"

// In a service function
async function fetchUser(userId: string) {
  const endpoint = API_ENDPOINTS.USER.BY_ID(userId);
  const response = await get<User>(endpoint);
  return response;
}
```

## Available Endpoints

### Authentication (`API_ENDPOINTS.AUTH`)

```typescript
// Trigger OTP
API_ENDPOINTS.AUTH.TRIGGER_OTP
// → "/auth/trigger-otp"

// Resend OTP
API_ENDPOINTS.AUTH.RESEND_OTP
// → "/auth/resend-otp"

// Verify OTP
API_ENDPOINTS.AUTH.VERIFY_OTP
// → "/auth/verify-otp"

// Logout
API_ENDPOINTS.AUTH.LOGOUT
// → "/auth/logout"
```

**Usage Example:**
```typescript
import { API_ENDPOINTS } from '@/constants/apiendpoints';
import { post } from './api-client';

async function triggerOtp(phoneNumber: string) {
  const response = await post(API_ENDPOINTS.AUTH.TRIGGER_OTP, {
    phoneNumber
  });
  return response;
}
```

### User Management (`API_ENDPOINTS.USER`)

```typescript
// Get user profile
API_ENDPOINTS.USER.PROFILE
// → "/user/profile"

// Get user by ID
API_ENDPOINTS.USER.BY_ID('user-123')
// → "/user/user-123"
```

**Usage Example:**
```typescript
import { API_ENDPOINTS } from '@/constants/apiendpoints';
import { get, put } from './api-client';

// Fetch current user profile
async function getCurrentUser() {
  return await get<User>(API_ENDPOINTS.USER.PROFILE);
}

// Update user profile
async function updateProfile(data: UpdateUserInput) {
  return await put<User>(API_ENDPOINTS.USER.PROFILE, data);
}

// Get specific user
async function getUserById(userId: string) {
  return await get<User>(API_ENDPOINTS.USER.BY_ID(userId));
}
```

### Employees (`API_ENDPOINTS.EMPLOYEES`)

```typescript
// List employees
API_ENDPOINTS.EMPLOYEES.LIST
// → "/employees"

// Get employee by ID
API_ENDPOINTS.EMPLOYEES.BY_ID('emp-123')
// → "/employees/emp-123"

// Update employee
API_ENDPOINTS.EMPLOYEES.UPDATE('emp-123')
// → "/employees/emp-123"

// Delete employee
API_ENDPOINTS.EMPLOYEES.DELETE('emp-123')
// → "/employees/emp-123"
```

**Usage Example:**
```typescript
import { API_ENDPOINTS } from '@/constants/apiendpoints';
import { get, post, put, deleteRequest } from './api-client';

// List all employees
async function listEmployees() {
  return await get(API_ENDPOINTS.EMPLOYEES.LIST);
}

// Create new employee
async function createEmployee(data: EmployeeInput) {
  return await post(API_ENDPOINTS.EMPLOYEES.CREATE, data);
}

// Update employee
async function updateEmployee(employeeId: string, data: EmployeeInput) {
  return await put(API_ENDPOINTS.EMPLOYEES.UPDATE(employeeId), data);
}

// Delete employee
async function deleteEmployee(employeeId: string) {
  return await deleteRequest(API_ENDPOINTS.EMPLOYEES.DELETE(employeeId));
}
```

### Users Management (`API_ENDPOINTS.USERS`)

```typescript
// List users
API_ENDPOINTS.USERS.LIST
// → "/users"

// Get user by ID
API_ENDPOINTS.USERS.BY_ID('user-123')
// → "/users/user-123"

// Update user
API_ENDPOINTS.USERS.UPDATE('user-123')
// → "/users/user-123"

// Delete user
API_ENDPOINTS.USERS.DELETE('user-123')
// → "/users/user-123"
```

### Audit Log (`API_ENDPOINTS.AUDIT_LOG`)

```typescript
// List audit logs
API_ENDPOINTS.AUDIT_LOG.LIST
// → "/audit-log"
```

**Usage Example:**
```typescript
import { API_ENDPOINTS } from '@/constants/apiendpoints';
import { get } from './api-client';

// Fetch audit logs
async function getAuditLogs() {
  return await get(API_ENDPOINTS.AUDIT_LOG.LIST);
}
```

### Settings (`API_ENDPOINTS.SETTINGS`)

```typescript
// Get settings
API_ENDPOINTS.SETTINGS.GET
// → "/settings"

// Update settings
API_ENDPOINTS.SETTINGS.UPDATE
// → "/settings"
```

### Current User Info (`API_ENDPOINTS.ME`)

```typescript
// Get current authenticated user info
API_ENDPOINTS.ME.GET
// → "/me"
```

## Benefits

### 1. **Single Source of Truth**
All endpoints are defined in one place, making it easy to find and update them.

### 2. **Type Safety**
TypeScript ensures you're using valid endpoint names and structures.

### 3. **Easy Refactoring**
When an endpoint path changes, update it once and all references are automatically updated.

### 4. **Better Discoverability**
IDEs can auto-complete endpoint names, reducing typos and improving developer experience.

### 5. **Consistency**
Enforces a consistent naming convention across the application.

### 6. **Documentation**
The structure serves as API documentation for the frontend.

## Dynamic Endpoints

For endpoints that require parameters, use the provided functions:

```typescript
// Dynamic endpoint with parameter
const endpoint = API_ENDPOINTS.USER.BY_ID(userId);

// You can chain parameters
const employeeUpdate = API_ENDPOINTS.EMPLOYEES.UPDATE(employeeId);

// Or use the buildEndpoint helper for complex templates
import { buildEndpoint } from '@/constants/apiendpoints';

const endpoint = buildEndpoint('/resources/{resourceId}/items/{itemId}', {
  resourceId: '123',
  itemId: '456'
});
// Returns: "/resources/123/items/456"
```

## Migration Guide

### Before (Hardcoded)
```typescript
async function updateProfile(data: UpdateUserInput) {
  return await put<User>('/user/profile', data);
}
```

### After (Using API_ENDPOINTS)
```typescript
import { API_ENDPOINTS } from '@/constants/apiendpoints';

async function updateProfile(data: UpdateUserInput) {
  return await put<User>(API_ENDPOINTS.USER.PROFILE, data);
}
```

## Adding New Endpoints

When adding a new endpoint to your API:

1. **Update `apiendpoints.ts`:**
   ```typescript
   export const API_ENDPOINTS = {
     // ... existing endpoints
     REPORTS: {
       LIST: '/reports',
       BY_ID: (reportId: string) => `/reports/${reportId}`,
       EXPORT: (reportId: string) => `/reports/${reportId}/export`,
     },
   };
   ```

2. **Create service functions:**
   ```typescript
   import { API_ENDPOINTS } from '@/constants/apiendpoints';
   import { get } from './api-client';

   export async function getReports() {
     return await get(API_ENDPOINTS.REPORTS.LIST);
   }
   ```

3. **Use in components:**
   ```typescript
   import { getReports } from '@/services/reports-service';

   const reports = await getReports();
   ```

## Best Practices

1. **Always use `API_ENDPOINTS`** - Never hardcode endpoint paths in your code
2. **Group related endpoints** - Keep related endpoints together in the same namespace
3. **Use descriptive names** - Endpoint names should clearly indicate their purpose
4. **Document complex endpoints** - Add comments for endpoints with complex logic
5. **Keep it organized** - Maintain alphabetical or logical ordering within each group
6. **Use constants for values** - If you need to reuse endpoint fragments, create constants

## TypeScript Support

The exported types help with type safety:

```typescript
import type { ApiEndpoint } from '@/constants/apiendpoints';

// Function that accepts any valid endpoint
function logEndpoint(endpoint: ApiEndpoint) {
  console.log('Calling:', endpoint);
}

logEndpoint(API_ENDPOINTS.USER.PROFILE); // ✅ Valid
logEndpoint('/invalid/path'); // ❌ Type error
```

## Related Files

- **API Client:** `src/services/api-client.ts` - HTTP methods (get, post, put, patch, delete)
- **API Config:** `src/config/api.ts` - Base URL and global configuration
- **Auth Service:** `src/services/auth-service.ts` - Authentication services
- **User Service:** `src/services/user-service.ts` - User services

## Questions or Improvements?

If you need to add new endpoints or have suggestions for improvements, update the `apiendpoints.ts` file and this guide accordingly.
