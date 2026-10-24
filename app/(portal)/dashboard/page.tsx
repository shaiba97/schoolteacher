"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck, ClipboardList, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeacherDashboard } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherDashboard } from "@/lib/api/types";
import { formatTimeLocale } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-provider";

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

export default function TeacherDashboardPage() {
  const { t, locale } = useI18n();
  const [data, setData] = React.useState<TeacherDashboard | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    getTeacherDashboard().then(
      (dashboard) => {
        setData(dashboard);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(errorMessage(cause, t("dashboard.loadError")));
        setLoading(false);
      },
    );
    // t is stable per locale; fetching once per mount is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleRetry() {
    setLoading(true);
    void load();
  }

  if (loading && !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const oldestPending = data.pendingMarksQueue.find((exam) => exam.pendingCount > 0) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{data.year.name}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t("dashboard.welcome", { name: data.teacherName })}</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardList size={14} aria-hidden /> {t("dashboard.classesToday")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data.classesToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarCheck size={14} aria-hidden /> {t("dashboard.pendingAttendance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data.pendingAttendance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GraduationCap size={14} aria-hidden /> {t("dashboard.pendingMarks")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data.pendingMarks}</p>
          </CardContent>
        </Card>
      </div>

      {(data.nextSession || oldestPending) && (
        <div className="flex flex-wrap gap-2">
          {data.nextSession && (
            <Link
              href={`/attendance?classId=${data.nextSession.classId}`}
              className={buttonVariants({ variant: "default" })}
            >
              {t("dashboard.takeAttendanceCta", { className: data.nextSession.className })} <ArrowRight size={14} aria-hidden />
            </Link>
          )}
          {oldestPending && (
            <Link
              href={`/exams/${oldestPending.examId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("dashboard.enterMarksCta", { examName: oldestPending.examName })} <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("dashboard.todaysSchedule")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.todaySchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.noPeriodsToday")}</p>
          ) : (
            <ol className="divide-y rounded-lg border">
              {data.todaySchedule.map((entry, index) => (
                <li
                  key={`${entry.periodNo}-${entry.startTime}-${index}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
                >
                  <span className="shrink-0 font-mono text-xs text-muted-foreground sm:w-32">
                    {formatTimeLocale(entry.startTime, locale)}–{formatTimeLocale(entry.endTime, locale)}
                  </span>
                  <span className="order-3 min-w-0 basis-full break-words font-medium sm:order-1 sm:flex-1 sm:truncate">
                    {entry.isBreak ? t("common.break") : (entry.subjectName ?? "—")}
                  </span>
                  {!entry.isBreak && (
                    <Badge variant="secondary" className="order-2 ml-auto shrink-0 sm:ml-0">
                      {entry.className}
                    </Badge>
                  )}
                  {entry.room && (
                    <span className="order-4 hidden text-xs text-muted-foreground sm:order-3 sm:inline">
                      {entry.room}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell size={14} className="text-muted-foreground" aria-hidden /> {t("dashboard.recentAnnouncements")}
            </CardTitle>
            <Link
              href="/announcements"
              className={`${buttonVariants({ variant: "ghost", size: "sm" })} ml-auto`}
            >
              {t("common.viewAll")}
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentAnnouncements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.noAnnouncements")}</p>
          ) : (
            <ul className="space-y-2">
              {data.recentAnnouncements.map((item) => (
                <li key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium leading-snug line-clamp-2">{item.title}</p>
                    {!item.readAt && (
                      <Badge variant="info" className="shrink-0">
                        {t("common.new")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
