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
import { listTeacherExams, listTeacherPendingMarks } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherDashboard, TeacherExamItem } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

type Scope = "authored" | "assigned" | "all";

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

export function ExamsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        setError(cause instanceof ApiError ? cause.message : "Unable to load exams");
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
          <h1 className="text-xl font-semibold tracking-tight">Exams & Marks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Exams you authored or teach in. Teachers create single-class exams only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setCreator({ kind: "test", open: true })}>
            New test
          </Button>
          <Button type="button" size="sm" onClick={() => setCreator({ kind: "exam", open: true })}>
            New exam
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
            Retry
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="exams">My Exams</TabsTrigger>
          <TabsTrigger value="pending">
            Needs marks{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exams">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Test or exam">
              {(["all", "test", "exam"] as const).map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={kindFilter === option ? "default" : "outline"}
                  size="sm"
                  className="h-10"
                  onClick={() => setKindFilter(option)}
                >
                  {option === "all" ? "Tests & exams" : option === "test" ? "Tests" : "Exams"}
                </Button>
              ))}
            </div>
            <label htmlFor="exam-scope" className="sr-only">Scope</label>
            <select
              id="exam-scope"
              value={scope}
              onChange={(event) => {
                setScope(event.target.value as Scope);
                setLoading(true);
              }}
              className="flex h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm shadow-sm"
            >
              <option value="all">All work</option>
              <option value="authored">Authored by me</option>
              <option value="assigned">I teach in</option>
            </select>
            {subjectFilter && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                One subject
                <Button type="button" variant="outline" size="sm" onClick={() => setSubjectFilter("")}>
                  Clear
                </Button>
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground" role="status">
              {visibleExams.length} shown
            </span>
          </div>

          {visibleExams.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <GraduationCap size={20} className="mx-auto text-muted-foreground" aria-hidden />
                <p className="mt-2 text-sm font-medium">No exams here</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subjectFilter
                    ? "No visible exam contains that subject."
                    : "Exams you author or teach in will appear here."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visibleExams.map((exam) => {
                const conducted = conductedLabel(exam.startsOn, exam.endsOn);
                return (
                <Card key={exam.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-sm">
                        <Link href={`/exams/${exam.id}`} className="hover:underline">
                          {exam.name}
                        </Link>
                      </CardTitle>
                      <Badge variant={statusVariant(exam.status)}>{exam.status}</Badge>
                      {exam.examType && <Badge variant="outline">{exam.examType.name}</Badge>}
                      {exam.isAuthor && <Badge variant="info">Author</Badge>}
                      {exam.roomLocked && (
                        <Badge variant="muted">
                          <Lock size={12} aria-hidden /> Locked
                        </Badge>
                      )}
                    </div>
                    {conducted && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays size={14} aria-hidden />
                        Conducted {conducted}
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
                      {exam.pendingSubjects > 0 ? "Enter marks" : "View exam"}
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
            <p className="text-sm text-muted-foreground">Nothing waiting for marks. Nice.</p>
          ) : (
            <div className="space-y-2">
              {pending
                .filter((exam) => exam.pendingCount > 0)
                .map((exam) => {
                  const conducted = exam.examDate ? formatDate(exam.examDate) : null;
                  return (
                  <Card key={exam.examId}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-sm">
                          <Link href={`/exams/${exam.examId}`} className="hover:underline">
                            {exam.examName}
                          </Link>
                        </CardTitle>
                        <Badge variant={statusVariant(exam.examStatus)}>{exam.examStatus}</Badge>
                      </div>
                      {conducted && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays size={14} aria-hidden />
                          Conducted {conducted}
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
                        Enter marks
                      </Link>
                    </CardContent>
                  </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
