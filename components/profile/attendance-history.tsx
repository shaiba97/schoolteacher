"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listOwnAttendance } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { StaffAttendanceHistory } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

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

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function AttendanceHistory() {
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
        setError(cause instanceof ApiError ? cause.message : "Unable to load attendance");
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
          Retry
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
          <CardTitle className="text-sm">My attendance · {month}</CardTitle>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-10 px-3" onClick={() => moveMonth(-1)} aria-label="Previous month">
              ‹
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => { setMonth(currentMonth()); setLoading(true); }}
            >
              This month
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-10 px-3" onClick={() => moveMonth(1)} aria-label="Next month">
              ›
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="success">Present · {summary.present}</Badge>
          <Badge variant="muted">Absent · {summary.absent}</Badge>
          <Badge variant="secondary">Leave · {summary.leave}</Badge>
        </div>
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance recorded for this month yet.</p>
        ) : (
          <ol className="divide-y rounded-xl border bg-card">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <span className="text-sm font-medium">{formatDate(entry.attendanceDate)}</span>
                <Badge variant={statusVariant(entry.status)}>{statusLabel(entry.status)}</Badge>
                {entry.leftAt && (
                  <span className="text-xs text-muted-foreground">Left {entry.leftAt}</span>
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
