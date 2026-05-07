"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  onConfirm,
  loading,
}: ConfirmationDialogProps) {
  const [input, setInput] = useState("");

  function handleConfirm() {
    if (input === confirmText) {
      onConfirm();
      setInput("");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        setInput("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Type{" "}
            <span className="font-mono font-medium text-foreground">
              {confirmText}
            </span>{" "}
            to confirm.
          </p>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={confirmText}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={input !== confirmText || loading}
          >
            {loading ? "Deleting..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
