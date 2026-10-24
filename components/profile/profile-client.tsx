"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, BookOpen, ChevronRight, KeyRound, LogOut, Pencil, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/locale-provider";
import { changeAuthPassword, getTeacherProfile, listTeacherClasses, updateAuthMe } from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherClassItem, TeacherProfile } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";
import { AttendanceHistory } from "@/components/profile/attendance-history";

/**
 * Mirrors academic/components/teachers/teacher-detail-client.tsx (header card,
 * personal/employment grid, assignments card) customized for self-service:
 * - Employment actions replaced: Edit contact info + Change password instead
 *   of Edit + Deactivate (a teacher must never self-deactivate).
 * - Employment card additionally shows specialization + hire date (present in
 *   TeacherProfile, not shown on the academic page).
 * - No credentials column (no credential UI/data on this side).
 * - Supervision shown as a count badge: the classes endpoint carries no
 *   supervisor flag, only profile._count.classTeacherFor.
 * - No EmptyState/Avatar primitives in this app: inline muted empty text and
 *   a local initials/photo AvatarCircle instead.
 */
function statusBadge(status: string) {
  return <Badge variant={status === "ACTIVE" ? "success" : "muted"}>{status}</Badge>;
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "—";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function AvatarCircle({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const [broken, setBroken] = React.useState(false);
  const src = photoUrl?.trim() ?? "";
  // Render a photo only for http(s) URLs: avatarUrl is free-text teacher input,
  // and next/image can't optimize arbitrary build-time-unknown URLs anyway.
  if (src && !broken && /^https?:\/\//i.test(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" onError={() => setBroken(true)} className="size-14 shrink-0 rounded-full object-cover" />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return (
    <span aria-hidden className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold">
      {initials || "?"}
    </span>
  );
}

export function ProfileClient() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [profile, setProfile] = React.useState<TeacherProfile | null>(null);
  const [classes, setClasses] = React.useState<TeacherClassItem[]>([]);
  const [error, setError] = React.useState("");
  const [classesError, setClassesError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [tab, setTab] = React.useState("overview");

  const load = React.useCallback(() => {
    Promise.allSettled([getTeacherProfile(), listTeacherClasses()]).then(([profileRes, classRes]) => {
      if (profileRes.status === "rejected") {
        setError(profileRes.reason instanceof ApiError ? profileRes.reason.message : t("profile.loadError"));
        setLoading(false);
        return;
      }
      setProfile(profileRes.value);
      if (classRes.status === "fulfilled") {
        setClasses(classRes.value.classes ?? []);
        setClassesError("");
      } else {
        setClasses([]);
        setClassesError(classRes.reason instanceof ApiError ? classRes.reason.message : t("profile.classesNote"));
      }
      setError("");
      setLoading(false);
    });
    // t is stable per locale; fetching once per mount is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleRetry() {
    setLoading(true);
    load();
  }

  async function handleSignOut() {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("profile.title")}</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error || t("profile.notFound")}</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
              {t("common.retry")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()}>
              {t("profile.signOut")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const user = profile.user;
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || profile.employeeNumber || t("profile.unnamed");
  const toTitle = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  const displayTitle = displayName
    .split(/\s+/)
    .map((part) => (/^[a-zA-Z]/.test(part) ? toTitle(part) : part))
    .join(" ");
  const assignmentRows = (classes ?? []).flatMap((schoolClass) =>
    (schoolClass.subjects ?? []).map((subject) => ({
      classSubjectId: subject.classSubjectId,
      subjectName: subject.subjectName,
      classId: schoolClass.classId,
      className: schoolClass.className,
    })),
  );
  const supervisedCount = profile._count?.classTeacherFor ?? 0;

  return (
    <div className="space-y-4">
      {classesError && (
          <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            {t("profile.classesNote")}
          </p>
      )}

      <Card>
        <CardContent className="p-6">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/dashboard">{t("profile.breadcrumbDashboard")}</Link>
            <ChevronRight size={14} aria-hidden />
            <span aria-current="page" className="truncate font-medium text-foreground">{t("profile.title")}</span>
          </nav>
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <AvatarCircle name={displayTitle} photoUrl={user?.avatarUrl} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold tracking-tight">{displayTitle}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{profile.department?.name ?? t("profile.unassigned")}</Badge>
                {user?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} aria-hidden />{user.phone}
                  </span>
                )}
                {statusBadge(profile.status)}
                <Badge variant="secondary">{titleCase(profile.gender)}</Badge>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("profile.employeeOf", { number: profile.employeeNumber, status: profile.status })}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} aria-hidden /> {t("profile.editContact")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                <KeyRound size={14} aria-hidden /> {t("profile.changePassword")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("profile.tabOverview")}</TabsTrigger>
          <TabsTrigger value="assignments">{t("profile.tabAssignments")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("profile.tabAttendance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("profile.personalCard")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">{t("profile.fullName")}</span>{displayTitle}</p>
                <p><span className="text-muted-foreground">{t("profile.gender")}</span>{titleCase(profile.gender)}</p>
                <p><span className="text-muted-foreground">{t("profile.dateOfBirth")}</span>{profile.dateOfBirth ? formatDate(profile.dateOfBirth, locale) : "—"}</p>
                <p><span className="text-muted-foreground">{t("profile.phone")}</span>{user?.phone ? <span className="font-mono text-xs">{user.phone}</span> : "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("profile.employmentCard")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">{t("profile.department")}</span>{profile.department?.name ?? "—"}</p>
                <p><span className="text-muted-foreground">{t("profile.employeeNo")}</span><span className="font-mono text-xs">{profile.employeeNumber}</span></p>
                <p><span className="text-muted-foreground">{t("profile.status")}</span>{statusBadge(profile.status)}</p>
                <p><span className="text-muted-foreground">{t("profile.hireDate")}</span>{profile.hireDate ? formatDate(profile.hireDate, locale) : "—"}</p>
                <p><span className="text-muted-foreground">{t("profile.specialization")}</span>{profile.specialization ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{t("profile.employmentNote")}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("profile.assignmentsCard")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    {assignmentRows.length === 1 ? t("profile.subjectOne") : t("profile.subjectMany", { count: assignmentRows.length })}
                  </Badge>
                  <Badge variant="secondary">{supervisedCount === 1 ? t("profile.classTeacherOne") : t("profile.classTeacherMany", { count: supervisedCount })}</Badge>
                </div>
                {assignmentRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("profile.noAssignments")}</p>
                ) : (
                  <div className="space-y-2">
                    {assignmentRows.map((row) => (
                      <div key={row.classSubjectId} className="flex items-center gap-3 rounded-lg border p-3">
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted" aria-hidden>
                          <BookOpen size={16} className="text-muted-foreground" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{row.subjectName}</p>
                          <p className="truncate text-xs text-muted-foreground">{row.className}</p>
                        </div>
                        <Link
                          href={`/classes/${row.classId}`}
                          className="shrink-0 text-xs font-medium text-primary hover:underline"
                        >
                          {t("profile.openClass")}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceHistory />
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">{t("profile.signOutCard")}</p>
            <p className="text-xs text-muted-foreground">{t("profile.signOutHint")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()}>
            <LogOut size={14} aria-hidden /> {t("profile.signOut")}
          </Button>
        </CardContent>
      </Card>

      {editOpen && (
        <EditContactDialog
          open
          profile={profile}
          onOpenChange={setEditOpen}
          onSaved={() => {
            setEditOpen(false);
            setLoading(true);
            load();
          }}
        />
      )}
      {passwordOpen && <PasswordDialog open onOpenChange={setPasswordOpen} />}
    </div>
  );
}

function EditContactDialog({
  open,
  profile,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  profile: TeacherProfile;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [firstName, setFirstName] = React.useState(profile.user?.firstName ?? "");
  const [lastName, setLastName] = React.useState(profile.user?.lastName ?? "");
  const [phone, setPhone] = React.useState(profile.user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile.user?.avatarUrl ?? "");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!firstName.trim()) {
      setFormError(t("profile.firstNameRequired"));
      return;
    }
    setPending(true);
    setFormError("");
    try {
      await updateAuthMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      onSaved();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : t("profile.saveError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profile.contactTitle")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 p-6 pt-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-first">{t("profile.firstName")}</Label>
              <Input id="profile-first" value={firstName} onChange={(event) => setFirstName(event.target.value)} required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-last">{t("profile.lastName")}</Label>
              <Input id="profile-last" value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={100} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">{t("profile.phoneField")}</Label>
            <Input id="profile-phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} inputMode="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-avatar">{t("profile.avatarField")}</Label>
            <Input id="profile-avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} maxLength={500} inputMode="url" placeholder="https://…" />
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <DialogFooter className="p-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("common.saving") : t("profile.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [done, setDone] = React.useState(false);
  const { t } = useI18n();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setFormError(t("profile.passwordShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(t("profile.passwordMismatch"));
      return;
    }
    setPending(true);
    setFormError("");
    try {
      await changeAuthPassword({ currentPassword, newPassword });
      setDone(true);
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : t("profile.passwordError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profile.passwordTitle")}</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="space-y-4 p-6 pt-2">
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <BadgeCheck size={16} className="text-success" aria-hidden />
              {t("profile.passwordDone")}
            </p>
            <DialogFooter className="p-0">
              <Button type="button" onClick={() => onOpenChange(false)}>
                {t("common.close")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4 p-6 pt-2" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-1.5">
              <Label htmlFor="pw-current">{t("profile.currentPassword")}</Label>
              <Input
                id="pw-current"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-new">{t("profile.newPassword")}</Label>
              <Input
                id="pw-new"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm">{t("profile.confirmPassword")}</Label>
              <Input
                id="pw-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? t("common.saving") : t("profile.changePassword")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
