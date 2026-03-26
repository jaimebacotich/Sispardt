"use client";

import { cn } from "@/lib/utils";

export interface FilterChip<T extends string = string> {
  value: T;
  label: string;
  activeClassName?: string;
}

interface FilterChipsProps<T extends string = string> {
  chips: FilterChip<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  className?: string;
}

export function FilterChips<T extends string>({
  chips,
  selected,
  onToggle,
  className,
}: FilterChipsProps<T>) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => {
        const isActive = selected.includes(chip.value);
        return (
          <button
            key={chip.value}
            onClick={() => onToggle(chip.value)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150",
              isActive
                ? cn(
                    "shadow-sm",
                    chip.activeClassName ??
                      "bg-primary text-primary-foreground border-primary"
                  )
                : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
