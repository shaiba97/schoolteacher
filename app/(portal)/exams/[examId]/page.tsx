import { ExamDetailClient } from "@/components/exams/exam-detail-client";

export default async function TeacherExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  return <ExamDetailClient examId={examId} />;
}
