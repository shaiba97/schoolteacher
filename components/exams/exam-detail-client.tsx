"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadStorageFile, enterTeacherMarks, getTeacherExamDetail, updateExamSample, uploadExamSample } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherExamDetail, TeacherExamDetailSubject } from "@/lib/api/types";
import { Toast } from "@base-ui/react/toast";
import { formatDate } from "@/lib/utils";

function statusVariant(status: string): "success" | "muted" | "secondary" {
  if (status === "PUBLISHED") return "success";
  if (status === "DRAFT") return "muted";
  return "secondary";
}

/** Conducted-date label: single day, or a range when the exam spans days. Null-safe. */
function conductedLabel(startsOn?: string | null, endsOn?: string | null): string | null {
  if (!startsOn) return null;
  if (endsOn && endsOn.slice(0, 10) !== startsOn.slice(0, 10)) {
    return `${formatDate(startsOn)} – ${formatDate(endsOn)}`;
  }
  return formatDate(startsOn);
}

export function ExamDetailClient({ examId }: { examId: string }) {
  const [detail, setDetail] = React.useState<TeacherExamDetail | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    getTeacherExamDetail(examId).then(
      (res) => {
        setDetail(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : "Unable to load exam");
        setLoading(false);
      },
    );
  }, [examId]);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleRetry() {
    setLoading(true);
    load();
  }

  function handleSaved() {
    load();
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link href="/exams" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden /> Exams
        </Link>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error || "Exam not found"}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const conducted = conductedLabel(detail.startsOn, detail.endsOn);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/exams" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden /> Exams
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{detail.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
          {detail.examType && <Badge variant="outline">{detail.examType.name}</Badge>}
          {detail.isAuthor && <Badge variant="info">Author</Badge>}
          {detail.roomLocked && (
            <Badge variant="muted">
              <Lock size={12} aria-hidden /> Locked
            </Badge>
          )}
        </p>
        {conducted && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays size={14} aria-hidden />
            Conducted {conducted}
          </p>
        )}
        {!detail.isAuthor && (
          <p className="mt-1 text-xs text-muted-foreground">
            Showing only your subjects — other subjects&apos; marks stay invisible.
          </p>
        )}
      </div>

      <ExamSampleSection
        examId={detail.id}
        sampleObjectKey={detail.sampleObjectKey ?? null}
        canAttach={detail.canEdit}
        onChanged={handleSaved}
      />

      {detail.subjects.map((subject) => (
        <SubjectMarksCard
          key={subject.examSubjectId}
          examId={detail.id}
          subject={subject}
          onSaved={handleSaved}
        />
      ))}
    </div>
  );
}

