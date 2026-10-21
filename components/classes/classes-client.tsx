"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpenCheck, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listTeacherClasses } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherClassItem } from "@/lib/api/types";

export function ClassesClient() {
  const [classes, setClasses] = React.useState<TeacherClassItem[]>([]);
  const [yearName, setYearName] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    listTeacherClasses().then(
      (res) => {
        setClasses(res.classes);
        setYearName(res.year.name);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : "Unable to load classes");
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

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{yearName}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">My Classes</h1>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      )}

      {classes.length === 0 && !error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpenCheck size={20} className="mx-auto text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">No classes assigned</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Classes appear here once academic affairs assigns subjects to you.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.map((item) => (
            <Card key={item.classId}>
              <CardHeader>
                <CardTitle className="text-sm">
                  <Link href={`/classes/${item.classId}`} className="hover:underline">
                    {item.className}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {item.subjects.map((subject) => (
                    <Badge key={subject.classSubjectId} variant="secondary">
                      {subject.subjectName}
                    </Badge>
                  ))}
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UsersRound size={12} aria-hidden />
                  {item.studentCount} student{item.studentCount === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
