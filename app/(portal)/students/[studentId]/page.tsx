import { StudentDetailClient } from "@/components/students/student-detail-client";

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <StudentDetailClient studentId={studentId} />;
}
