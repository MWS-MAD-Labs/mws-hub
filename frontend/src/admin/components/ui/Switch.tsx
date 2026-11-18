import { Switch as RadixSwitch } from "radix-ui";

export default function Switch({ id, checked, onCheckedChange, disabled, ariaLabel }: { id?: string; checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; ariaLabel?: string }) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onCheckedChange={onCheckedChange}
      className="admin-focus relative h-5 w-9 shrink-0 rounded-full bg-[var(--admin-border-strong)] transition-colors data-[state=checked]:bg-[var(--admin-brand)] disabled:opacity-50 motion-reduce:transition-none"
    >
      <RadixSwitch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px] motion-reduce:transition-none dark:data-[state=checked]:bg-[#241718]" />
    </RadixSwitch.Root>
  );
}
