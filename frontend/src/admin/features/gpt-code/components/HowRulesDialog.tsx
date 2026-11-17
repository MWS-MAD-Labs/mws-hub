import Modal from "@/admin/components/ui/Modal";

export default function HowRulesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="How rules work" size="sm" description="If several rules match a person, the most specific one wins:">
      <ol className="list-decimal space-y-1 pl-5 text-sm font-medium text-[var(--admin-text)]">
        <li>Exception</li>
        <li>Job position</li>
        <li>Job level</li>
        <li>Unit</li>
        <li>Building</li>
      </ol>
      <p className="mt-4 text-sm leading-6 text-[var(--admin-text-secondary)]">Hub admins see all accounts. Changes take effect on the next code request.</p>
    </Modal>
  );
}
