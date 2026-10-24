"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listOwnAttendance } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { StaffAttendanceHistory } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/locale-provider";
import { formatDate, formatTimeLocale } from "@/lib/utils";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function statusVariant(status: string): "success" | "muted" | "secondary" {
  if (status === "PRESENT") return "success";
  if (status === "ABSENT") return "muted";
  return "secondary";
}

const STATUS_KEYS: Record<string, "attendanceHistory.statusPRESENT" | "attendanceHistory.statusABSENT" | "attendanceHistory.statusLEAVE"> = {
  PRESENT: "attendanceHistory.statusPRESENT",
  ABSENT: "attendanceHistory.statusABSENT",
  LEAVE: "attendanceHistory.statusLEAVE",
};

/** Format "2026-05" as a month name in the active locale. */
function monthTitle(month: string, locale: string): string {
  const [year, mon] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, mon - 1, 1)),
  );
}

export function AttendanceHistory() {
  const { t, locale } = useI18n();
  const [month, setMonth] = React.useState(currentMonth);
  const [data, setData] = React.useState<StaffAttendanceHistory | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback((targetMonth: string) => {
    listOwnAttendance(targetMonth).then(
      (res) => {
        setData(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : t("attendanceHistory.loadError"));
        setLoading(false);
      },
    );
  }, []);

  React.useEffect(() => {
    load(month);
  }, [month, load]);

  function moveMonth(delta: number) {
    setMonth((current) => shiftMonth(current, delta));
    setLoading(true);
  }

  if (loading && !data) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        <span>{error}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => { setLoading(true); load(month); }}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const entries = data?.entries ?? [];
  const summary = data?.summary ?? { present: 0, absent: 0, leave: 0 };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">{t("attendanceHistory.title", { month: monthTitle(month, locale) })}</CardTitle>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-10 px-3" onClick={() => moveMonth(-1)} aria-label={t("attendanceHistory.prevMonth")}>
              ‹
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => { setMonth(currentMonth()); setLoading(true); }}
            >
              {t("attendanceHistory.thisMonth")}
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-10 px-3" onClick={() => moveMonth(1)} aria-label={t("attendanceHistory.nextMonth")}>
              ›
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="success">{t("attendanceHistory.present", { count: summary.present })}</Badge>
          <Badge variant="muted">{t("attendanceHistory.absent", { count: summary.absent })}</Badge>
          <Badge variant="secondary">{t("attendanceHistory.leave", { count: summary.leave })}</Badge>
        </div>
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("attendanceHistory.noEntries")}</p>
        ) : (
          <ol className="divide-y rounded-xl border bg-card">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <span className="text-sm font-medium">{formatDate(entry.attendanceDate, locale)}</span>
                <Badge variant={statusVariant(entry.status)}>{t(STATUS_KEYS[entry.status] ?? "attendanceHistory.statusLEAVE")}</Badge>
                {entry.leftAt && (
                  <span className="text-xs text-muted-foreground">{t("attendanceHistory.leftAt", { time: formatTimeLocale(entry.leftAt, locale) })}</span>
                )}
                {entry.remarks && (
                  <span className="w-full truncate text-xs text-muted-foreground">{entry.remarks}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
