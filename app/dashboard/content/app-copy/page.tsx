import { AppCopyEditor } from "@/features/content";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default function AppCopyPage() {
  return (
    <div className="px-4 lg:px-6">
      <AppCopyEditor />
    </div>
  );
}
