"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createTeacherAttendanceSession, listTeacherAttendanceSessions } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherAttendanceRow } from "@/lib/api/types";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { todayISO } from "@/lib/utils";

function statusBadge(row: TeacherAttendanceRow) {
  if (!row.session) return <Badge variant="muted">Not started</Badge>;
  if (row.session.status === "SUBMITTED") return <Badge variant="success">Submitted</Badge>;
  return <Badge variant="warning">In progress</Badge>;
}

function periodLabel(row: TeacherAttendanceRow): string {
  if (row.periodNo === null || row.periodNo === undefined) return "Whole day";
  const band =
    row.startTime && row.endTime ? ` · ${row.startTime}–${row.endTime}` : "";
  const subject = row.subjectName ? ` · ${row.subjectName}` : "";
  return `Period ${row.periodNo}${band}${subject}`;
}

export function AttendanceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") ?? "";
  const [date, setDate] = React.useState(todayISO());
  // Quick-action preselect (?classId=) initializes the filter directly —
  // no sync effect needed.
  const [classFilter, setClassFilter] = React.useState(initialClassId);
  const [rows, setRows] = React.useState<TeacherAttendanceRow[]>([]);
  const [weekday, setWeekday] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [creatingId, setCreatingId] = React.useState("");

  const load = React.useCallback((targetDate: string) => {
    listTeacherAttendanceSessions(targetDate).then(
      (res) => {
        setRows(res.rows);
        setWeekday(res.weekday);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : "Unable to load sessions");
        setLoading(false);
      },
    );
  }, []);

  React.useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Live updates: another surface marking attendance refreshes the session
  // list without a manual reload; every reconnect backfills missed events.
  useRealtimeEvent(["attendance.marked", "attendance_updated"], {
    onEvent: () => load(date),
    onReconnect: () => load(date),
  });

  function handleRetry() {
    setLoading(true);
    load(date);
  }

  function handleDateChange(value: string) {
    if (!value) return;
    setDate(value);
    setLoading(true);
  }

  // Rows are per period since individual period sessions landed, so one
  // class appears once per period here — dedupe to one option per class.
  const classOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return rows.flatMap((row) => {
      if (seen.has(row.classId)) return [];
      seen.add(row.classId);
      return [{ id: row.classId, name: row.className }];
    });
  }, [rows]);

  const visibleRows = classFilter ? rows.filter((row) => row.classId === classFilter) : rows;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Same-day editing only — past sessions lock automatically.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="attendance-date" className="text-sm font-medium">Date</label>
          <input
            id="attendance-date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(event) => handleDateChange(event.target.value)}
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="attendance-class" className="text-sm font-medium">Class</label>
          <select
            id="attendance-class"
            value={classFilter}
            onChange={(event) => {
              setClassFilter(event.target.value);
              const params = new URLSearchParams(searchParams.toString());
              if (event.target.value) params.set("classId", event.target.value);
              else params.delete("classId");
              router.replace(`/attendance${params.toString() ? `?${params.toString()}` : ""}`);
            }}
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="">All classes</option>
            {classOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        {weekday && <p className="pb-2 text-sm text-muted-foreground">{weekday}</p>}
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : visibleRows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <CalendarCheck size={20} className="mx-auto text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">No sessions</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No classes scheduled for this teacher on this date.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleRows.map((row) => {
            const key = `${row.classId}:${row.periodNo ?? "whole"}`;
            return (
            <Card key={key}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm">
                    {row.className} · {periodLabel(row)}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {statusBadge(row)}
                    {!row.editable && (
                      <Badge variant="muted">
                        <Lock size={12} aria-hidden /> Locked
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {row.session ? `${row.session.recordCount} marked` : "No session recorded yet."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {row.session ? (
                    <Link
                      href={`/attendance/${row.session.id}`}
                      className={buttonVariants({ variant: row.editable ? "default" : "outline", size: "sm" })}
                    >
                      {row.editable ? "Take attendance" : "View session"}
                    </Link>
                  ) : row.editable && row.periodNo !== null && row.periodNo !== undefined ? (
                    <TakeSessionButton
                      classId={row.classId}
                      periodNo={row.periodNo}
                      date={date}
                      onCreated={(sessionId) => router.push(`/attendance/${sessionId}`)}
                      onBusyChange={setCreatingId}
                      busy={creatingId === key}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No session recorded.</span>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TakeSessionButton({
  classId,
  periodNo,
  date,
  onCreated,
  onBusyChange,
  busy,
}: {
  classId: string;
  periodNo: number;
  date: string;
  onCreated: (sessionId: string) => void;
  onBusyChange: (id: string) => void;
  busy: boolean;
}) {
  const [error, setError] = React.useState("");

  async function handleCreate() {
    onBusyChange(`${classId}:${periodNo}`);
    setError("");
    try {
      const session = await createTeacherAttendanceSession({ classId, periodNo, date });
      onCreated(session.id);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to start session");
      onBusyChange("");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={() => void handleCreate()} disabled={busy}>
        {busy ? "Starting…" : "Start session"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
