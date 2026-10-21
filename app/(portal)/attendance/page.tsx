import * as React from "react";
import { AttendanceClient } from "@/components/attendance/attendance-client";

export default function TeacherAttendancePage() {
  return (
    <React.Suspense>
      <AttendanceClient />
    </React.Suspense>
  );
}
