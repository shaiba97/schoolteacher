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
        setError(profileRes.reason instanceof ApiError ? profileRes.reason.message : "Unable to load profile");
        setLoading(false);
        return;
      }
      setProfile(profileRes.value);
      if (classRes.status === "fulfilled") {
        setClasses(classRes.value.classes ?? []);
        setClassesError("");
      } else {
        setClasses([]);
        setClassesError(classRes.reason instanceof ApiError ? classRes.reason.message : "Unable to load assignments");
      }
      setError("");
      setLoading(false);
    });
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
        <h1 className="text-xl font-semibold tracking-tight">My Profile</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error || "Profile not found"}</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const user = profile.user;
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || profile.employeeNumber || "Unnamed teacher";
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
          Assignments could not be loaded — counts below may be incomplete.
        </p>
      )}

      <Card>
        <CardContent className="p-6">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/dashboard">Dashboard</Link>
            <ChevronRight size={14} aria-hidden />
            <span aria-current="page" className="truncate font-medium text-foreground">My Profile</span>
          </nav>
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <AvatarCircle name={displayTitle} photoUrl={user?.avatarUrl} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold tracking-tight">{displayTitle}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{profile.department?.name ?? "Unassigned"}</Badge>
                {user?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} aria-hidden />{user.phone}
                  </span>
                )}
                {statusBadge(profile.status)}
                <Badge variant="secondary">{titleCase(profile.gender)}</Badge>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Employee {profile.employeeNumber} · {profile.status}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} aria-hidden /> Edit contact info
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                <KeyRound size={14} aria-hidden /> Change password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Teaching assignments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Full name: </span>{displayTitle}</p>
                <p><span className="text-muted-foreground">Gender: </span>{titleCase(profile.gender)}</p>
                <p><span className="text-muted-foreground">Date of birth: </span>{profile.dateOfBirth ? formatDate(profile.dateOfBirth) : "—"}</p>
                <p><span className="text-muted-foreground">Phone: </span>{user?.phone ? <span className="font-mono text-xs">{user.phone}</span> : "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Employment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Department: </span>{profile.department?.name ?? "—"}</p>
                <p><span className="text-muted-foreground">Employee no.: </span><span className="font-mono text-xs">{profile.employeeNumber}</span></p>
                <p><span className="text-muted-foreground">Status: </span>{statusBadge(profile.status)}</p>
                <p><span className="text-muted-foreground">Hire date: </span>{profile.hireDate ? formatDate(profile.hireDate) : "—"}</p>
                <p><span className="text-muted-foreground">Specialization: </span>{profile.specialization ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Managed by academic affairs — contact info is editable above.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">My teaching assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    {assignmentRows.length} subject{assignmentRows.length === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="secondary">Class teacher · {supervisedCount} class{supervisedCount === 1 ? "" : "es"}</Badge>
                </div>
                {assignmentRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teaching assignments yet.</p>
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
                          Open class
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
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">End this session on this device.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()}>
            <LogOut size={14} aria-hidden /> Sign out
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
  const [firstName, setFirstName] = React.useState(profile.user?.firstName ?? "");
  const [lastName, setLastName] = React.useState(profile.user?.lastName ?? "");
  const [phone, setPhone] = React.useState(profile.user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile.user?.avatarUrl ?? "");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!firstName.trim()) {
      setFormError("First name cannot be blank.");
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
      setFormError(cause instanceof ApiError ? cause.message : "Unable to save changes");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit contact info</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 p-6 pt-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-first">First name</Label>
              <Input id="profile-first" value={firstName} onChange={(event) => setFirstName(event.target.value)} required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-last">Last name</Label>
              <Input id="profile-last" value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={100} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input id="profile-phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} inputMode="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-avatar">Avatar URL</Label>
            <Input id="profile-avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} maxLength={500} inputMode="url" placeholder="https://…" />
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <DialogFooter className="p-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setFormError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      await changeAuthPassword({ currentPassword, newPassword });
      setDone(true);
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : "Unable to change password");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="space-y-4 p-6 pt-2">
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <BadgeCheck size={16} className="text-success" aria-hidden />
              Password changed successfully.
            </p>
            <DialogFooter className="p-0">
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4 p-6 pt-2" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-1.5">
              <Label htmlFor="pw-current">Current password</Label>
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
              <Label htmlFor="pw-new">New password (min 8 characters)</Label>
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
              <Label htmlFor="pw-confirm">Confirm new password</Label>
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
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Change password"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
