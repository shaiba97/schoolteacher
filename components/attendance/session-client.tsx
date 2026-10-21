"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getTeacherAttendanceSession, markTeacherAttendanceSession } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherAttendanceSessionDetail } from "@/lib/api/types";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { formatDate } from "@/lib/utils";
import { Toast } from "@base-ui/react/toast";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

export function SessionClient({ sessionId }: { sessionId: string }) {
  const [detail, setDetail] = React.useState<TeacherAttendanceSessionDetail | null>(null);
  const [marks, setMarks] = React.useState<Record<string, string>>({});
  const [remarks, setRemarks] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState("");
  const [savedSnapshot, setSavedSnapshot] = React.useState("");
  const toastManager = Toast.useToastManager();

  // Key order is normalized so re-marking the same values (e.g. "Mark all
  // present" on an already-present roster) does not fake a dirty state.
  const snapshotOf = (markedValues: Record<string, string>, remarkValues: Record<string, string>) => {
    const ordered = (entries: Record<string, string>) =>
      Object.fromEntries(Object.keys(entries).sort().map((key) => [key, entries[key]]));
    return JSON.stringify({ marks: ordered(markedValues), remarks: ordered(remarkValues) });
  };

  const load = React.useCallback(() => {
    getTeacherAttendanceSession(sessionId).then(
      (res) => {
        setDetail(res);
        const initialMarks: Record<string, string> = {};
        const initialRemarks: Record<string, string> = {};
        for (const student of res.students) {
          if (student.status) initialMarks[student.studentId] = student.status;
          if (student.remarks) initialRemarks[student.studentId] = student.remarks;
        }
        setMarks(initialMarks);
        setRemarks(initialRemarks);
        setSavedSnapshot(snapshotOf(initialMarks, initialRemarks));
        setSavedAt("");
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : "Unable to load session");
        setLoading(false);
      },
    );
  }, [sessionId]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Live updates only when the form is clean: if the teacher has unsaved
  // marks, an incoming event must not discard their work — they can reload
  // manually, and the next reconnect backfills the missed state.
  useRealtimeEvent(["attendance.marked", "attendance_updated"], {
    onEvent: () => {
      if (savedSnapshot === snapshotOf(marks, remarks)) load();
    },
    onReconnect: () => {
      if (savedSnapshot === snapshotOf(marks, remarks)) load();
    },
  });

  function handleRetry() {
    setLoading(true);
    load();
  }

  function markAllPresent() {
    if (!detail) return;
    const next: Record<string, string> = {};
    for (const student of detail.students) next[student.studentId] = "PRESENT";
    setMarks(next);
  }

  function timeNow(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  async function handleSave() {
    if (!detail) return;
    const records = detail.students.map((student) => ({
      studentId: student.studentId,
      status: marks[student.studentId] ?? "PRESENT",
      ...(remarks[student.studentId]?.trim() ? { remarks: remarks[student.studentId].trim() } : {}),
    }));
    setSaving(true);
    setFormError("");
    try {
      const result = await markTeacherAttendanceSession(sessionId, records);
      const at = timeNow();
      setSavedAt(at);
      setSavedSnapshot(snapshotOf(marks, remarks));
      const periodLabel =
        detail.session.sessionNumber != null ? `Period ${detail.session.sessionNumber}` : "Whole day";
      toastManager.add({
        title: "Attendance taken and submitted",
        description: `${result.saved} record${result.saved === 1 ? "" : "s"} · ${detail.session.className} ${periodLabel} · ${at}`,
      });
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : "Unable to save attendance");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link href="/attendance" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden /> Sessions
        </Link>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error || "Session not found"}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const marked = Object.keys(marks).length;
  const dirty = snapshotOf(marks, remarks) !== savedSnapshot;
  const allMarked = detail
    ? detail.students.length > 0 && detail.students.every((student) => marks[student.studentId])
    : false;
  const submitted = detail ? !dirty && (savedAt !== "" || allMarked) : false;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/attendance" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden /> Sessions
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {detail.session.className} ·{" "}
          {detail.session.sessionNumber ? `Period ${detail.session.sessionNumber}` : "Whole day"} ·{" "}
          {formatDate(detail.session.attendanceDate)}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {detail.session.subjectName ?? "General"}
          {!detail.editable && (
            <Badge variant="muted">
              <Lock size={12} aria-hidden /> Locked — same-day editing only
            </Badge>
          )}
        </p>
      </div>

      {detail.editable && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={markAllPresent}>
            Mark all present
          </Button>
          <span className="self-center text-xs text-muted-foreground">
            {marked}/{detail.students.length} marked
          </span>
        </div>
      )}

      {detail.students.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enrolled students in this class.</p>
      ) : (
        <ol className="divide-y rounded-xl border bg-card">
          {detail.students.map((student) => (
            <li key={student.studentId} className="space-y-2 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{student.fullName}</span>
                <span className="font-mono text-xs text-muted-foreground">{student.roleNumber}</span>
              </div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <ToggleGroup
                  value={marks[student.studentId] ?? ""}
                  onValueChange={(status) =>
                    setMarks((current) => ({ ...current, [student.studentId]: status }))
                  }
                  disabled={!detail.editable}
                  ariaLabel={`${student.fullName} attendance status`}
                  className="flex-wrap"
                >
                  {STATUSES.map((status) => (
                    <ToggleGroupItem key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {detail.editable && (
                  <input
                    value={remarks[student.studentId] ?? ""}
                    onChange={(event) =>
                      setRemarks((current) => ({ ...current, [student.studentId]: event.target.value }))
                    }
                    placeholder="Remark (optional)"
                    aria-label={`${student.fullName} remark`}
                    className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs shadow-sm sm:w-auto sm:flex-1"
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      {!detail.editable && marked > 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          Submitted · {marked} record{marked === 1 ? "" : "s"} on file.
        </p>
      )}
      {detail.editable && submitted && (
        <p role="status" className="text-sm font-medium text-success">
          {savedAt !== ""
            ? `Submitted at ${savedAt} · ${marked} record${marked === 1 ? "" : "s"} saved.`
            : `All ${detail.students.length} marked.`}
        </p>
      )}

      {detail.editable && detail.students.length > 0 && (
        <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex justify-end md:bottom-4">
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className="shadow-lg"
          >
            {saving ? "Saving…" : submitted ? "Submitted ✓" : `Save attendance (${detail.students.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}
