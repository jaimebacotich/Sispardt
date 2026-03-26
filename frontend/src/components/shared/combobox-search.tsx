"use client";

import { useState, useRef, useEffect } from "react";
import { type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FormField } from "./form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxSearchProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  options: ComboboxOption[];
  description?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

export function ComboboxSearch<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados.",
  options,
  description,
  required,
  disabled,
  clearable = false,
  className,
}: ComboboxSearchProps<TFieldValues>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
      render={({ field, fieldState }) => {
        const selected = options.find((o) => o.value === field.value);

        return (
          <div ref={containerRef} className="relative">
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-invalid={fieldState.invalid}
              disabled={disabled}
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "w-full justify-between font-normal h-8 pr-2",
                !selected && "text-muted-foreground",
                fieldState.invalid && "border-destructive"
              )}
            >
              <span className="truncate">{selected ? selected.label : placeholder}</span>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {clearable && selected && (
                  <span
                    role="button"
                    aria-label="Limpiar"
                    onClick={(e) => {
                      e.stopPropagation();
                      field.onChange("");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </span>
                )}
                <ChevronsUpDown size={14} className="text-muted-foreground" />
              </div>
            </Button>

            {open && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-md overflow-hidden">
                <div className="p-2 border-b border-border">
                  <Input
                    autoFocus
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-7 text-sm"
                  />
                </div>
                <ul className="max-h-52 overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <li className="text-muted-foreground text-sm px-3 py-2">{emptyMessage}</li>
                  ) : (
                    filtered.map((opt) => (
                      <li
                        key={opt.value}
                        onClick={() => {
                          field.onChange(opt.value);
                          setOpen(false);
                          setSearch("");
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer rounded-md mx-1",
                          "hover:bg-accent hover:text-accent-foreground",
                          field.value === opt.value && "bg-accent/60"
                        )}
                      >
                        <Check
                          size={14}
                          className={cn(
                            "shrink-0",
                            field.value === opt.value ? "opacity-100 text-primary" : "opacity-0"
                          )}
                        />
                        {opt.label}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
