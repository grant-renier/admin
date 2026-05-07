import { notFound } from "next/navigation";
import { getUserById, UserDetailView } from "@/features/users";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  return (
    <>
      <div className="px-4 lg:px-6">
        <Link href="/dashboard/users">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeftIcon className="size-4" />
            Back to Users
          </Button>
        </Link>
      </div>
      <UserDetailView user={user} />
    </>
  );
}
