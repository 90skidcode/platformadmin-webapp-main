"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Save } from "lucide-react";

import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { toast } from "@/components/toast";
import { apiEndpoints } from "@/lib/api-endpoints";
import { parseApiErrorMessage } from "@/lib/api-envelope";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";

interface RoleDetailPageProps {
  params: Promise<{ roleId: string }>;
}

export interface ScreenItem {
  id: string;
  code: string;
  name: string;
  sort_order?: number;
  status?: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  permissions: string[];
  created_at?: string;
  updated_at?: string;
}

function resolveInitialMode(
  isNew: boolean,
  modeParam: string | null,
): "view" | "edit" | "create" {
  if (isNew) return "create";
  if (modeParam === "edit") return "edit";
  return "view";
}

function getRolePageTitle(
  isNew: boolean,
  mode: string,
  roleName?: string,
): string {
  if (isNew) return "Create New Role";
  if (mode === "edit") return `Edit Role: ${roleName || "Role"}`;
  return roleName || "Role Details";
}

function getRolePageSubtitle(isNew: boolean, isReadOnly: boolean): string {
  if (isNew) return "Define a new role and configure its screen permissions.";
  if (isReadOnly) return "View role metadata and screen-level access controls.";
  return "Modify role metadata and screen-level access controls.";
}

export default function RoleDetailPage({
  params,
}: Readonly<RoleDetailPageProps>) {
  const { roleId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiFetcher = useApiFetcher();

  const isNew = roleId === "new";

  const [mode, setMode] = useState<"view" | "edit" | "create">(() =>
    resolveInitialMode(isNew, searchParams.get("mode")),
  );

  const [screens, setScreens] = useState<ScreenItem[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
  });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch screens list
        const screensRes = await apiFetcher(apiEndpoints.screens.list);
        if (cancelled) return;
        if (screensRes.ok) {
          const screensJson = await screensRes.json().catch(() => null);
          const rawScreens = (screensJson?.data?.items ??
            screensJson?.data?.data ??
            screensJson?.data ??
            []) as ScreenItem[];
          const sorted = [...rawScreens].sort(
            (a, b) =>
              (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
              a.code.localeCompare(b.code),
          );
          setScreens(sorted);
        }

        // 2. If not new, fetch role details
        if (!isNew) {
          const roleRes = await apiFetcher(apiEndpoints.roles.byId(roleId));
          if (cancelled) return;
          if (!roleRes.ok) {
            setError(`Failed to load role (${roleRes.status})`);
            setLoading(false);
            return;
          }
          const roleJson = await roleRes.json().catch(() => null);
          const roleData = (roleJson?.data ?? roleJson) as RoleRecord;
          setFormData({
            name: roleData.name || "",
            description: roleData.description || "",
            status: roleData.status || "active",
          });
          setPermissions(
            Array.isArray(roleData.permissions) ? roleData.permissions : [],
          );
        }
      } catch {
        if (!cancelled) {
          setError("Network error while loading role data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [apiFetcher, isNew, roleId]);

  const isReadOnly = mode === "view";
  const pageTitle = getRolePageTitle(isNew, mode, formData.name);
  const pageSubtitle = getRolePageSubtitle(isNew, isReadOnly);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePermissionToggle = (permKey: string, checked: boolean) => {
    if (isReadOnly) return;
    setPermissions((prev) => {
      if (checked) {
        return prev.includes(permKey) ? prev : [...prev, permKey];
      }
      return prev.filter((p) => p !== permKey);
    });
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) {
      errs.name = "Role name is required.";
    } else if (formData.name.trim().length < 2) {
      errs.name = "Role name must be at least 2 characters.";
    } else if (formData.name.trim().length > 50) {
      errs.name = "Role name cannot exceed 50 characters.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || saving) return;

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        permissions,
      };

      const url = isNew
        ? apiEndpoints.roles.list
        : apiEndpoints.roles.byId(roleId);
      const method = isNew ? "POST" : "PATCH";

      const res = await apiFetcher(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(parseApiErrorMessage(body, res.status));
      }

      toast({
        variant: "success",
        title: isNew
          ? "Role created successfully"
          : "Role updated successfully",
      });
      router.push("/role-manager");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save role. Please try again.";
      toast({
        variant: "error",
        title: msg,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/role-manager">
            <Button variant="outline" size="icon" aria-label="Back to Roles">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{pageTitle}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
          </div>
        </div>

        {/* View Mode -> Toggle to Edit Mode */}
        {isReadOnly && !loading && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode("edit")}
            className="gap-1.5"
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-6 w-36" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full md:col-span-2" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <Skeleton className="mb-4 h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Section 1: Role Information */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">
              Role Information
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Role Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role-name" className="text-xs font-semibold">
                  Role Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="role-name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  disabled={isReadOnly}
                  placeholder="e.g. Super Admin"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <span className="text-xs text-destructive">
                    {errors.name}
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role-status" className="text-xs font-semibold">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleInputChange("status", val)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="role-status" aria-label="Status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label
                  htmlFor="role-description"
                  className="text-xs font-semibold"
                >
                  Description
                </Label>
                <Textarea
                  id="role-description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Describe the responsibilities and scope of this role..."
                  aria-invalid={!!errors.description}
                />
                {errors.description && (
                  <span className="text-xs text-destructive">
                    {errors.description}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Permissions Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/30 px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">
                Screen Permissions
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure read and write permissions for each screen module.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Screen Name
                    </th>
                    <th scope="col" className="px-6 py-4 text-center">
                      Read
                    </th>
                    <th scope="col" className="px-6 py-4 text-center">
                      Write
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {screens.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-6 text-center text-muted-foreground"
                      >
                        No screens available.
                      </td>
                    </tr>
                  ) : (
                    screens.map((screen) => {
                      const readKey = `${screen.code}.R`;
                      const writeKey = `${screen.code}.W`;
                      const hasRead = permissions.includes(readKey);
                      const hasWrite = permissions.includes(writeKey);

                      return (
                        <tr
                          key={screen.id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          {/* Screen Name */}
                          <td className="px-6 py-4 font-medium text-foreground">
                            <span>{screen.name}</span>
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              ({screen.code})
                            </span>
                          </td>

                          {/* Read Checkbox */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                id={readKey}
                                aria-label={`${screen.name} Read`}
                                checked={hasRead}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) =>
                                  handlePermissionToggle(readKey, !!checked)
                                }
                              />
                            </div>
                          </td>

                          {/* Write Checkbox */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                id={writeKey}
                                aria-label={`${screen.name} Write`}
                                checked={hasWrite}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) =>
                                  handlePermissionToggle(writeKey, !!checked)
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Submit Action */}
            {!isReadOnly && (
              <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
                <Link href="/role-manager">
                  <Button type="button" variant="outline" disabled={saving}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={saving} className="gap-1.5">
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {isNew ? "Create Role" : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
