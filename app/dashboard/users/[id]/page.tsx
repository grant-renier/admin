import { notFound } from "next/navigation";
import { UserDetailView, UserActions } from "@/features/users";
import { getUserById } from "@/features/users/queries";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

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
      <div className="px-4 lg:px-6 pb-6">
        <UserActions
          userId={user.id}
          email={user.email}
          role={user.role}
          bannedUntil={user.bannedUntil}
          billingBypass={user.billing_bypass}
        />
      </div>
    </>
  );
}
