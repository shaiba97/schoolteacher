"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, GraduationCap, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExamCreateDialog, type ExamKind } from "@/components/exams/exam-create-dialog";
import { MarksReviewClient } from "@/components/exams/marks-review-client";
import { listTeacherExams, listTeacherPendingMarks } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherDashboard, TeacherExamItem } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";

type Scope = "authored" | "assigned" | "all";

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

export function ExamsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const subjectPreselect = searchParams.get("subject") ?? "";
  const [tab, setTab] = React.useState("exams");
  const [scope, setScope] = React.useState<Scope>("all");
  const [kindFilter, setKindFilter] = React.useState<"all" | ExamKind>("all");
  const [creator, setCreator] = React.useState<{ kind: ExamKind; open: boolean }>({ kind: "test", open: false });
  const [exams, setExams] = React.useState<TeacherExamItem[]>([]);
  const [pending, setPending] = React.useState<TeacherDashboard["pendingMarksQueue"]>([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback((targetScope: Scope) => {
    Promise.all([listTeacherExams(targetScope), listTeacherPendingMarks()]).then(
      ([listRes, pendingRes]) => {
        setExams(listRes.exams);
        setPending(pendingRes.exams);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : t("exams.loadError"));
        setLoading(false);
      },
    );
  }, []);

  React.useEffect(() => {
    load(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  function handleRetry() {
    setLoading(true);
    load(scope);
  }

  // ?subject=<classSubjectId> preselect from class pages: narrow to exams
  // containing that subject, with a clear path back to the full list.
  const [subjectFilter, setSubjectFilter] = React.useState(subjectPreselect);
  const visibleExams = exams
    .filter((exam) =>
      subjectFilter
        ? exam.mySubjects.some((subject) => subject.examSubjectId === subjectFilter)
        : true,
    )
    .filter((exam) =>
      kindFilter === "all"
        ? true
        : exam.examType?.name.trim().toLowerCase() === (kindFilter === "test" ? "test" : "exam"),
    );
  const pendingCount = pending.filter((exam) => exam.pendingCount > 0).length;

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("exams.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("exams.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setCreator({ kind: "test", open: true })}>
            {t("exams.newTest")}
          </Button>
          <Button type="button" size="sm" onClick={() => setCreator({ kind: "exam", open: true })}>
            {t("exams.newExam")}
          </Button>
        </div>
      </div>
      <ExamCreateDialog
        kind={creator.kind}
        open={creator.open}
        onOpenChange={(open) => setCreator((current) => ({ ...current, open }))}
        onCreated={(examId) => {
          setLoading(true);
          load(scope);
          router.push(`/exams/${examId}`);
        }}
      />

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            {t("common.retry")}
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="exams">{t("exams.tabExams")}</TabsTrigger>
          <TabsTrigger value="pending">
            {t("exams.tabPending")}
            {pendingCount > 0 ? ` (${pendingCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="review">{t("marksReview.title")}</TabsTrigger>
        </TabsList>

        <TabsContent value="exams">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("exams.typeAria")}>
              {(["all", "test", "exam"] as const).map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={kindFilter === option ? "default" : "outline"}
                  size="sm"
                  className="h-10"
                  onClick={() => setKindFilter(option)}
                >
                  {option === "all" ? t("exams.kindAll") : option === "test" ? t("exams.kindTest") : t("exams.kindExam")}
                </Button>
              ))}
            </div>
            <label htmlFor="exam-scope" className="sr-only">{t("exams.scopeAria")}</label>
            <select
              id="exam-scope"
              value={scope}
              onChange={(event) => {
                setScope(event.target.value as Scope);
                setLoading(true);
              }}
              className="flex h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm shadow-sm"
            >
              <option value="all">{t("exams.scopeAll")}</option>
              <option value="authored">{t("exams.scopeAuthored")}</option>
              <option value="assigned">{t("exams.scopeAssigned")}</option>
            </select>
            {subjectFilter && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                {t("exams.oneSubject")}
                <Button type="button" variant="outline" size="sm" onClick={() => setSubjectFilter("")}>
                  {t("common.clear")}
                </Button>
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground" role="status">
              {t("common.shown", { count: visibleExams.length })}
            </span>
          </div>

          {visibleExams.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <GraduationCap size={20} className="mx-auto text-muted-foreground" aria-hidden />
                <p className="mt-2 text-sm font-medium">{t("exams.noExams")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subjectFilter ? t("exams.noExamsFiltered") : t("exams.noExamsHint")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visibleExams.map((exam) => {
                const conducted = conductedLabel(exam.startsOn, exam.endsOn, locale);
                return (
                <Card key={exam.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-sm">
                        <Link href={`/exams/${exam.id}`} className="hover:underline">
                          {exam.name}
                        </Link>
                      </CardTitle>
                      <Badge variant={statusVariant(exam.status)}>{statusText(t, exam.status)}</Badge>
                      {exam.examType && <Badge variant="outline">{exam.examType.name}</Badge>}
                      {exam.isAuthor && <Badge variant="info">{t("exams.author")}</Badge>}
                      {exam.roomLocked && (
                        <Badge variant="muted">
                          <Lock size={12} aria-hidden /> {t("common.locked")}
                        </Badge>
                      )}
                    </div>
                    {conducted && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays size={14} aria-hidden />
                        {t("exams.conducted", { date: conducted })}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {exam.mySubjects.map((subject) => (
                        <Badge
                          key={subject.examSubjectId}
                          variant={subject.pending ? "warning" : "secondary"}
                        >
                          {subject.subjectName} · {subject.className} · {subject.entered}/{subject.total}
                        </Badge>
                      ))}
                    </div>
                    <Link href={`/exams/${exam.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {exam.pendingSubjects > 0 ? t("exams.enterMarks") : t("exams.viewExam")}
                    </Link>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pending.filter((exam) => exam.pendingCount > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("exams.nothingPending")}</p>
          ) : (
            <div className="space-y-2">
              {pending
                .filter((exam) => exam.pendingCount > 0)
                .map((exam) => {
                  const conducted = exam.examDate ? formatDate(exam.examDate, locale) : null;
                  return (
                  <Card key={exam.examId}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-sm">
                          <Link href={`/exams/${exam.examId}`} className="hover:underline">
                            {exam.examName}
                          </Link>
                        </CardTitle>
                        <Badge variant={statusVariant(exam.examStatus)}>{statusText(t, exam.examStatus)}</Badge>
                      </div>
                      {conducted && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays size={14} aria-hidden />
                          {t("exams.conducted", { date: conducted })}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {exam.subjects.map((subject) => (
                        <div key={subject.examSubjectId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                          <span>
                            {subject.subjectName} · {subject.className}
                          </span>
                          <Badge variant={subject.entered < subject.total ? "warning" : "secondary"}>
                            {subject.entered}/{subject.total}
                          </Badge>
                        </div>
                      ))}
                      <Link href={`/exams/${exam.examId}`} className={buttonVariants({ variant: "default", size: "sm" })}>
                        {t("exams.enterMarks")}
                      </Link>
                    </CardContent>
                  </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="review">
          <MarksReviewClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
