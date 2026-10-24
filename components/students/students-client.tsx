"use client";

import * as React from "react";
import Link from "next/link";
import { Search, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listTeacherClasses, searchTeacherStudents } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherStudentItem } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/locale-provider";

export function StudentsClient() {
  const { t } = useI18n();
  const [search, setSearch] = React.useState("");
  const [classFilter, setClassFilter] = React.useState("");
  const [classes, setClasses] = React.useState<Array<{ id: string; name: string }>>([]);
  const [students, setStudents] = React.useState<TeacherStudentItem[]>([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [searching, setSearching] = React.useState(false);

  // Class options come from the teacher's own classes.
  React.useEffect(() => {
    listTeacherClasses().then(
      (res) => setClasses(res.classes.map((c) => ({ id: c.classId, name: c.className }))),
      () => undefined,
    );
  }, []);

  const runSearch = React.useCallback((term: string, classId: string) => {
    setSearching(true);
    searchTeacherStudents({
      ...(term.trim() ? { search: term.trim() } : {}),
      ...(classId ? { classId } : {}),
    }).then(
      (res) => {
        setStudents(res.students);
        setError("");
        setSearching(false);
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : t("students.searchError"));
        setSearching(false);
        setLoading(false);
      },
    );
  }, []);

  // Initial load: the teacher's full scoped roster; debounce keystrokes after.
  // The mounted ref skips the debounce effect's first run (already loaded
  // above) while still reacting when filters are later cleared back to empty.
  // States live in promise continuations only, never synchronously in effects.
  const mounted = React.useRef(false);
  React.useEffect(() => {
    searchTeacherStudents({}).then(
      (res) => {
        setStudents(res.students);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : t("students.searchError"));
        setLoading(false);
      },
    );
  }, []);

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = setTimeout(() => runSearch(search, classFilter), 350);
    return () => clearTimeout(timer);
  }, [search, classFilter, runSearch]);

  function handleRetry() {
    setLoading(true);
    runSearch(search, classFilter);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("students.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("students.subtitle")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="space-y-1.5">
          <Label htmlFor="student-search">{t("students.searchLabel")}</Label>
          <div className="relative">
            <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
            <Input
              id="student-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("students.searchPlaceholder")}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="student-class">{t("students.classLabel")}</Label>
          <Select
            id="student-class"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
          >
            <option value="">{t("students.allClasses")}</option>
            {classes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            {t("common.retry")}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : students.length === 0 && !error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <UsersRound size={20} className="mx-auto text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">{t("students.noStudents")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("students.noStudentsHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ol className="divide-y rounded-xl border bg-card">
          {students.map((student) => (
            <li key={student.id}>
              <Link
                href={`/students/${student.id}`}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{student.fullName}</span>
                <span className="hidden flex-wrap gap-1 sm:flex">
                  {student.classes.slice(0, 2).map((c) => (
                    <Badge key={c.id} variant="secondary">
                      {c.className}
                    </Badge>
                  ))}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{student.roleNumber}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {searching && !loading && (
        <p role="status" className="text-xs text-muted-foreground">
          {t("students.searching")}
        </p>
      )}
    </div>
  );
}
