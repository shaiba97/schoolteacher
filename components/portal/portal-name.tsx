"use client";

import { useI18n } from "@/lib/i18n/locale-provider";

export function PortalName() {
  const { t } = useI18n();
  return (
    <p className="min-w-0 truncate text-sm font-bold uppercase tracking-wider text-foreground">
      {t("portal.headerName")}
    </p>
  );
}
