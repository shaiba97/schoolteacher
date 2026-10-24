"use client";

import * as React from "react";
import { Bell, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createTeacherAnnouncement,
  listMyNotifications,
  listTeacherClasses,
  markNotificationRead,
} from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherNotification } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/locale-provider";
import { formatDateTime } from "@/lib/utils";

export function AnnouncementsClient() {
  const { t, locale } = useI18n();
  const [items, setItems] = React.useState<TeacherNotification[]>([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [composeOpen, setComposeOpen] = React.useState(false);

  const load = React.useCallback(() => {
    listMyNotifications().then(
      (res) => {
        setItems(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : t("announcements.loadError"));
        setLoading(false);
      },
    );
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

  async function handleRead(id: string) {
    const target = items.find((item) => item.id === id);
    if (!target || target.readAt) return;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
    try {
      await markNotificationRead(id);
    } catch {
      load();
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("announcements.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("announcements.subtitle")}
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setComposeOpen(true)}>
          <Megaphone size={14} aria-hidden /> {t("announcements.new")}
        </Button>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            {t("common.retry")}
          </Button>
        </div>
      )}

      {items.length === 0 && !error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Bell size={20} className="mx-auto text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">{t("announcements.none")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("announcements.noneHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void handleRead(item.id)}
                className="block w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
              >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</p>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="outline">{item.type.replace(/_/g, " ")}</Badge>
                    {!item.readAt && <Badge variant="info">{t("common.new")}</Badge>}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.createdAt, locale)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {composeOpen && <ComposeDialog open onOpenChange={setComposeOpen} />}
    </div>
  );
}

function ComposeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  // Mounted fresh on every open (see caller), so initializers reset the form.
  const { t } = useI18n();
  const [classes, setClasses] = React.useState<Array<{ id: string; name: string }>>([]);
  const [classId, setClassId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [sentNote, setSentNote] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    listTeacherClasses().then(
      (res) => {
        if (cancelled) return;
        setClasses(res.classes.map((c) => ({ id: c.classId, name: c.className })));
      },
      () => {
        if (cancelled) return;
        setFormError(t("announcements.loadClassesError"));
      },
    );
    return () => {
      cancelled = true;
    };
    // t is stable per locale; loading once per open is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!classId) {
      setFormError(t("announcements.selectClass"));
      return;
    }
    if (!title.trim() || !message.trim()) {
      setFormError(t("announcements.required"));
      return;
    }
    setPending(true);
    setFormError("");
    setSentNote("");
    try {
      const result = await createTeacherAnnouncement({
        classId,
        title: title.trim(),
        message: message.trim(),
      });
      setSentNote(result.recipients === 1 ? t("announcements.sentOne") : t("announcements.sentMany", { count: result.recipients }));
      setTitle("");
      setMessage("");
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : t("announcements.sendError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("announcements.composeTitle")}</DialogTitle>
          <DialogDescription>
            {t("announcements.composeSubtitle")}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4 p-6 pt-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-1.5">
            <Label htmlFor="announce-class">{t("announcements.classLabel")}</Label>
            <Select id="announce-class" value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">{t("announcements.selectOption")}</option>
              {classes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announce-title">{t("announcements.titleLabel")}</Label>
            <Input
              id="announce-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("announcements.titlePlaceholder")}
              maxLength={255}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announce-message">{t("announcements.messageLabel")}</Label>
            <Textarea
              id="announce-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("announcements.messagePlaceholder")}
              maxLength={4000}
              required
            />
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          {sentNote && (
            <p role="status" className="text-sm text-muted-foreground">
              {sentNote}
            </p>
          )}
          <DialogFooter className="p-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {sentNote ? t("common.close") : t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending || !classId || !title.trim() || !message.trim()}>
              {pending ? t("announcements.sending") : t("announcements.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
