"use client";

import { useState } from "react";
import { Button, Dialog, Textarea } from "@/components/ui";
import type { Member } from "../mock-data";

export function DeactivateDialog({
  member,
  open,
  onClose,
  onConfirm,
}: {
  member: Member;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");


  return (
    <Dialog open={open} onClose={onClose} title={`Deactivate ${member.name}?`}>
      <div className="flex flex-col gap-4">
        <p className="text-muted">
          They lose access right away, including on floor tablets. Their past records are kept.
        </p>
        <Textarea label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(reason)}>Deactivate</Button>
        </div>
      </div>
    </Dialog>
  );
}
