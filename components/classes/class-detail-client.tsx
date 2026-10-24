"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTeacherClassDetail } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherClassDetail } from "@/lib/api/types";
import { formatTimeLocale } from "@/lib/utils";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const DAY_KEYS: Record<string, MessageKey> = {
  MON: "timetable.dayMon",
  TUE: "timetable.dayTue",
  WED: "timetable.dayWed",
  THU: "timetable.dayThu",
  FRI: "timetable.dayFri",
  SAT: "timetable.daySat",
  SUN: "timetable.daySun",
};

export function ClassDetailClient({ classId }: { classId: string }) {
  const { t, locale } = useI18n();
  const [detail, setDetail] = React.useState<TeacherClassDetail | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("students");

  const load = React.useCallback(() => {
    getTeacherClassDetail(classId).then(
      (res) => {
        setDetail(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : t("classes.loadDetailError"));
        setLoading(false);
      },
    );
  }, [classId]);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleRetry() {
    setLoading(true);
    load();
  }

  const timetableByDay = React.useMemo(() => {
    const groups = new Map<string, NonNullable<TeacherClassDetail["timetable"]>>();
    for (const entry of detail?.timetable ?? []) {
      const list = groups.get(entry.dayOfWeek) ?? [];
      list.push(entry);
      groups.set(entry.dayOfWeek, list);
    }
    return DAY_ORDER.filter((day) => groups.has(day)).map((day) => ({
      day,
      entries: groups.get(day)!,
    }));
  }, [detail]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link href="/classes" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden /> {t("classes.backTo")}
        </Link>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error || t("classes.notFound")}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/classes" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden /> {t("classes.backTo")}
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{detail.class.className}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.year.name} ·{" "}
          {detail.students.length === 1
            ? t("classes.studentOne")
            : t("classes.studentMany", { count: detail.students.length })}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="students">{t("classes.tabStudents")}</TabsTrigger>
          <TabsTrigger value="subjects">{t("classes.tabSubjects")}</TabsTrigger>
          <TabsTrigger value="timetable">{t("classes.tabTimetable")}</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          {detail.students.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.noStudents")}</p>
          ) : (
            <ol className="divide-y rounded-xl border bg-card">
              {detail.students.map(({ student }) => (
                <li key={student.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {student.firstName} {student.middleName ? `${student.middleName} ` : ""}{student.lastName ?? ""}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{student.roleNumber}</span>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="subjects">
          <div className="space-y-2">
            {detail.mySubjects.map((subject) => (
              <Card key={subject.classSubjectId}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <span className="text-sm font-medium">{subject.subjectName}</span>
                  <Link
                    href={`/exams?subject=${subject.classSubjectId}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <GraduationCap size={14} aria-hidden /> {t("classes.examsAndMarks")}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timetable">
          {timetableByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("classes.noTimetable")}</p>
          ) : (
            <div className="space-y-3">
              {timetableByDay.map(({ day, entries }) => (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="text-sm">{t(DAY_KEYS[day] ?? "timetable.dayMon")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="divide-y rounded-lg border">
                      {entries.map((entry) => (
                        <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-sm">
                          <span className="w-[68px] shrink-0 font-mono text-xs text-muted-foreground sm:w-24">
                            {formatTimeLocale(entry.startTime, locale)}–{formatTimeLocale(entry.endTime, locale)}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {entry.isBreak ? (
                              <span className="text-muted-foreground">{t("common.break")}</span>
                            ) : (
                              <span className="font-medium">{entry.subjectName ?? "—"}</span>
                            )}
                          </span>
                          {!entry.isBreak && entry.teacherName && (
                            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground sm:flex-none">
                              {entry.teacherName}
                              {entry.isMine && <Badge variant="info" className="ml-1.5">{t("classes.mine")}</Badge>}
                            </span>
                          )}
                          {entry.room && (
                            <span className="hidden text-xs text-muted-foreground sm:inline">{entry.room}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
