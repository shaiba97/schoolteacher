import { SessionClient } from "@/components/attendance/session-client";

export default async function TeacherSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <SessionClient sessionId={sessionId} />;
}
