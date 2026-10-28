"use client";

import * as React from "react";
import Link from "next/link";
import { Award, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { approveClassExam, listSupervisorQueue, returnSubjectMarks } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type {
  TeacherSupervisorQueue,
  TeacherSupervisorQueueExam,
  TeacherSupervisorQueueSubject,
} from "@/lib/api/types";
import { formatDate } from "@/lib/utils";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";
import { Toast } from "@base-ui/react/toast";

const EXAM_STATUS_KEYS: Record<string, MessageKey> = {
  PUBLISHED: "exams.statusPUBLISHED",
  DRAFT: "exams.statusDRAFT",
};

function statusVariant(status: string): "success" | "muted" | "secondary" {
  if (status === "PUBLISHED") return "success";
  if (status === "DRAFT") return "muted";
  return "secondary";
}

function statusText(t: (key: MessageKey) => string, status: string): string {
  const key = EXAM_STATUS_KEYS[status];
  return key ? t(key) : status;
}

type ReturningTarget = {
  classId: string;
  examId: string;
  examName: string;
  examSubjectId: string;
  subjectName: string;
};

export function MarksReviewClient() {
  const { t } = useI18n();
  const toastManager = Toast.useToastManager();
  const [queue, setQueue] = React.useState<TeacherSupervisorQueue | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [approvingExam, setApprovingExam] = React.useState<string | null>(null);
  const [returning, setReturning] = React.useState<ReturningTarget | null>(null);
  const [reason, setReason] = React.useState("");
  const [returnError, setReturnError] = React.useState("");
  const [returnBusy, setReturnBusy] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    listSupervisorQueue().then(
      (data) => {
        setQueue(data);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : t("marksReview.loadError"));
        setLoading(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(examId: string, classId: string, examName: string, className: string) {
    setApprovingExam(examId);
    try {
      await approveClassExam(examId, classId);
      toastManager.add({
        title: t("marksReview.approveToastTitle"),
        description: t("marksReview.approveToastDescription", { exam: examName, className }),
      });
      load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("marksReview.approveError"));
    } finally {
      setApprovingExam(null);
    }
  }

  function openReturn(target: ReturningTarget) {
    setReturning(target);
    setReason("");
    setReturnError("");
  }

  async function handleReturn() {
    if (!returning) return;
    const value = reason.trim();
    if (!value) {
      setReturnError(t("marksReview.returnErrorLabel"));
      return;
    }
    setReturnBusy(true);
    try {
      await returnSubjectMarks(returning.examSubjectId, returning.classId, value);
      toastManager.add({
        title: t("marksReview.returnToastTitle"),
        description: t("marksReview.returnToastDescription", {
          subject: returning.subjectName,
          exam: returning.examName,
        }),
      });
      setReturning(null);
      load();
    } catch (cause) {
      setReturnError(cause instanceof ApiError ? cause.message : t("marksReview.returnError"));
    } finally {
      setReturnBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const classes = (queue?.classes ?? []).filter((c) => c.exams.length > 0);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">{t("marksReview.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("marksReview.subtitle")}</p>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={load}>
            {t("common.retry")}
          </Button>
        </div>
      )}

      {classes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Award size={20} className="mx-auto text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">{t("marksReview.empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("marksReview.hint")}</p>
          </CardContent>
        </Card>
      ) : (
        classes.map((c) => (
          <Card key={c.classId}>
            <CardHeader>
              <CardTitle className="text-sm">{c.className}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {c.exams.map((exam) => (
                <ExamReviewBlock
                  key={exam.examId}
                  classId={c.classId}
                  className={c.className}
                  exam={exam}
                  approving={approvingExam === exam.examId}
                  onApprove={() =>
                    void handleApprove(exam.examId, c.classId, exam.examName, c.className)
                  }
                  onReturn={(subject) =>
                    openReturn({
                      classId: c.classId,
                      examId: exam.examId,
                      examName: exam.examName,
                      examSubjectId: subject.examSubjectId,
                      subjectName: subject.subjectName,
                    })
                  }
                />
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={!!returning} onOpenChange={(o) => { if (!o && !returnBusy) setReturning(null); }}>
        <DialogContent>
          {returning ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleReturn();
              }}
            >
              <DialogHeader>
                <DialogTitle>{t("marksReview.returnDialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("marksReview.returnDialogDescription", {
                    subject: returning.subjectName,
                    exam: returning.examName,
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="my-4 space-y-2">
                <label htmlFor="marks-review-reason" className="text-sm font-medium">
                  {t("marksReview.reasonLabel")}
                </label>
                <Input
                  id="marks-review-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={t("marksReview.reasonPlaceholder")}
                  maxLength={500}
                  autoFocus
                />
                {returnError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {returnError}
                  </p>
                ) : null}
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setReturning(null)} disabled={returnBusy}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={returnBusy}>
                  {returnBusy ? t("common.saving") : t("marksReview.return")}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExamReviewBlock({
  classId,
  className,
  exam,
  approving,
  onApprove,
  onReturn,
}: {
  classId: string;
  className: string;
  exam: TeacherSupervisorQueueExam;
  approving: boolean;
  onApprove: () => void;
  onReturn: (subject: TeacherSupervisorQueueSubject) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/exams/${exam.examId}`} className="text-sm font-medium hover:underline">
            {exam.examName}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={statusVariant(exam.status)}>{statusText(t, exam.status)}</Badge>
            {exam.examType && <Badge variant="outline">{exam.examType}</Badge>}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onApprove}
          disabled={!exam.readyToApprove || approving}
          title={exam.readyToApprove ? undefined : t("marksReview.approveHint")}
        >
          {approving ? t("marksReview.approving") : t("marksReview.approve")}
        </Button>
      </div>
      <div className="space-y-1.5">
        {exam.subjects.map((subject) => (
          <div
            key={subject.examSubjectId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-2 text-sm"
          >
            <span className="min-w-0 truncate font-medium">{subject.subjectName}</span>
            <div className="flex items-center gap-2">
              <Badge variant={subject.allSubmitted ? "success" : "warning"}>
                {t("marksReview.submittedCount", { submitted: subject.submitted, total: subject.total })}
              </Badge>
              {subject.allSubmitted ? (
                <span className="text-xs text-success">{t("marksReview.approved")}</span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReturn(subject)}
                  disabled={subject.submitted === 0}
                >
                  <RotateCcw size={12} aria-hidden /> {t("marksReview.return")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
