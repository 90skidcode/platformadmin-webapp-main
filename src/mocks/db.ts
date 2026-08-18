/**
 * In-memory mock backend store.
 *
 * §19 of the plan flags the real backend's login/refresh/roles contracts as
 * open assumptions. Until they're settled, `app/api/mock-backend/**` routes
 * (this repo's stand-in for "the real backend") read and write this module
 * so every layer above it -- NextAuth's `authorize()`, the BFF proxy, the
 * form/table engines, the Platform Admin screens -- is built and tested
 * against the exact shapes the plan specifies. Swapping in a real backend
 * later means changing the `API_URL` env var, nothing else.
 *
 * MOCK ONLY: plaintext password comparison, tokens are random UUIDs kept in
 * memory (reset on server restart / dev-server module reload). None of this
 * is a security pattern to carry into a real backend.
 */
/* eslint-disable sonarjs/no-hardcoded-passwords -- seed data for this mock backend, not real credentials; see the MOCK ONLY note above. */
import "server-only";

export interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  roles: string[];
  permissions: string[];
  tenants: { id: string; name: string }[];
  status: "active" | "invited" | "deactivated";
  lastLoginAt: string | null;
}

export interface MockEmployee {
  id: string;
  name: string;
  email: string;
  department: string;
  title: string;
  startDate: string;
  notes?: string;
  status: "active" | "onboarding" | "offboarded";
}

