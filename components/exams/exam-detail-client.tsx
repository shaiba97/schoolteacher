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
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";

const EXAM_STATUS_KEYS: Record<string, MessageKey> = {
  PUBLISHED: "exams.statusPUBLISHED",
  DRAFT: "exams.statusDRAFT",
};

function statusText(t: (key: MessageKey) => string, status: string): string {
  const key = EXAM_STATUS_KEYS[status];
  return key ? t(key) : status;
}

function statusVariant(status: string): "success" | "muted" | "secondary" {
  if (status === "PUBLISHED") return "success";
  if (status === "DRAFT") return "muted";
  return "secondary";
}

/** Conducted-date label: single day, or a range when the exam spans days. Null-safe. */
function conductedLabel(
  startsOn: string | null | undefined,
  endsOn: string | null | undefined,
  locale?: string,
): string | null {
  if (!startsOn) return null;
  if (endsOn && endsOn.slice(0, 10) !== startsOn.slice(0, 10)) {
    return `${formatDate(startsOn, locale)} – ${formatDate(endsOn, locale)}`;
  }
  return formatDate(startsOn, locale);
}

export function ExamDetailClient({ examId }: { examId: string }) {
  const { t, locale } = useI18n();
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
        setError(cause instanceof ApiError ? cause.message : t("examDetail.loadError"));
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
          <ArrowLeft size={14} aria-hidden /> {t("examDetail.backTo")}
        </Link>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error || t("examDetail.notFound")}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const conducted = conductedLabel(detail.startsOn, detail.endsOn, locale);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/exams" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden /> {t("examDetail.backTo")}
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{detail.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={statusVariant(detail.status)}>{statusText(t, detail.status)}</Badge>
          {detail.examType && <Badge variant="outline">{detail.examType.name}</Badge>}
          {detail.isAuthor && <Badge variant="info">{t("exams.author")}</Badge>}
          {detail.roomLocked && (
            <Badge variant="muted">
              <Lock size={12} aria-hidden /> {t("common.locked")}
            </Badge>
          )}
        </p>
        {conducted && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays size={14} aria-hidden />
            {t("exams.conducted", { date: conducted })}
          </p>
        )}
        {!detail.isAuthor && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("examDetail.onlyYours")}
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
  const { t } = useI18n();
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
        cause instanceof ApiError ? cause.message : t("examDetail.downloadError")
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
      setError(t("examDetail.samplePdf"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t("examDetail.sampleSize"));
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
      setError(cause instanceof ApiError ? cause.message : t("examDetail.attachError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("examDetail.sampleTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {sampleObjectKey ? t("examDetail.sampleAttached") : t("examDetail.sampleNone")}
          </p>
        </div>
        {sampleObjectKey ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleDownload()}>
            {busy ? t("common.working") : t("examDetail.download")}
          </Button>
        ) : null}
        {canAttach && (
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm hover:bg-muted">
            {busy ? t("common.working") : sampleObjectKey ? t("examDetail.replacePdf") : t("examDetail.attachPdf")}
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
            {t("examDetail.downloadSuccess")}
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
  const { t, locale } = useI18n();
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
        setFormError(t("examDetail.numericError", { name: row.fullName }));
        return;
      }
      if (value > subject.maxMarks) {
        setFormError(t("examDetail.maxError", { max: subject.maxMarks, name: row.fullName }));
        return;
      }
      records.push({
        studentId: row.studentId,
        marks: value,
        ...(remarks[row.studentId]?.trim() ? { remarks: remarks[row.studentId].trim() } : {}),
      });
    }
    if (records.length === 0) {
      setFormError(t("examDetail.enterOne"));
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
        title: t("examDetail.toastTitle"),
        description: t("examDetail.toastDescription", {
          count: result.saved,
          subject: subject.subjectName,
          className: subject.className,
          at,
        }),
      });
      onSaved();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : t("examDetail.saveError"));
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
            <Badge variant="outline">{t("examDetail.max", { count: subject.maxMarks })}</Badge>
            {subject.passingMarks != null && <Badge variant="outline">{t("examDetail.pass", { count: subject.passingMarks })}</Badge>}
            <Badge variant="secondary">
              {t("examDetail.enteredOf", { entered, total: subject.total })}
            </Badge>
          </div>
        </div>
        {subject.examDate && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays size={14} aria-hidden />
            {t("exams.conducted", { date: formatDate(subject.examDate, locale) })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {subject.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.noStudents")}</p>
        ) : (
          <div className="rounded-lg border divide-y">
            <div className="hidden grid-cols-[1fr_110px_1fr_64px] gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:grid">
              <span>{t("examDetail.colStudent")}</span>
              <span>{t("examDetail.colMarks")}</span>
              <span>{t("examDetail.colRemarks")}</span>
              <span className="text-right">{t("examDetail.colGrade")}</span>
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
                    placeholder={t("examDetail.marksPlaceholder")}
                    inputMode="decimal"
                    aria-label={t("examDetail.marksAria", { name: row.fullName })}
                    className="h-10 px-2 text-sm sm:h-9 sm:px-3"
                  />
                  <Input
                    value={remarks[row.studentId] ?? ""}
                    onChange={(event) =>
                      setRemarks((current) => ({ ...current, [row.studentId]: event.target.value }))
                    }
                    placeholder={t("examDetail.remarksPlaceholder")}
                    aria-label={t("examDetail.remarksAria", { name: row.fullName })}
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
              ? entered === 1
                ? t("examDetail.submittedFileOne", { at: savedAt })
                : t("examDetail.submittedFileMany", { at: savedAt, count: entered })
              : t("examDetail.allEntered", { count: subject.total })}
          </p>
        )}
        {subject.rows.length > 0 && (
          <div className="flex justify-end">
            <Button type="button" onClick={() => void handleSave()} disabled={saving || !dirty}>
              {saving ? t("common.saving") : submitted ? t("examDetail.saved") : t("examDetail.save")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
