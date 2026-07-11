import { notFound } from "next/navigation";
import { getSessionById } from "@/features/sessions/queries";
import { SessionDetailView } from "@/features/sessions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { SessionDeleteButton } from "./client";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionById(id);

  if (!session) {
    notFound();
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Link href="/dashboard/sessions">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeftIcon className="size-4" />
            Back to Sessions
          </Button>
        </Link>
        <SessionDeleteButton sessionId={id} />
      </div>
      <SessionDetailView session={session} />
    </>
  );
}
