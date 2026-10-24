"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, UserRound, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "@/components/portal/language-toggle";
import { useI18n } from "@/lib/i18n/locale-provider";
import { listMyNotifications } from "@/lib/api/teachers";

function useIsMobile(): boolean {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return mobile;
}

export function MobileTopBar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [unread, setUnread] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);

  // Badge data is mobile-only (desktop keeps the sidebar entry): no fetch,
  // no unread state, and no stale badge on larger screens. Revalidates on
  // every route change so reading items in the inbox clears it.
  React.useEffect(() => {
    if (!isMobile) return;
    let cancelled = false;
    listMyNotifications().then(
      (items) => {
        if (cancelled) return;
        setUnread(Array.isArray(items) ? items.filter((item) => !item.readAt).length : 0);
        setLoaded(true);
      },
      () => {
        if (cancelled) return;
        setLoaded(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isMobile, pathname]);

  const showBadge = isMobile && loaded && unread > 0;

  const announcementsActive = pathname === "/announcements" || pathname.startsWith("/announcements/");
  const studentsActive = pathname === "/students" || pathname.startsWith("/students/");
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <div className="fixed inset-x-0 top-0 z-40 border-b border-[#FBCFE8] bg-secondary text-foreground print:hidden md:hidden">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <div className="-ml-2 flex items-center">
          <Link
            href="/students"
            aria-current={studentsActive ? "page" : undefined}
            aria-label={t("nav.studentsLabel")}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-lg text-primary hover:bg-white/60",
              studentsActive ? "bg-white/60" : "",
            )}
          >
            <UsersRound size={20} aria-hidden />
          </Link>
          <Link
            href="/announcements"
            aria-current={announcementsActive ? "page" : undefined}
            aria-label={showBadge ? t("nav.unread", { label: t("nav.announcements"), count: unread }) : t("nav.announcements")}
            className={cn(
              "relative inline-flex size-10 items-center justify-center rounded-lg text-primary hover:bg-white/60",
              announcementsActive ? "bg-white/60" : "",
            )}
          >
            <Bell size={20} aria-hidden />
            {showBadge && (
              <span className="absolute -right-0.5 -top-0.5 size-5 rounded-full bg-[#F59E0B]" aria-hidden />
            )}
          </Link>
        </div>
        <p className="hidden text-xs font-medium uppercase tracking-wider text-foreground min-[360px]:block">
          {t("portal.headerName")}
        </p>
        <div className="-mr-2 flex items-center">
          <LanguageToggle className="border-[#FBCFE8] bg-white text-foreground hover:bg-white/60 hover:text-foreground" />
          <Link
            href="/profile"
            aria-current={profileActive ? "page" : undefined}
            aria-label={t("nav.profileLabel")}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-lg text-primary hover:bg-white/60",
              profileActive ? "bg-white/60" : "",
            )}
          >
            <UserRound size={20} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
