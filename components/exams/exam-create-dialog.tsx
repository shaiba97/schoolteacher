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

export type ExamKind = "test" | "exam";

const KIND: Record<ExamKind, { title: string; typeName: string; noun: string; label: string }> = {
  test: { title: "New test", typeName: "Test", noun: "test", label: "Test" },
  exam: { title: "New exam", typeName: "Exam", noun: "exam", label: "Exam" },
};

const STEPS = ["Class", "Subject", "Details", "Review"] as const;

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
          setLoadError(
            `No "${config.typeName}" exam type is configured — ask academic affairs to create it.`,
          );
        } else {
          setExamTypeId(match.id);
        }
        setLoading(false);
      },
      (cause: unknown) => {
        if (cancelled) return;
        setLoadError(cause instanceof ApiError ? cause.message : "Unable to load options");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
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
      name: !draft.nameTouched && auto ? `${auto.subjectName} ${config.label}` : draft.name,
    });
  }

  function pickSubject(classSubjectId: string) {
    const subject = chosenClass?.subjects.find((item) => item.classSubjectId === classSubjectId);
    patch({
      classSubjectId,
      name: !draft.nameTouched && subject ? `${subject.subjectName} ${config.label}` : draft.name,
    });
  }

  function detailsError(values: Draft): string {
    if (!values.name.trim()) return `Name this ${config.noun}.`;
    if (!values.date) return "Pick a date.";
    const max = Number(values.maxMarks);
    if (!Number.isFinite(max) || max < 1) return "Max marks must be at least 1.";
    if (values.passingMarks.trim()) {
      const pass = Number(values.passingMarks);
      if (!Number.isFinite(pass) || pass < 0) return "Passing marks must be 0 or more.";
      if (pass > max) return "Passing marks cannot exceed max marks.";
    }
    if (values.sampleFile) {
      if (values.sampleFile.type !== "application/pdf") return "Sample must be a PDF file.";
      if (values.sampleFile.size > 10 * 1024 * 1024) return "Sample must be 10MB or less.";
    }
    return "";
  }

  function stepError(): string {
    if (step === 0 && !draft.classId) return "Pick a class.";
    if (step === 1 && !draft.classSubjectId) return "Pick a subject you teach in this class.";
    if (step === 2) return detailsError(draft);
    return "";
  }

  /** Full validation at submit time: the Review step itself has no fields. */
  function submitErrorText(values: Draft): string {
    if (!values.classId) return "Pick a class.";
    if (!values.classSubjectId) return "Pick a subject you teach in this class.";
    return detailsError(values);
  }

  const blockingError = loadError || stepError();

  const submitGuard = React.useRef(false);

  async function handleSubmit() {
    if (submitGuard.current) return;
    const problem = submitErrorText(draft);
    if (problem || !chosenSubject || !examTypeId || !yearId) {
      setSubmitError(problem || "Complete every step before submitting.");
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
      setSubmitError(cause instanceof ApiError ? cause.message : `Unable to create ${config.noun}`);
    } finally {
      submitGuard.current = false;
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{config.title}</DialogTitle>
      </DialogHeader>
        <div className="space-y-4 p-6 pt-2">
          <ol className="flex flex-wrap gap-1.5" aria-label="Progress">
            {STEPS.map((label, index) => (
              <li
                key={label}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  index === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : index < step
                      ? "border-success/30 bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-current={index === step ? "step" : undefined}
              >
                {index + 1}. {label}
              </li>
            ))}
          </ol>

          {loading ? (
            <p className="text-sm text-muted-foreground" role="status">Loading classes…</p>
          ) : (
            <>
              {blockingError && (
                <p role="alert" className="text-sm text-destructive">{blockingError}</p>
              )}
              {step === 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="exam-class">Class *</Label>
                  <Select
                    id="exam-class"
                    value={draft.classId}
                    onChange={(event) => pickClass(event.target.value)}
                  >
                    <option value="">Select a class you teach</option>
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
                  <Label htmlFor="exam-subject">Subject *</Label>
                  <Select
                    id="exam-subject"
                    value={draft.classSubjectId}
                    onChange={(event) => pickSubject(event.target.value)}
                  >
                    <option value="">Select a subject you teach here</option>
                    {(chosenClass?.subjects ?? []).map((subject) => (
                      <option key={subject.classSubjectId} value={subject.classSubjectId}>
                        {subject.subjectName}
                      </option>
                    ))}
                  </Select>
                  {chosenClass && chosenClass.subjects.length === 0 ? (
                    <p role="alert" className="text-xs text-destructive">
                      No subjects are assigned to you in {chosenClass.className} — pick another class.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Only subjects assigned to you in {chosenClass?.className ?? "this class"} are listed.
                    </p>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="exam-name">Name *</Label>
                    <Input
                      id="exam-name"
                      value={draft.name}
                      onChange={(event) => patch({ name: event.target.value, nameTouched: true })}
                      placeholder={`${chosenSubject?.subjectName ?? "Subject"} ${config.label}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-date">Date *</Label>
                    <Input
                      id="exam-date"
                      type="date"
                      value={draft.date}
                      onChange={(event) => patch({ date: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-max">Max marks *</Label>
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
                    <Label htmlFor="exam-pass">Passing marks (optional)</Label>
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
                    <Label htmlFor="exam-sample">Sample paper (PDF, optional)</Label>
                    <Input
                      id="exam-sample"
                      type="file"
                      accept="application/pdf"
                      onChange={(event) => patch({ sampleFile: event.target.files?.[0] ?? null })}
                    />
                    <p className="text-xs text-muted-foreground">PDF up to 10MB. Can also be attached later from the exam page.</p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Type</dt><dd className="font-medium">{config.label}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Class</dt><dd className="font-medium">{chosenClass?.className}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Subject</dt><dd className="font-medium">{chosenSubject?.subjectName}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Name</dt><dd className="min-w-0 truncate text-right font-medium">{draft.name.trim()}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{draft.date}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Max marks</dt><dd className="font-medium">{draft.maxMarks}{draft.passingMarks.trim() ? ` (pass ${draft.passingMarks})` : ""}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Sample</dt><dd className="min-w-0 truncate text-right font-medium">{draft.sampleFile ? draft.sampleFile.name : "None"}</dd></div>
                </dl>
              )}

              {submitError && (
                <p role="alert" className="text-sm text-destructive">{submitError}</p>
              )}
            </>
          )}

          <div className="flex justify-between border-t pt-4">
            <Button type="button" variant="outline" disabled={step === 0 || submitting} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" disabled={!!blockingError || submitting} onClick={() => setStep(step + 1)}>
                Next
              </Button>
            ) : (
              <Button type="button" disabled={!!blockingError || submitting} onClick={() => void handleSubmit()}>
                {submitting ? "Creating…" : `Create ${config.noun}`}
              </Button>
            )}
          </div>
        </div>
    </>
  );
}
