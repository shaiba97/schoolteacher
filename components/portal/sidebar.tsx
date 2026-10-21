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
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "My Classes", icon: BookOpenCheck },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/exams", label: "Exams & Marks", icon: GraduationCap },
  { href: "/timetable", label: "Timetable", icon: Table2 },
  { href: "/students", label: "Students", icon: UsersRound },
  { href: "/announcements", label: "Announcements", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Teacher portal" className="flex flex-col gap-1 overflow-visible p-2">
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
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon size={16} aria-hidden />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
