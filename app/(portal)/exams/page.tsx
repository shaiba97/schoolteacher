import * as React from "react";
import { ExamsClient } from "@/components/exams/exams-client";

export default function TeacherExamsPage() {
  return (
    <React.Suspense>
      <ExamsClient />
    </React.Suspense>
  );
}
