import type { AdminGptCodeConfiguration } from "@/admin/api/adminApi";
import Modal from "@/admin/components/ui/Modal";
import ExceptionsPanel from "./ExceptionsPanel";

export default function ExceptionsDialog({ open, onOpenChange, configuration, onChanged }: { open: boolean; onOpenChange: (open: boolean) => void; configuration: AdminGptCodeConfiguration; onChanged: () => Promise<void> }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Exceptions"
      size="lg"
      description="For one person, by sign-in email. An exception beats every rule: give someone a specific account (also when no rule covers them), or block them. Saving an email that already has an exception replaces it."
    >
      <ExceptionsPanel configuration={configuration} onChanged={onChanged} />
    </Modal>
  );
}
