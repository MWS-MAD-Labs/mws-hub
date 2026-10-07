import { memo } from "react";
import { cn } from "@/lib/utils";
import type { HubCategoryFilterOption } from "@/model/hub-model";

type CategoryFilterProps = {
  categories: HubCategoryFilterOption[];
  activeCategory: string;
  onSelect: (id: string) => void;
};

const CategoryFilter = memo(({ categories, activeCategory, onSelect }: CategoryFilterProps) => (
  <div role="tablist" aria-label="Application categories" className="scrollbar-hide -mx-4 flex gap-5 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
    {categories.map((category) => {
      const isActive = activeCategory === category.id;
      return (
        <button
          key={category.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onSelect(category.id)}
          className={cn(
            "font-heading shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {category.label}
          <span className="ml-1.5 text-[10px] tabular-nums opacity-60">{category.count}</span>
        </button>
      );
    })}
  </div>
));

CategoryFilter.displayName = "CategoryFilter";
export default CategoryFilter;
