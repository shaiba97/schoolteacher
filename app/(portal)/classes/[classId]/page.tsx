import { ClassDetailClient } from "@/components/classes/class-detail-client";

export default async function TeacherClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return <ClassDetailClient classId={classId} />;
}
