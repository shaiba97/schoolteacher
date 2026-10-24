"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  CalendarCheck,
  GraduationCap,
  LayoutDashboard,
  Table2,
  UserRound,
  UsersRound,
  BanknoteIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";

const ITEMS: Array<{ href: string; label: MessageKey; icon: typeof LayoutDashboard }> = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "nav.classes", icon: BookOpenCheck },
  { href: "/attendance", label: "nav.attendance", icon: CalendarCheck },
  { href: "/exams", label: "nav.exams", icon: GraduationCap },
  { href: "/timetable", label: "nav.timetable", icon: Table2 },
  { href: "/students", label: "nav.students", icon: UsersRound },
  { href: "/payroll", label: "nav.payroll", icon: BanknoteIcon },
  { href: "/announcements", label: "nav.announcements", icon: Bell },
  { href: "/profile", label: "nav.profile", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav aria-label={t("nav.label")} className="flex flex-col gap-1 overflow-visible p-2">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-active text-sidebar-active-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground",
            )}
          >
            {active ? (
              <span className="w-1 shrink-0 rounded-r bg-sidebar-indicator" aria-hidden />
            ) : null}
            <Icon size={16} className={active ? undefined : "text-sidebar-icon"} aria-hidden />
            <span className="whitespace-nowrap">{t(item.label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
