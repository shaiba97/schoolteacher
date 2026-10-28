export type TeacherProfile = {
  id: string;
  employeeNumber: string;
  specialization?: string | null;
  hireDate?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  status: string;
  user?: { id: string; firstName: string; lastName?: string | null; phone?: string | null; avatarUrl?: string | null } | null;
  department?: { id: string; name: string } | null;
  _count?: { classSubjects: number; classTeacherFor: number };
};

export type TeacherDashboardScheduleEntry = {
  periodNo: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  room?: string | null;
  classId: string;
  className: string;
  subjectId?: string | null;
  subjectName?: string | null;
};

export type TeacherDashboardPendingExam = {
  examId: string;
  examName: string;
  examStatus: string;
  examDate?: string | null;
  createdAt: string;
  subjects: Array<{
    examSubjectId: string;
    subjectName: string;
    className: string;
    entered: number;
    total: number;
  }>;
  enteredCount: number;
  totalCount: number;
  pendingCount: number;
  pending: boolean;
};

export type TeacherDashboardAnnouncement = {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  readAt?: string | null;
  createdAt: string;
};

export type TeacherDashboard = {
  teacherName: string;
  year: { id: string; name: string };
  classesToday: number;
  pendingAttendance: number;
  pendingMarks: number;
  nextSession: TeacherDashboardScheduleEntry | null;
  todaySchedule: TeacherDashboardScheduleEntry[];
  pendingMarksQueue: TeacherDashboardPendingExam[];
  recentAnnouncements: TeacherDashboardAnnouncement[];
};

export type TeacherClassItem = {
  classId: string;
  className: string;
  educationLevel: string;
  grade: string;
  track?: string | null;
  studentCount: number;
  subjects: Array<{ classSubjectId: string; subjectId: string; subjectName: string }>;
};

export type TeacherClassDetail = {
  class: {
    id: string;
    className: string;
    educationLevel: string;
    grade: string;
    track?: string | null;
    capacity?: number | null;
  };
  year: { id: string; name: string };
  mySubjects: Array<{ classSubjectId: string; subjectId: string; subjectName: string }>;
  students: Array<{
    enrollmentId: string;
    student: {
      id: string;
      roleNumber: string;
      firstName: string;
      middleName?: string | null;
      lastName?: string | null;
      gender?: string | null;
      photoUrl?: string | null;
      status: string;
    };
  }>;
  timetable: Array<{
    id: string;
    dayOfWeek: string;
    periodNo: number;
    startTime: string;
    endTime: string;
    isBreak: boolean;
    room?: string | null;
    subjectName?: string | null;
    teacherName?: string | null;
    isMine: boolean;
  }>;
};

export type TeacherTimetableEntry = {
  id: string;
  dayOfWeek: string;
  periodNo: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  room?: string | null;
  classId: string;
  className: string;
  subjectId?: string | null;
  subjectName?: string | null;
};

export type StaffAttendanceEntry = {
  id: string;
  attendanceDate: string;
  status: string;
  leftAt?: string | null;
  remarks?: string | null;
};

export type StaffAttendanceHistory = {
  entries: StaffAttendanceEntry[];
  summary: { present: number; absent: number; leave: number };
};

export type StagedExamSample = {
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
};

export type TeacherAttendanceRow = {
  classId: string;
  className: string;
  /** Timetable period number, or null for legacy whole-day sessions. */
  periodNo: number | null;
  startTime?: string | null;
  endTime?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  session: {
    id: string;
    attendanceDate: string;
    subjectId?: string | null;
    sessionNumber?: number | null;
    recordCount: number;
    status: string;
  } | null;
  editable: boolean;
};

export type TeacherAttendanceSessionDetail = {
  session: {
    id: string;
    classId: string;
    className: string;
    subjectId?: string | null;
    subjectName?: string | null;
    sessionNumber?: number | null;
    attendanceDate: string;
  };
  editable: boolean;
  students: Array<{
    studentId: string;
    roleNumber: string;
    fullName: string;
    photoUrl?: string | null;
    status?: string | null;
    remarks?: string | null;
  }>;
};

export type ExamTypeItem = {
  id: string;
  name: string;
  defaultWeight?: number | null;
};

export type CreateExamPayload = {
  academicYearId: string;
  termId?: string;
  name: string;
  examTypeId?: string;
  startsOn?: string;
  endsOn?: string;
  classIds?: string[];
  subjects: Array<{
    classSubjectId: string;
    examDate?: string;
    maxMarks: number;
    passingMarks?: number;
  }>;
  sample?: {
    objectKey: string;
    originalName: string;
    size: number;
  };
};

