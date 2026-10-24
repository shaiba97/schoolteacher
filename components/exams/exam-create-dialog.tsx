"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import {
  createExam,
  deleteStagedExamSample,
  listExamTypes,
  listTeacherClasses,
  uploadExamSample,
} from "@/lib/api/teachers";
import { ApiError } from "@/lib/api/client";
import type { TeacherClassItem } from "@/lib/api/types";
import { todayISO } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-provider";

export type ExamKind = "test" | "exam";

const KIND: Record<ExamKind, { title: "examCreate.testTitle" | "examCreate.examTitle"; typeName: string; noun: "test" | "exam"; label: "examCreate.testLabel" | "examCreate.examLabel" }> = {
  test: { title: "examCreate.testTitle", typeName: "Test", noun: "test", label: "examCreate.testLabel" },
  exam: { title: "examCreate.examTitle", typeName: "Exam", noun: "exam", label: "examCreate.examLabel" },
};

type Draft = {
  classId: string;
  classSubjectId: string;
  name: string;
  nameTouched: boolean;
  date: string;
  maxMarks: string;
  passingMarks: string;
  sampleFile: File | null;
};

const emptyDraft: Draft = {
  classId: "",
  classSubjectId: "",
  name: "",
  nameTouched: false,
  date: todayISO(),
  maxMarks: "",
  passingMarks: "",
  sampleFile: null,
};

