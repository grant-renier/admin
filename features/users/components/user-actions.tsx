"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { BanIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import {
  updateUserRoleAction,
  deleteUserAction,
  setUserBannedAction,
} from "@/app/dashboard/users/actions";
import { USER_ROLES, type UserRole } from "../types";

interface UserActionsProps {
  userId: string;
  email: string;
  role: string;
  bannedUntil: string | null;
}

/**
 * Admin controls for a single user: role change, ban/unban, and permanent
 * deletion. Destructive actions are gated behind typed confirmations.
 */
export function UserActions({
  userId,
  email,
  role,
  bannedUntil,
}: UserActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmBan, setConfirmBan] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // A past banned_until means the ban has already expired.
  const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date();

  const handleRoleChange = (next: string | null) => {
    if (!next || next === role) return;
    startTransition(async () => {
      try {
        await updateUserRoleAction(userId, next as UserRole);
        toast.success(`Role changed to ${next}`);
        router.refresh();
      } catch {
        toast.error("Failed to change role");
      }
    });
  };

  const handleBanToggle = () => {
    startTransition(async () => {
      try {
        await setUserBannedAction(userId, !isBanned);
        toast.success(isBanned ? "User unbanned" : "User banned");
        setConfirmBan(false);
        router.refresh();
      } catch {
        toast.error(isBanned ? "Failed to unban user" : "Failed to ban user");
        setConfirmBan(false);
      }
    });
  };

  const confirmDeleteUser = () => {
    startTransition(async () => {
      try {
        await deleteUserAction(userId);
        toast.success("User deleted");
        setConfirmDelete(false);
        // The detail page no longer exists after deletion.
        router.push("/dashboard/users");
      } catch {
        toast.error("Failed to delete user");
        setConfirmDelete(false);
      }
    });
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Manage Account
          {isBanned && (
            <Badge variant="destructive" className="uppercase">
              Banned
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Role changes take effect on the user&apos;s next request. Ban and
          delete act on the auth account itself.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Role</p>
          <p className="text-xs text-muted-foreground">
            {/* The access-gate kill switch exempts admin/beta -- promote
                team accounts here so they keep working after cutover. */}
            <span className="font-medium">admin</span> and{" "}
            <span className="font-medium">beta</span> bypass the access-gate
            kill switch; <span className="font-medium">user</span> accounts
            are locked out when the gate is closed.
          </p>
          <Select
            value={role}
            onValueChange={handleRoleChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isBanned ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={handleBanToggle}
              className="gap-2"
            >
              <ShieldCheckIcon className="size-4" />
              Unban User
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setConfirmBan(true)}
              className="gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
            >
              <BanIcon className="size-4" />
              Ban User
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => setConfirmDelete(true)}
            className="gap-2"
          >
            <Trash2Icon className="size-4" />
            Delete User
          </Button>
        </div>

        {isBanned && bannedUntil && (
          <p className="text-xs text-muted-foreground">
            Banned until {new Date(bannedUntil).toLocaleDateString("en-US")}.
          </p>
        )}
      </CardContent>

      <ConfirmationDialog
        open={confirmBan}
        onOpenChange={(open) => !open && setConfirmBan(false)}
        title="Ban User"
        description={`This blocks ${email} from signing in until unbanned. Their data is preserved and the ban is reversible from this page.`}
        confirmText="ban"
        onConfirm={handleBanToggle}
        loading={isPending}
      />

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(false)}
        title="Delete User Permanently"
        description={`This permanently deletes the auth account and profile for ${email}. It cannot be undone. Session and analytics data are retained but orphaned. Type the user's email to confirm.`}
        confirmText={email}
        onConfirm={confirmDeleteUser}
        loading={isPending}
      />
    </Card>
  );
}
