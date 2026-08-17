import { auditLog, settings } from "@/mocks/db";
import { isAuthError, requireAuth, success } from "@/mocks/http";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  return success(200, "SETTINGS_FETCH_OK", settings);
}

export async function PUT(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const before = { ...settings };
  const patch = await request.json().catch(() => ({}));
  Object.assign(settings, patch);

  auditLog.unshift({
    id: `audit-${crypto.randomUUID().slice(0, 8)}`,
    actor: auth.email,
    action: "settings.update",
    entity: "settings",
    timestamp: new Date().toISOString(),
    before,
    after: { ...settings },
  });

  return success(200, "SETTINGS_UPDATED", settings);
}
