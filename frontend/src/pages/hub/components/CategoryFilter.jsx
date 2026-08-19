import { memo } from "react";
import { cn } from "@/lib/utils";

// Horizontal filter row, not a sidebar. Five categories never justify a
// permanent 200px column - that width is worth an extra card per row instead.
// Same control on every breakpoint; below sm it simply scrolls sideways.
const CategoryFilter = memo(({ categories, activeCategory, onSelect }) => (
    <div
        role="tablist"
        aria-label="Application categories"
        className="scrollbar-hide -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
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
                        "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                            ? "bg-foreground/90 font-medium text-background"
                            : "text-muted-foreground hover:bg-card hover:text-foreground"
                    )}
                >
                    {category.label}
                    <span className={cn("ml-1.5 text-xs tabular-nums", isActive ? "opacity-70" : "opacity-50")}>
                        {category.count}
                    </span>
                </button>
            );
        })}
    </div>
));

CategoryFilter.displayName = "CategoryFilter";
export default CategoryFilter;