export function ExamCreateDialog({
  kind,
  open,
  onOpenChange,
  onCreated,
}: {
  kind: ExamKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (examId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Remount per kind+opening so every run starts from a clean draft. */}
        {open && (
          <ExamCreateForm
            key={kind}
            kind={kind}
            onOpenChange={onOpenChange}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ExamCreateForm({
  kind,
  onOpenChange,
  onCreated,
}: {
  kind: ExamKind;
  onOpenChange: (open: boolean) => void;
  onCreated: (examId: string) => void;
}) {
  const config = KIND[kind];
  const { t } = useI18n();
  const [step, setStep] = React.useState(0);
  const [classes, setClasses] = React.useState<TeacherClassItem[]>([]);
  const [yearId, setYearId] = React.useState("");
  const [examTypeId, setExamTypeId] = React.useState("");
  const [draft, setDraft] = React.useState<Draft>({ ...emptyDraft, date: todayISO() });
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [submitError, setSubmitError] = React.useState("");

  const patch = React.useCallback(
    (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next })),
    [],
  );

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([listTeacherClasses(), listExamTypes()]).then(
      ([classRes, types]) => {
        if (cancelled) return;
        setClasses(classRes.classes);
        setYearId(classRes.year.id);
        const match = types.find(
          (type) => type.name.trim().toLowerCase() === config.typeName.toLowerCase(),
        );
        if (!match) {
          setLoadError(t("examCreate.noType", { name: config.typeName }));
        } else {
          setExamTypeId(match.id);
        }
        setLoading(false);
      },
      (cause: unknown) => {
        if (cancelled) return;
        setLoadError(cause instanceof ApiError ? cause.message : t("examCreate.loadError"));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
    // t is stable per locale; loading once per open is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.typeName]);

  const chosenClass = classes.find((schoolClass) => schoolClass.classId === draft.classId) ?? null;
  const chosenSubject = chosenClass?.subjects.find((subject) => subject.classSubjectId === draft.classSubjectId) ?? null;

  function pickClass(classId: string) {
    const next = classes.find((schoolClass) => schoolClass.classId === classId);
    const subjects = next?.subjects ?? [];
    const auto = subjects.length === 1 ? subjects[0] : null;
    patch({
      classId,
      classSubjectId: auto?.classSubjectId ?? "",
      name: !draft.nameTouched && auto
        ? t("examCreate.namePlaceholder", { subject: auto.subjectName, label: t(config.label) })
        : draft.name,
    });
  }

  function pickSubject(classSubjectId: string) {
    const subject = chosenClass?.subjects.find((item) => item.classSubjectId === classSubjectId);
    patch({
      classSubjectId,
      name: !draft.nameTouched && subject
        ? t("examCreate.namePlaceholder", { subject: subject.subjectName, label: t(config.label) })
        : draft.name,
    });
  }

  function detailsError(values: Draft): string {
    if (!values.name.trim()) return t("examCreate.nameRequired", { noun: t(config.label).toLowerCase() });
    if (!values.date) return t("examCreate.dateRequired");
    const max = Number(values.maxMarks);
    if (!Number.isFinite(max) || max < 1) return t("examCreate.maxRequired");
    if (values.passingMarks.trim()) {
      const pass = Number(values.passingMarks);
      if (!Number.isFinite(pass) || pass < 0) return t("examCreate.passRequired");
      if (pass > max) return t("examCreate.passExceedsMax");
    }
    if (values.sampleFile) {
      if (values.sampleFile.type !== "application/pdf") return t("examCreate.samplePdf");
      if (values.sampleFile.size > 10 * 1024 * 1024) return t("examCreate.sampleSize");
    }
    return "";
  }

  function stepError(): string {
    if (step === 0 && !draft.classId) return t("examCreate.pickClass");
    if (step === 1 && !draft.classSubjectId) return t("examCreate.pickSubject");
    if (step === 2) return detailsError(draft);
    return "";
  }

  /** Full validation at submit time: the Review step itself has no fields. */
  function submitErrorText(values: Draft): string {
    if (!values.classId) return t("examCreate.pickClass");
    if (!values.classSubjectId) return t("examCreate.pickSubject");
    return detailsError(values);
  }

  const blockingError = loadError || stepError();

  const submitGuard = React.useRef(false);

  async function handleSubmit() {
    if (submitGuard.current) return;
    const problem = submitErrorText(draft);
    if (problem || !chosenSubject || !examTypeId || !yearId) {
      setSubmitError(problem || t("examCreate.submitIncomplete"));
      return;
    }
    submitGuard.current = true;
    setSubmitting(true);
    setSubmitError("");
    let stagedKey: string | null = null;
    try {
      let sample: { objectKey: string; originalName: string; size: number } | undefined;
      if (draft.sampleFile) {
        const staged = await uploadExamSample(draft.sampleFile, crypto.randomUUID());
        stagedKey = staged.objectKey;
        sample = { objectKey: staged.objectKey, originalName: staged.originalName, size: staged.size };
      }
      const max = Number(draft.maxMarks);
      const created = await createExam({
        academicYearId: yearId,
        name: draft.name.trim(),
        examTypeId,
        startsOn: draft.date,
        endsOn: draft.date,
        subjects: [
          {
            classSubjectId: chosenSubject.classSubjectId,
            examDate: draft.date,
            maxMarks: max,
            ...(draft.passingMarks.trim() ? { passingMarks: Number(draft.passingMarks) } : {}),
          },
        ],
        ...(sample ? { sample } : {}),
      });
      onCreated(created.id);
      onOpenChange(false);
    } catch (cause) {
      if (stagedKey) {
        await deleteStagedExamSample(stagedKey).catch(() => undefined);
        stagedKey = null;
      }
      setSubmitError(cause instanceof ApiError ? cause.message : t("examCreate.createError", { noun: t(config.label).toLowerCase() }));
    } finally {
      submitGuard.current = false;
      setSubmitting(false);
    }
  }

  const STEPS = ["examCreate.stepClass", "examCreate.stepSubject", "examCreate.stepDetails", "examCreate.stepReview"] as const;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t(config.title)}</DialogTitle>
      </DialogHeader>
        <div className="space-y-4 p-6 pt-2">
          <ol className="flex flex-wrap gap-1.5" aria-label={t("examCreate.progressAria")}>
            {STEPS.map((stepKey, index) => (
              <li
                key={stepKey}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  index === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : index < step
                      ? "border-success/30 bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-current={index === step ? "step" : undefined}
              >
                {index + 1}. {t(stepKey)}
              </li>
            ))}
          </ol>

          {loading ? (
            <p className="text-sm text-muted-foreground" role="status">{t("examCreate.loadingClasses")}</p>
          ) : (
            <>
              {blockingError && (
                <p role="alert" className="text-sm text-destructive">{blockingError}</p>
              )}
              {step === 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="exam-class">{t("examCreate.classLabel")}</Label>
                  <Select
                    id="exam-class"
                    value={draft.classId}
                    onChange={(event) => pickClass(event.target.value)}
                  >
                    <option value="">{t("examCreate.classOption")}</option>
                    {classes.map((schoolClass) => (
                      <option key={schoolClass.classId} value={schoolClass.classId}>
                        {schoolClass.className}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-1.5">
                  <Label htmlFor="exam-subject">{t("examCreate.subjectLabel")}</Label>
                  <Select
                    id="exam-subject"
                    value={draft.classSubjectId}
                    onChange={(event) => pickSubject(event.target.value)}
                  >
                    <option value="">{t("examCreate.subjectOption")}</option>
                    {(chosenClass?.subjects ?? []).map((subject) => (
                      <option key={subject.classSubjectId} value={subject.classSubjectId}>
                        {subject.subjectName}
                      </option>
                    ))}
                  </Select>
                  {chosenClass && chosenClass.subjects.length === 0 ? (
                    <p role="alert" className="text-xs text-destructive">
                      {t("examCreate.noSubjects", { name: chosenClass.className })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("examCreate.onlyMine", { name: chosenClass?.className ?? t("examCreate.stepSubject") })}
                    </p>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="exam-name">{t("examCreate.nameLabel")}</Label>
                    <Input
                      id="exam-name"
                      value={draft.name}
                      onChange={(event) => patch({ name: event.target.value, nameTouched: true })}
                      placeholder={t("examCreate.namePlaceholder", { subject: chosenSubject?.subjectName ?? "Subject", label: t(config.label) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-date">{t("examCreate.dateLabel")}</Label>
                    <Input
                      id="exam-date"
                      type="date"
                      value={draft.date}
                      onChange={(event) => patch({ date: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-max">{t("examCreate.maxLabel")}</Label>
                    <Input
                      id="exam-max"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      value={draft.maxMarks}
                      onChange={(event) => patch({ maxMarks: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-pass">{t("examCreate.passLabel")}</Label>
                    <Input
                      id="exam-pass"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={draft.passingMarks}
                      onChange={(event) => patch({ passingMarks: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="exam-sample">{t("examCreate.sampleLabel")}</Label>
                    <Input
                      id="exam-sample"
                      type="file"
                      accept="application/pdf"
                      onChange={(event) => patch({ sampleFile: event.target.files?.[0] ?? null })}
                    />
                    <p className="text-xs text-muted-foreground">{t("examCreate.sampleHint")}</p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("examCreate.typeField")}</dt><dd className="font-medium">{t(config.label)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("examCreate.classField")}</dt><dd className="font-medium">{chosenClass?.className}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("examCreate.subjectField")}</dt><dd className="font-medium">{chosenSubject?.subjectName}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("examCreate.nameField")}</dt><dd className="min-w-0 truncate text-right font-medium">{draft.name.trim()}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("examCreate.dateField")}</dt><dd className="font-medium">{draft.date}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("examCreate.maxField")}</dt><dd className="font-medium">{draft.maxMarks}{draft.passingMarks.trim() ? ` ${t("examCreate.passSuffix", { count: draft.passingMarks })}` : ""}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("examCreate.sampleField")}</dt><dd className="min-w-0 truncate text-right font-medium">{draft.sampleFile ? draft.sampleFile.name : t("examCreate.none")}</dd></div>
                </dl>
              )}

              {submitError && (
                <p role="alert" className="text-sm text-destructive">{submitError}</p>
              )}
            </>
          )}

          <div className="flex justify-between border-t pt-4">
            <Button type="button" variant="outline" disabled={step === 0 || submitting} onClick={() => setStep(step - 1)}>
              {t("examCreate.back")}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" disabled={!!blockingError || submitting} onClick={() => setStep(step + 1)}>
                {t("examCreate.next")}
              </Button>
            ) : (
              <Button type="button" disabled={!!blockingError || submitting} onClick={() => void handleSubmit()}>
                {submitting ? t("examCreate.creating") : t(config.noun === "test" ? "examCreate.createTest" : "examCreate.createExam")}
              </Button>
            )}
          </div>
        </div>
    </>
  );
}
