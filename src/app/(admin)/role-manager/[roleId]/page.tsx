"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Save } from "lucide-react";

import { Button, Checkbox, Input, Label, Textarea } from "@/components/ui";
import { defaultRolesData } from "@/schemas/tables/roles-table";

interface RoleDetailPageProps {
  params: Promise<{ roleId: string }>;
}

interface ScreenRow {
  id: string;
  name: string;
  readKey: string;
  writeKey: string;
}

const SCREEN_ROWS: ScreenRow[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    readKey: "dashboard_read",
    writeKey: "dashboard_write",
  },
  {
    id: "users",
    name: "User",
    readKey: "users_read",
    writeKey: "users_write",
  },
  {
    id: "profile",
    name: "Profile",
    readKey: "profile_read",
    writeKey: "profile_write",
  },
];

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

  const isNew = roleId === "new";
  const existingRole = defaultRolesData.find((r) => r.id === roleId);

  const [mode, setMode] = useState<"view" | "edit" | "create">(() =>
    resolveInitialMode(isNew, searchParams.get("mode")),
  );

  // 1. Form inputs state
  const [formData, setFormData] = useState({
    name: isNew ? "" : (existingRole?.name ?? ""),
    description: isNew ? "" : (existingRole?.description ?? ""),
    screens: isNew ? "" : (existingRole?.screens ?? "Dashboard, User, Profile"),
  });

  // 2. Permissions checkboxes state
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    () => {
      if (isNew) {
        return {
          dashboard_read: false,
          dashboard_write: false,
          users_read: false,
          users_write: false,
          profile_read: false,
          profile_write: false,
        };
      }
      return (
        (existingRole?.permissions as Record<string, boolean> | undefined) ?? {
          dashboard_read: true,
          dashboard_write: true,
          users_read: true,
          users_write: true,
          profile_read: true,
          profile_write: true,
        }
      );
    },
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedToast, setSavedToast] = useState(false);

  const isReadOnly = mode === "view";
  const pageTitle = getRolePageTitle(
    isNew,
    mode,
    formData.name || existingRole?.name,
  );
  const pageSubtitle = getRolePageSubtitle(isNew, isReadOnly);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleCheckboxChange = (fieldName: string, checked: boolean) => {
    if (isReadOnly) return;
    setPermissions((prev) => ({
      ...prev,
      [fieldName]: checked,
    }));
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

    if (!formData.description.trim()) {
      errs.description = "Role description is required.";
    } else if (formData.description.trim().length < 5) {
      errs.description = "Role description must be at least 5 characters.";
    } else if (formData.description.trim().length > 200) {
      errs.description = "Role description cannot exceed 200 characters.";
    }

    if (!formData.screens.trim()) {
      errs.screens = "Screen names are required.";
    } else if (formData.screens.trim().length < 2) {
      errs.screens = "Screen names must be at least 2 characters.";
    } else if (formData.screens.trim().length > 100) {
      errs.screens = "Screen names cannot exceed 100 characters.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!validateForm()) {
      return;
    }

    setSavedToast(true);

    setTimeout(() => {
      setSavedToast(false);
      router.push("/role-manager");
    }, 1200);
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
              {!isNew && existingRole?.code && (
                <span className="font-mono text-xs text-muted-foreground">
                  ({existingRole.code})
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
          </div>
        </div>

        {/* View Mode -> Quick Toggle to Edit Mode */}
        {isReadOnly && (
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

      {/* Unified Form */}
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
                <span className="text-xs text-destructive">{errors.name}</span>
              )}
            </div>

            {/* Screen Names */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role-screens" className="text-xs font-semibold">
                Screen Names <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-screens"
                name="screens"
                value={formData.screens}
                onChange={(e) => handleInputChange("screens", e.target.value)}
                disabled={isReadOnly}
                placeholder="e.g. Dashboard, User, Profile"
                aria-invalid={!!errors.screens}
              />
              {errors.screens && (
                <span className="text-xs text-destructive">
                  {errors.screens}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label
                htmlFor="role-description"
                className="text-xs font-semibold"
              >
                Description <span className="text-destructive">*</span>
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
                {SCREEN_ROWS.map((screen) => {
                  const hasRead = !!permissions[screen.readKey];
                  const hasWrite = !!permissions[screen.writeKey];

                  return (
                    <tr
                      key={screen.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      {/* Screen Name */}
                      <td className="px-6 py-4 font-medium text-foreground">
                        {screen.name}
                      </td>

                      {/* Read Checkbox */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            id={screen.readKey}
                            aria-label={`${screen.name} Read`}
                            checked={hasRead}
                            disabled={isReadOnly}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(screen.readKey, !!checked)
                            }
                          />
                        </div>
                      </td>

                      {/* Write Checkbox */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            id={screen.writeKey}
                            aria-label={`${screen.name} Write`}
                            checked={hasWrite}
                            disabled={isReadOnly}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(screen.writeKey, !!checked)
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Submit Action */}
          {!isReadOnly && (
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
              <div>
                {savedToast && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    ✓ Role {isNew ? "created" : "updated"} successfully!
                    Redirecting...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Link href="/role-manager">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="gap-1.5">
                  <Save className="size-4" />
                  {isNew ? "Create Role" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
