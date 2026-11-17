import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";
import Dropdown from "./Dropdown";

type AdminPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export default function AdminPagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [10, 25, 50, 100] }: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--admin-border)] bg-[var(--admin-card-subtle)] px-5 py-3 text-xs text-[var(--admin-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite">Showing {start}-{end} of {total}</p>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2"><span className="font-semibold">Rows per page</span><Dropdown value={String(pageSize)} onChange={(value) => onPageSizeChange(Number(value))} options={pageSizeOptions.map((option) => ({ value: String(option), label: String(option) }))} size="sm" ariaLabel="Rows per page" className="w-20" align="right" /></div>
        ) : null}
        <div className="flex items-center gap-2">
          <Button size="sm" iconOnly disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-24 text-center">Page {safePage} of {totalPages}</span>
          <Button size="sm" iconOnly disabled={safePage >= totalPages} onClick={() => onPageChange(safePage + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
