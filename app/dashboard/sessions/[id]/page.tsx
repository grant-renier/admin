import { notFound } from "next/navigation";
import { getSessionById } from "@/features/sessions";
import { SessionDetailView } from "@/features/sessions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

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
      <div className="px-4 lg:px-6">
        <Link href="/dashboard/sessions">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeftIcon className="size-4" />
            Back to Sessions
          </Button>
        </Link>
      </div>
      <SessionDetailView session={session} />
    </>
  );
}
