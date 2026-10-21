"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTeacherStudentDetail } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherStudentDetail } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

function attendanceVariant(status: string): "success" | "destructive" | "warning" | "secondary" {
  if (status === "PRESENT") return "success";
  if (status === "ABSENT") return "destructive";
  if (status === "LATE" || status === "EXCUSED") return "warning";
  return "secondary";
}

export function StudentDetailClient({ studentId }: { studentId: string }) {
  const [detail, setDetail] = React.useState<TeacherStudentDetail | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("overview");

  const load = React.useCallback(() => {
    getTeacherStudentDetail(studentId).then(
      (res) => {
        setDetail(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : "Unable to load student");
        setLoading(false);
      },
    );
  }, [studentId]);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleRetry() {
    setLoading(true);
    load();
  }

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
        <Link href="/students" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden /> Students
        </Link>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error || "Student not found"}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { student } = detail;
  const fullName = `${student.firstName} ${student.middleName ? `${student.middleName} ` : ""}${student.lastName ?? ""}`.trim();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/students" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden /> Students
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{fullName}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">{student.roleNumber}</span>
          <Badge variant="secondary">{student.currentClass.className}</Badge>
          <Badge variant="muted">{student.status}</Badge>
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-4">
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground sm:w-28">Gender</dt>
                  <dd>{student.gender ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground sm:w-28">Born</dt>
                  <dd>{student.dateOfBirth ? formatDate(student.dateOfBirth) : "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground sm:w-28">Phone</dt>
                  <dd>{student.phone ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground sm:w-28">Email</dt>
                  <dd className="min-w-0 break-all">{student.email ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground sm:w-28">Admitted</dt>
                  <dd>{student.admissionDate ? formatDate(student.admissionDate) : "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Attendance in my classes</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance records in your classes.</p>
              ) : (
                <ol className="divide-y rounded-lg border">
                  {detail.attendance.map((record) => (
                    <li key={record.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-sm">
                      <span className="w-[68px] shrink-0 text-xs text-muted-foreground sm:w-24">
                        {formatDate(record.date)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {record.className}
                        {record.subjectName ? ` · ${record.subjectName}` : ""}
                      </span>
                      <Badge variant={attendanceVariant(record.status)}>{record.status}</Badge>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Results in my subjects</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.results.length === 0 ? (
                <p className="text-sm text-muted-foreground">No results in your subjects yet.</p>
              ) : (
                <ol className="divide-y rounded-lg border">
                  {detail.results.map((result) => (
                    <li key={result.id} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">{result.subjectName}</span>
                        <span className="text-muted-foreground">
                          {" "}· {result.examName} · {result.className}
                        </span>
                      </span>
                      <span className="text-sm">
                        {result.marks != null ? (
                          <>
                            <span className="font-medium">{result.marks}</span>
                            <span className="text-muted-foreground">/{result.maxMarks}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                      {result.grade && <Badge variant="outline">{result.grade}</Badge>}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
