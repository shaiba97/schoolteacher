"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarCheck,
  GraduationCap,
  LayoutDashboard,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";

const ITEMS: Array<{ href: string; label: MessageKey; icon: typeof LayoutDashboard }> = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "nav.classesShort", icon: BookOpenCheck },
  { href: "/attendance", label: "nav.attendance", icon: CalendarCheck },
  { href: "/exams", label: "nav.examsShort", icon: GraduationCap },
  { href: "/timetable", label: "nav.timetable", icon: Table2 },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-sidebar print:hidden md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-5 px-1 pt-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "text-white border-b-2 border-sidebar-indicator"
                  : "text-[#DDD6FE] hover:text-white",
              )}
            >
              <Icon size={20} aria-hidden />
              <span className="w-full truncate text-center leading-tight">{t(item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