export interface MockTask {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

export interface MockAuditLogEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  timestamp: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface MockSettings {
  orgName: string;
  defaultEnvironment: "dev" | "staging" | "production";
  sessionTimeoutMinutes: number;
  notifyOnLogin: boolean;
  notifyOnRoleChange: boolean;
}

const ACCESS_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes -- short enough to exercise rotation in a dev session
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const users: MockUser[] = [
  {
    id: "user-1",
    email: "admin@platform.local",
    password: "Admin123!",
    name: "Priya Sharma",
    roles: ["platform-admin"],
    permissions: [
      "users.read",
      "users.invite",
      "users.write",
      "users.deactivate",
      "employees.read",
      "employees.write",
      "employees.delete",
      "employees.invite",
      "audit.read",
      "settings.read",
      "settings.write",
      "roles.manage",
    ],
    tenants: [
      { id: "acme", name: "Acme Corp" },
      { id: "globex", name: "Globex Inc" },
    ],
    status: "active",
    lastLoginAt: "2026-08-14T09:12:00.000Z",
  },
  {
    id: "user-2",
    email: "manager@platform.local",
    password: "Manager123!",
    name: "Arjun Mehta",
    roles: ["manager"],
    permissions: [
      "users.read",
      "users.invite",
      "employees.read",
      "employees.write",
      "employees.delete",
      "employees.invite",
      "audit.read",
      "settings.read",
    ],
    tenants: [{ id: "acme", name: "Acme Corp" }],
    status: "active",
    lastLoginAt: "2026-08-13T15:40:00.000Z",
  },
  {
    id: "user-3",
    email: "viewer@platform.local",
    password: "Viewer123!",
    name: "Divya Nair",
    roles: ["viewer"],
    permissions: [
      "users.read",
      "employees.read",
      "audit.read",
      "settings.read",
    ],
    tenants: [{ id: "acme", name: "Acme Corp" }],
    status: "active",
    lastLoginAt: "2026-08-10T11:05:00.000Z",
  },
  {
    id: "user-4",
    email: "sam.new@platform.local",
    password: "Invited123!",
    name: "Sam Fernandes",
    roles: ["viewer"],
    permissions: ["users.read", "employees.read"],
    tenants: [{ id: "acme", name: "Acme Corp" }],
    status: "invited",
    lastLoginAt: null,
  },
];

export const employees: MockEmployee[] = [
  {
    id: "emp-1",
    name: "Kavya Iyer",
    email: "kavya.iyer@acme.example",
    department: "Engineering",
    title: "Senior Frontend Engineer",
    startDate: "2024-03-11",
    status: "active",
  },
  {
    id: "emp-2",
    name: "Rahul Verma",
    email: "rahul.verma@acme.example",
    department: "Platform",
    title: "Staff Engineer",
    startDate: "2022-07-01",
    status: "active",
  },
  {
    id: "emp-3",
    name: "Meera Krishnan",
    email: "meera.krishnan@acme.example",
    department: "Design",
    title: "Product Designer",
    startDate: "2026-08-01",
    status: "onboarding",
  },
  {
    id: "emp-4",
    name: "Ibrahim Khan",
    email: "ibrahim.khan@acme.example",
    department: "Engineering",
    title: "Engineering Manager",
    startDate: "2021-01-18",
    status: "active",
  },
  {
    id: "emp-5",
    name: "Ananya Reddy",
    email: "ananya.reddy@acme.example",
    department: "Support",
    title: "Support Lead",
    startDate: "2023-11-20",
    status: "offboarded",
  },
];

export const todos: MockTask[] = [
  { id: 1, userId: 1, title: "delectus aut autem", completed: false },
  {
    id: 2,
    userId: 1,
    title: "quis ut nam facilis et officia qui",
    completed: false,
  },
  { id: 3, userId: 1, title: "fugiat veniam minus", completed: false },
  { id: 4, userId: 1, title: "et porro tempora", completed: true },
  {
    id: 5,
    userId: 1,
    title: "laboriosam mollitia et enim quasi adipisci quia provident illum",
    completed: false,
  },
  {
    id: 6,
    userId: 1,
    title: "qui ullam ratione quibusdam voluptatem quia omnis",
    completed: false,
  },
  {
    id: 7,
    userId: 1,
    title: "illo expedita consequatur quia in",
    completed: false,
  },
  { id: 8, userId: 1, title: "quo adipisci enim quam ut ab", completed: true },
  { id: 9, userId: 1, title: "molestiae perspiciatis ipsa", completed: false },
  {
    id: 10,
    userId: 1,
    title: "illo est ratione doloremque quia maiores aut",
    completed: true,
  },
];

export const auditLog: MockAuditLogEntry[] = [
  {
    id: "audit-1",
    actor: "admin@platform.local",
    action: "user.invite",
    entity: "user-4",
    timestamp: "2026-08-12T10:02:00.000Z",
    after: { email: "sam.new@platform.local", roles: ["viewer"] },
  },
  {
    id: "audit-2",
    actor: "manager@platform.local",
    action: "employee.create",
    entity: "emp-3",
    timestamp: "2026-08-13T08:41:00.000Z",
    after: { name: "Meera Krishnan", status: "onboarding" },
  },
  {
    id: "audit-3",
    actor: "admin@platform.local",
    action: "employee.update",
    entity: "emp-5",
    timestamp: "2026-08-13T17:15:00.000Z",
    before: { status: "active" },
    after: { status: "offboarded" },
  },
  {
    id: "audit-4",
    actor: "admin@platform.local",
    action: "settings.update",
    entity: "settings",
    timestamp: "2026-08-14T09:30:00.000Z",
    before: { sessionTimeoutMinutes: 30 },
    after: { sessionTimeoutMinutes: 60 },
  },
];

export const settings: MockSettings = {
  orgName: "Acme Corp",
  defaultEnvironment: "staging",
  sessionTimeoutMinutes: 60,
  notifyOnLogin: true,
  notifyOnRoleChange: true,
};

interface TokenRecord {
  userId: string;
  expiresAt: number;
}

const accessTokens = new Map<string, TokenRecord>();
const refreshTokens = new Map<string, TokenRecord>();

export function findUserByEmail(email: string): MockUser | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): MockUser | undefined {
  return users.find((u) => u.id === id);
}

export function issueTokenPair(userId: string) {
  const accessToken = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();
  const accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL_MS;
  accessTokens.set(accessToken, { userId, expiresAt: accessTokenExpires });
  refreshTokens.set(refreshToken, {
    userId,
    expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
  });
  return { accessToken, refreshToken, accessTokenExpires };
}

/** Rotates a refresh token: the old one is invalidated, a new pair is issued. */
export function rotateTokens(refreshToken: string) {
  const record = refreshTokens.get(refreshToken);
  if (!record || record.expiresAt < Date.now()) return null;
  refreshTokens.delete(refreshToken);
  return issueTokenPair(record.userId);
}

export function verifyAccessToken(bearerToken: string | null): MockUser | null {
  if (!bearerToken) return null;
  const record = accessTokens.get(bearerToken);
  if (!record || record.expiresAt < Date.now()) return null;
  return findUserById(record.userId) ?? null;
}

export function touchLastLogin(userId: string) {
  const user = findUserById(userId);
  if (user) user.lastLoginAt = new Date().toISOString();
}
