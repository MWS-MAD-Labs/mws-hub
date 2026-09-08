type SectionHeadingProps = {
  step: number;
  title: string;
  subtitle: string;
};

export default function SectionHeading({ step, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
        {step}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
