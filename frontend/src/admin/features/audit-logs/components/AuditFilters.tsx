import FilterSelect from "@/admin/components/ui/FilterSelect";
import FieldLabel from "@/admin/components/ui/FieldLabel";
import SearchInput from "@/admin/components/ui/SearchInput";
import TextField from "@/admin/components/ui/TextField";
import { ACTION_FILTER_OPTIONS, RANGE_OPTIONS, minDate, rangeFor, shiftDate, toDateOnly, type RangePreset } from "../auditLabels";

type AuditFiltersProps = {
  query: string;
  action: string;
  preset: RangePreset;
  dateFrom: string;
  dateTo: string;
  onChange: (patch: Record<string, string>) => void;
};

// Search, action and date range. Every change goes back to page 1.
export default function AuditFilters({ query, action, preset, dateFrom, dateTo, onChange }: AuditFiltersProps) {
  return (
    <>
      <div className="flex w-full flex-col sm:w-72">
        <FieldLabel>Search</FieldLabel>
        <SearchInput value={query} onChange={(value) => onChange({ q: value, page: "1" })} placeholder="Search actor, action, or entity" className="sm:w-full" />
      </div>
      <FilterSelect label="Action" value={action || "all"} options={ACTION_FILTER_OPTIONS} onChange={(value) => onChange({ action: value === "all" ? "" : value, page: "1" })} className="sm:w-52" />
      <FilterSelect
        label="Date range"
        value={preset}
        options={RANGE_OPTIONS}
        onChange={(value) => {
          const next = rangeFor(value === "custom" ? "this_week" : value);
          onChange({ range: value, dateFrom: next.from, dateTo: next.to, page: "1" });
        }}
      />
      {preset === "custom" ? (
        <>
          <TextField label="From" type="date" value={dateFrom} min={shiftDate(dateTo, -30)} max={dateTo} onChange={(event) => onChange({ dateFrom: event.target.value, page: "1" })} wrapperClassName="sm:w-40" />
          <TextField label="To" type="date" value={dateTo} min={dateFrom} max={minDate(shiftDate(dateFrom, 30), toDateOnly(new Date()))} onChange={(event) => onChange({ dateTo: event.target.value, page: "1" })} wrapperClassName="sm:w-40" />
        </>
      ) : null}
    </>
  );
}