function ExamSampleSection({
  examId,
  sampleObjectKey,
  canAttach,
  onChanged,
}: {
  examId: string;
  sampleObjectKey: string | null;
  canAttach: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [downloadError, setDownloadError] = React.useState("");
  const [downloadSuccess, setDownloadSuccess] = React.useState(false);

  // One message slot, not three. Attach and download feedback are mutually
  // exclusive so two role="alert" nodes can never both announce at once, and
  // whichever arrives last owns the message the teacher sees.
  function clearFeedback() {
    setError("");
    setDownloadError("");
    setDownloadSuccess(false);
  }

  // Confirmation is transient: it clears itself so the sample card returns to
  // its resting state instead of pinning a stale "downloaded" message.
  React.useEffect(() => {
    if (!downloadSuccess) return;
    const timer = window.setTimeout(() => setDownloadSuccess(false), 4000);
    return () => window.clearTimeout(timer);
  }, [downloadSuccess]);

  async function handleDownload() {
    if (!sampleObjectKey) return;
    setBusy(true);
    clearFeedback();
    try {
      const blob = await downloadStorageFile(sampleObjectKey);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = sampleObjectKey.split("/").pop() || "sample.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      setDownloadSuccess(true);
    } catch (cause) {
      setDownloadError(
        cause instanceof ApiError ? cause.message : "Unable to download sample"
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAttach(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Sample must be a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Sample must be 10MB or less.");
      return;
    }
    setBusy(true);
    setError("");
    setDownloadError("");
    setDownloadSuccess(false);
    try {
      const staged = await uploadExamSample(file, crypto.randomUUID());
      await updateExamSample(examId, {
        objectKey: staged.objectKey,
        originalName: staged.originalName,
        size: staged.size,
      });
      onChanged();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to attach sample");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Sample paper</p>
          <p className="text-xs text-muted-foreground">
            {sampleObjectKey ? "PDF attached to this exam." : "No sample attached yet."}
          </p>
        </div>
        {sampleObjectKey ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleDownload()}>
            {busy ? "Working…" : "Download PDF"}
          </Button>
        ) : null}
        {canAttach && (
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm hover:bg-muted">
            {busy ? "Working…" : sampleObjectKey ? "Replace PDF" : "Attach PDF"}
            <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={(event) => void handleAttach(event)} />
          </label>
        )}
        {(error || downloadError) && (
          <p role="alert" className="w-full text-xs text-destructive">
            {error || downloadError}
          </p>
        )}
        {downloadSuccess && (
          <p role="status" className="w-full text-xs font-medium text-success">
            Sample downloaded successfully
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SubjectMarksCard({
  examId,
  subject,
  onSaved,
}: {
  examId: string;
  subject: TeacherExamDetailSubject;
  onSaved: () => void;
}) {
  const initialState = React.useMemo(() => {
    const initialMarks: Record<string, string> = {};
    const initialRemarks: Record<string, string> = {};
    for (const row of subject.rows) {
      if (row.marks != null) initialMarks[row.studentId] = String(row.marks);
      if (row.remarks) initialRemarks[row.studentId] = row.remarks;
    }
    return { marks: initialMarks, remarks: initialRemarks };
  }, [subject]);
  const [marks, setMarks] = React.useState<Record<string, string>>(initialState.marks);
  const [remarks, setRemarks] = React.useState<Record<string, string>>(initialState.remarks);
  const [formError, setFormError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState("");
  const [savedSnapshot, setSavedSnapshot] = React.useState<string | null>(null);
  const toastManager = Toast.useToastManager();

  // Key order is normalized and blank/whitespace-only entries are dropped
  // (blanks mean "skip", and the submit payload trims the same way), so
  // typing-then-clearing and re-entering identical values never fake dirt.
  const snapshotOf = (markedValues: Record<string, string>, remarkValues: Record<string, string>) => {
    const ordered = (entries: Record<string, string>) =>
      Object.fromEntries(
        Object.keys(entries)
          .sort()
          .filter((key) => entries[key].trim() !== "")
          .map((key) => [key, entries[key].trim()]),
      );
    return JSON.stringify({ marks: ordered(markedValues), remarks: ordered(remarkValues) });
  };
  // Baseline: what the server holds (set once the roster is known).
  const baseline = savedSnapshot ?? snapshotOf(initialState.marks, initialState.remarks);
  const dirty = snapshotOf(marks, remarks) !== baseline;
  const allEntered =
    subject.rows.length > 0 &&
    subject.rows.every((row) => (marks[row.studentId] ?? "").trim() !== "");
  const submitted = !dirty && (savedAt !== "" || allEntered);

  function timeNow(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  async function handleSave() {
    const records: Array<{ studentId: string; marks?: number | null; remarks?: string }> = [];
    for (const row of subject.rows) {
      const raw = (marks[row.studentId] ?? "").trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        setFormError(`Marks must be a number ≥ 0 for ${row.fullName}.`);
        return;
      }
      if (value > subject.maxMarks) {
        setFormError(`Marks cannot exceed max ${subject.maxMarks} for ${row.fullName}.`);
        return;
      }
      records.push({
        studentId: row.studentId,
        marks: value,
        ...(remarks[row.studentId]?.trim() ? { remarks: remarks[row.studentId].trim() } : {}),
      });
    }
    if (records.length === 0) {
      setFormError("Enter marks for at least one student (leave blank to skip).");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const result = await enterTeacherMarks(examId, subject.examSubjectId, records);
      const at = timeNow();
      setSavedAt(at);
      setSavedSnapshot(snapshotOf(marks, remarks));
      toastManager.add({
        title: "Marks taken and submitted",
        description: `${result.saved} record${result.saved === 1 ? "" : "s"} · ${subject.subjectName} · ${subject.className} · ${at}`,
      });
      onSaved();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : "Unable to save marks");
    } finally {
      setSaving(false);
    }
  }

  const entered = subject.rows.filter((row) => (marks[row.studentId] ?? "").trim() !== "").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">
            {subject.subjectName} · {subject.className}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline">Max {subject.maxMarks}</Badge>
            {subject.passingMarks != null && <Badge variant="outline">Pass {subject.passingMarks}</Badge>}
            <Badge variant="secondary">
              {entered}/{subject.total} entered
            </Badge>
          </div>
        </div>
        {subject.examDate && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays size={14} aria-hidden />
            Conducted {formatDate(subject.examDate)}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {subject.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrolled students in this class.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            <div className="hidden grid-cols-[1fr_110px_1fr_64px] gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:grid">
              <span>Student</span>
              <span>Marks</span>
              <span>Remarks</span>
              <span className="text-right">Grade</span>
            </div>
            {subject.rows.map((row) => (
              <div key={row.studentId} className="grid grid-cols-[1fr_64px] items-center gap-2 px-3 py-2.5 sm:grid-cols-[1fr_110px_1fr_64px] sm:py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.fullName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{row.roleNumber}</p>
                </div>
                <span className="text-right text-sm text-muted-foreground sm:hidden">{row.grade ?? "—"}</span>
                <div className="col-span-2 grid grid-cols-[76px_1fr] items-center gap-2 sm:contents">
                  <Input
                    value={marks[row.studentId] ?? ""}
                    onChange={(event) =>
                      setMarks((current) => ({ ...current, [row.studentId]: event.target.value }))
                    }
                    placeholder="Marks"
                    inputMode="decimal"
                    aria-label={`${row.fullName} marks`}
                    className="h-10 px-2 text-sm sm:h-9 sm:px-3"
                  />
                  <Input
                    value={remarks[row.studentId] ?? ""}
                    onChange={(event) =>
                      setRemarks((current) => ({ ...current, [row.studentId]: event.target.value }))
                    }
                    placeholder="Remark (optional)"
                    aria-label={`${row.fullName} remarks`}
                    className="h-10 px-2 text-sm sm:h-9 sm:px-3"
                  />
                  <span className="hidden text-right text-sm text-muted-foreground sm:block">{row.grade ?? "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        {submitted && (
          <p role="status" className="text-sm font-medium text-success">
            {savedAt !== ""
              ? `Submitted at ${savedAt} · ${entered} record${entered === 1 ? "" : "s"} saved.`
              : `All ${subject.total} entered.`}
          </p>
        )}
        {subject.rows.length > 0 && (
          <div className="flex justify-end">
            <Button type="button" onClick={() => void handleSave()} disabled={saving || !dirty}>
              {saving ? "Saving…" : submitted ? "Submitted ✓" : "Save marks"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