export type TeacherExamItem = {
  id: string;
  name: string;
  status: string;
  startsOn?: string | null;
  endsOn?: string | null;
  createdAt: string;
  examType?: { id: string; name: string } | null;
  author?: { id: string; name: string } | null;
  isAuthor: boolean;
  roomLocked: boolean;
  canEdit: boolean;
  subjectsTotal: number;
  mySubjects: Array<{
    examSubjectId: string;
    subjectName: string;
    className: string;
    examDate?: string | null;
    entered: number;
    total: number;
    pending: boolean;
  }>;
  pendingSubjects: number;
};

export type TeacherSupervisorQueueSubject = {
  examSubjectId: string;
  subjectName: string;
  submitted: number;
  total: number;
  allSubmitted: boolean;
};

export type TeacherSupervisorQueueExam = {
  examId: string;
  examName: string;
  status: string;
  examType: string | null;
  subjects: TeacherSupervisorQueueSubject[];
  readyToApprove: boolean;
};

export type TeacherSupervisorQueue = {
  classes: Array<{
    classId: string;
    className: string;
    exams: TeacherSupervisorQueueExam[];
  }>;
};

export type TeacherExamDetailSubject = {
  examSubjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  examDate?: string | null;
  maxMarks: number;
  passingMarks?: number | null;
  gradingScale?: { id: string; name: string } | null;
  rows: Array<{
    studentId: string;
    roleNumber: string;
    fullName: string;
    marks?: number | null;
    grade?: string | null;
    remarks?: string | null;
    resultStatus?: string | null;
  }>;
  entered: number;
  total: number;
};

export type TeacherExamDetail = {
  id: string;
  name: string;
  status: string;
  startsOn?: string | null;
  endsOn?: string | null;
  createdAt: string;
  examType?: { id: string; name: string } | null;
  sampleObjectKey?: string | null;
  year?: { id: string; name: string } | null;
  term?: { id: string; name: string } | null;
  author?: { id: string; name: string } | null;
  isAuthor: boolean;
  roomLocked: boolean;
  canEdit: boolean;
  subjects: TeacherExamDetailSubject[];
};

export type TeacherStudentItem = {
  id: string;
  roleNumber: string;
  fullName: string;
  gender?: string | null;
  grade?: number | null;
  photoUrl?: string | null;
  status: string;
  classes: Array<{ id: string; className: string }>;
};

export type TeacherStudentDetail = {
  student: {
    id: string;
    roleNumber: string;
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    phone?: string | null;
    email?: string | null;
    photoUrl?: string | null;
    status: string;
    admissionDate?: string | null;
    currentClass: { id: string; className: string; educationLevel: string; grade: string; track?: string | null };
  };
  attendance: Array<{
    id: string;
    date: string;
    status: string;
    remarks?: string | null;
    className: string;
    subjectName?: string | null;
  }>;
  results: Array<{
    id: string;
    examId: string;
    examName: string;
    examStatus: string;
    publishedAt?: string | null;
    subjectName: string;
    className: string;
    marks?: number | null;
    maxMarks: number;
    grade?: string | null;
    remarks?: string | null;
    resultStatus: string;
  }>;
};

export type TeacherNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  readAt?: string | null;
  createdAt: string;
};

export type AuthMe = {
  id: string;
  email?: string | null;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

export type TeacherPayoutDeduction = {
  id: string;
  ruleId: string;
  label: string;
  valueType: string;
  value: number;
  amount: number;
  note: string;
};

export type TeacherPayout = {
  id: string;
  userId: string;
  staffName: string;
  staffNumber: string;
  payslipNo: string;
  positionAssignmentId?: string | null;
  positionTitle: string;
  financialPeriodId?: string | null;
  periodName: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  currencyCode: string;
  /** Lowercased: paid | approved | draft */
  status: string;
  accountId?: string | null;
  approvedBy?: string | null;
  paidAt?: string | null;
  paymentMethod: string;
  reference: string;
  notes: string;
  createdAt: string;
  deductions: TeacherPayoutDeduction[];
};

export type TeacherPayroll = {
  payouts: TeacherPayout[];
  ytd: { year: number; paidTotal: number; pendingTotal: number; currencyCode: string };
};
