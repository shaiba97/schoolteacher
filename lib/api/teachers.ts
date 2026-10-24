import { teacherApiFetch } from "./client";
import { ApiError } from "./client";
import type {
  AuthMe,
  CreateExamPayload,
  ExamTypeItem,
  StaffAttendanceHistory,
  StagedExamSample,
  TeacherAttendanceRow,
  TeacherAttendanceSessionDetail,
  TeacherClassDetail,
  TeacherClassItem,
  TeacherDashboard,
  TeacherExamDetail,
  TeacherExamItem,
  TeacherNotification,
  TeacherPayroll,
  TeacherProfile,
  TeacherStudentDetail,
  TeacherStudentItem,
  TeacherTimetableEntry,
} from "./types";

export function getTeacherProfile() {
  return teacherApiFetch<TeacherProfile>("/teachers/me/profile");
}

export function getTeacherDashboard() {
  return teacherApiFetch<TeacherDashboard>("/teachers/me/dashboard");
}

export function listTeacherClasses() {
  return teacherApiFetch<{ year: { id: string; name: string }; classes: TeacherClassItem[] }>(
    "/teachers/me/classes",
  );
}

export function getTeacherClassDetail(classId: string) {
  return teacherApiFetch<TeacherClassDetail>(`/teachers/me/classes/${classId}`);
}

export function getTeacherTimetable() {
  return teacherApiFetch<{
    teacherName: string;
    year: { id: string; name: string };
    entries: TeacherTimetableEntry[];
  }>("/teachers/me/timetable");
}

export function listOwnAttendance(month?: string) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return teacherApiFetch<StaffAttendanceHistory>(`/teachers/me/attendance${suffix}`);
}

export function listTeacherAttendanceSessions(date: string) {
  return teacherApiFetch<{ date: string; weekday: string; rows: TeacherAttendanceRow[] }>(
    `/teachers/me/attendance-sessions?date=${encodeURIComponent(date)}`,
  );
}

export function createTeacherAttendanceSession(payload: { classId: string; periodNo: number; date: string }) {
  return teacherApiFetch<{ id: string }>("/teachers/me/attendance-sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTeacherAttendanceSession(sessionId: string) {
  return teacherApiFetch<TeacherAttendanceSessionDetail>(`/teachers/me/attendance-sessions/${sessionId}`);
}

export function markTeacherAttendanceSession(
  sessionId: string,
  records: Array<{ studentId: string; status: string; remarks?: string }>,
) {
  return teacherApiFetch<{ saved: number }>(`/teachers/me/attendance-sessions/${sessionId}/mark`, {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

export function listTeacherExams(scope: "authored" | "assigned" | "all" = "all") {
  return teacherApiFetch<{ exams: TeacherExamItem[] }>(`/teachers/me/exams?scope=${scope}`);
}

export function getTeacherExamDetail(examId: string) {
  return teacherApiFetch<TeacherExamDetail>(`/teachers/me/exams/${examId}`);
}

export function listTeacherPendingMarks() {
  return teacherApiFetch<{ exams: TeacherDashboard["pendingMarksQueue"] }>("/teachers/me/pending-marks");
}

export function listExamTypes() {
  return teacherApiFetch<ExamTypeItem[]>("/exam-types");
}

export function createExam(payload: CreateExamPayload) {
  return teacherApiFetch<{ id: string }>("/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExamSample(examId: string, sample: CreateExamPayload["sample"]) {
  return teacherApiFetch<{ id: string }>(`/exams/${examId}`, {
    method: "PUT",
    body: JSON.stringify({ sample: sample ?? null }),
  });
}

export function uploadExamSample(file: File, draftId: string) {
  const body = new FormData();
  body.append("file", file);
  body.append("draftId", draftId);
  body.append("documentType", "EXAM_SAMPLE");
  return teacherApiFetch<StagedExamSample>("/storage/upload", { method: "POST", body });
}

export function deleteStagedExamSample(objectKey: string) {
  return teacherApiFetch<{ deleted: true }>("/storage/staging/delete", {
    method: "POST",
    body: JSON.stringify({ objectKey }),
  });
}

/**
 * Browser-only download through the authed proxy (session cookies ride
 * along); the caller turns the blob into an object URL for saving.
 */
export async function downloadStorageFile(objectKey: string): Promise<Blob> {
  const response = await fetch(
    `/api/backend/storage/download?objectKey=${encodeURIComponent(objectKey)}`,
    { credentials: "include", cache: "no-store" },
  );
  if (!response.ok) throw new ApiError("Unable to download file", response.status);
  const blob = await response.blob();
  if (blob.size === 0) throw new ApiError("Unable to download file (empty file)", response.status);
  return blob;
}

export function enterTeacherMarks(
  examId: string,
  examSubjectId: string,
  records: Array<{ studentId: string; marks?: number | null; remarks?: string }>,
) {
  return teacherApiFetch<{ saved: number }>(`/teachers/me/exams/${examId}/subjects/${examSubjectId}/marks`, {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

export function searchTeacherStudents(query: { search?: string; classId?: string } = {}) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.classId) params.set("classId", query.classId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return teacherApiFetch<{ students: TeacherStudentItem[] }>(`/teachers/me/students${suffix}`);
}

export function getTeacherStudentDetail(studentId: string) {
  return teacherApiFetch<TeacherStudentDetail>(`/teachers/me/students/${studentId}`);
}

export function createTeacherAnnouncement(payload: { classId: string; title: string; message: string }) {
  return teacherApiFetch<{ recipients: number }>("/teachers/me/announcements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listMyNotifications() {
  return teacherApiFetch<TeacherNotification[]>("/notifications/me");
}

export function markNotificationRead(id: string) {
  return teacherApiFetch(`/notifications/${id}/read`, { method: "PUT" });
}

export function getAuthMe() {
  return teacherApiFetch<AuthMe>("/auth/me");
}

export function getMyPayroll() {
  return teacherApiFetch<TeacherPayroll>("/teachers/me/payroll");
}

export function updateAuthMe(payload: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }) {
  return teacherApiFetch<AuthMe>("/auth/me", { method: "PUT", body: JSON.stringify(payload) });
}

export function changeAuthPassword(payload: { currentPassword: string; newPassword: string }) {
  return teacherApiFetch<{ changed: boolean }>("/auth/me/password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
