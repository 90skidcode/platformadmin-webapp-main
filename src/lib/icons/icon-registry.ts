import {
  Bell,
  Eye,
  History,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  MousePointerClick,
  Palette,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

/** Nav items and table row/bulk actions all reference icons by string key
 * (JSON-serializable), resolved here -- one registry, both call sites. */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  layoutDashboard: LayoutDashboard,
  users: Users,
  history: History,
  shieldCheck: ShieldCheck,
  settings: Settings,
  palette: Palette,
  pencil: Pencil,
  plus: Plus,
  trash: Trash2,
  mail: Mail,
  eye: Eye,
  bell: Bell,
  mousePointerClick: MousePointerClick,
};
