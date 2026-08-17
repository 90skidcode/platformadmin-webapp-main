"use client";

import { useState } from "react";
import { Bell, Trash2, User } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { toast } from "@/components/toast";
import { TableRenderer, type TableSchema } from "@/components/table";

const virtualizedDemoData = Array.from({ length: 5000 }, (_, i) => ({
  id: `emp-${i}`,
  name: `Employee ${i}`,
  email: `employee${i}@acme.example`,
  department: ["Engineering", "Design", "Support", "Platform"][i % 4],
}));

const virtualizedDemoSchema: TableSchema = {
  id: "virtualized-demo",
  mode: "client",
  virtualize: true,
  search: { enabled: true },
  columns: [
    { accessorKey: "name", header: "Name", sortable: true },
    { accessorKey: "email", header: "Email", cell: "email" },
    { accessorKey: "department", header: "Department" },
  ],
};

// Phase 0/0b proof-of-life page: every primitive + design tokens + Toast,
// wired together with no backend, so the foundation can be reviewed on its
// own before the form/table engines and auth (later phases) build on it.
export default function Home() {
  const [notifications, setNotifications] = useState(true);

  return (
    <TooltipProvider>
      <div className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Enterprise UI System -- Phase 0 Foundation
          </h1>
          <p className="text-sm text-muted-foreground">
            Design tokens, the 14 UI primitives, and the Toast system. Nothing
            on this page talks to a backend.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Form primitives</CardTitle>
            <CardDescription>
              Input, Textarea, Label, Select, Checkbox, Switch.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name" required>
                Name
              </Label>
              <Input id="name" placeholder="Priya Sharma" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="env">Environment</Label>
              <Select defaultValue="staging">
                <SelectTrigger id="env" aria-label="Environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dev">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Optional context..." />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="agree" />
              <Label htmlFor="agree">I agree to the terms</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
              <Label htmlFor="notifications">Email notifications</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buttons, badges, avatar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() =>
                toast({
                  variant: "success",
                  title: "Saved",
                  description: "Employee created successfully.",
                })
              }
            >
              Primary + toast
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button loading>Loading</Button>
            <Badge>Default</Badge>
            <Badge variant="success">Active</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="destructive">Deactivated</Badge>
            <Avatar>
              <AvatarFallback>PS</AvatarFallback>
            </Avatar>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overlays</CardTitle>
            <CardDescription>
              Dialog, AlertDialog, DropdownMenu, Tooltip.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit employee</DialogTitle>
                  <DialogDescription>
                    This is a plain Dialog -- confirms it renders, traps focus,
                    and closes.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this employee?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      toast({
                        variant: "error",
                        title: "Deleted",
                        description: "Employee removed.",
                      })
                    }
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <User />
                  Priya S.
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell />
                </Button>
              </TooltipTrigger>
              <TooltipContent>3 unread notifications</TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Table engine -- virtualized (5,000 rows)</CardTitle>
            <CardDescription>
              {"schema.virtualize: true"} (plan §10&apos;s perf pass) -- only
              the visible window of rows exists in the DOM, scroll to see more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TableRenderer
              schema={virtualizedDemoSchema}
              data={virtualizedDemoData}
            />
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
