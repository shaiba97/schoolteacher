"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeacherTimetable } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherTimetableEntry } from "@/lib/api/types";
import { formatTime } from "@/lib/utils";

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const DAY_LABELS: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

export function TimetableClient() {
  const [entries, setEntries] = React.useState<TeacherTimetableEntry[]>([]);
  const [teacherName, setTeacherName] = React.useState("");
  const [yearName, setYearName] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    getTeacherTimetable().then(
      (res) => {
        setEntries(res.entries);
        setTeacherName(res.teacherName);
        setYearName(res.year.name);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : "Unable to load timetable");
        setLoading(false);
      },
    );
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleRetry() {
    setLoading(true);
    load();
  }

  const byDay = React.useMemo(() => {
    const groups = new Map<string, TeacherTimetableEntry[]>();
    for (const entry of entries) {
      const list = groups.get(entry.dayOfWeek) ?? [];
      list.push(entry);
      groups.set(entry.dayOfWeek, list);
    }
    return DAY_ORDER.filter((day) => groups.has(day)).map((day) => ({
      day,
      entries: groups.get(day)!,
    }));
  }, [entries]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{yearName}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Timetable</h1>
          {teacherName && <p className="mt-1 text-sm text-muted-foreground">{teacherName}</p>}
        </div>
        {byDay.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer size={14} aria-hidden /> Print
          </Button>
        )}
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive print:hidden">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      )}

      {byDay.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">No timetable entries assigned.</p>
      ) : (
        <div className="space-y-3">
          {byDay.map(({ day, entries: dayEntries }) => (
            <Card key={day} className="break-inside-avoid">
              <CardHeader>
                <CardTitle className="text-sm">{DAY_LABELS[day] ?? day}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="divide-y rounded-lg border">
                  {dayEntries.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-sm">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground sm:w-32">
                        {formatTime(entry.startTime)}–{formatTime(entry.endTime)}
                      </span>
                      <span className="order-3 min-w-0 basis-full break-words sm:order-1 sm:flex-1 sm:truncate">
                        {entry.isBreak ? (
                          <span className="text-muted-foreground">Break</span>
                        ) : (
                          <>
                            <span className="font-medium">{entry.subjectName ?? "—"}</span>
                            <span className="text-muted-foreground"> · {entry.className}</span>
                          </>
                        )}
                      </span>
                      <Badge variant="outline" className="order-2 ml-auto shrink-0 sm:ml-0">
                        P{entry.periodNo}
                      </Badge>
                      {entry.room && (
                        <span className="order-4 hidden text-xs text-muted-foreground sm:order-3 sm:inline">
                          {entry.room}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
