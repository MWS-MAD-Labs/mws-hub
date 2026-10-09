type SectionHeadingProps = {
  step: number;
  title: string;
  subtitle: string;
};

export default function SectionHeading({ step, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--admin-border)] px-5 py-4 sm:px-6">
      <span className="admin-heading mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--admin-brand-soft)] text-xs font-bold text-[var(--admin-brand)]">
        {step}
      </span>
      <div>
        <h3 className="admin-heading text-sm font-bold text-[var(--admin-text)]">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-[var(--admin-text-tertiary)]">{subtitle}</p>
      </div>
    </div>
  );
}
