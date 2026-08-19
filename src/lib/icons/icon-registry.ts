import {
  Bell,
  CheckSquare,
  Eye,
  History,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  Mail,
  Palette,
  Pencil,
  Settings,
  Trash2,
  Users,
} from "lucide-react";

/** Nav items and table row/bulk actions all reference icons by string key
 * (JSON-serializable), resolved here -- one registry, both call sites. */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  layoutDashboard: LayoutDashboard,
  users: Users,
  tasks: ListTodo,
  listTodo: ListTodo,
  checkSquare: CheckSquare,
  history: History,
  settings: Settings,
  palette: Palette,
  pencil: Pencil,
  trash: Trash2,
  mail: Mail,
  eye: Eye,
  bell: Bell,
};
