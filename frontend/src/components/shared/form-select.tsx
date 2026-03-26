"use client";

import { type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FormField } from "./form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FormSelect<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Seleccionar...",
  options,
  description,
  required,
  disabled,
  className,
}: FormSelectProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
      render={({ field, fieldState }) => {
        const selectedLabel = options.find((o) => o.value === (field.value ?? ""))?.label;
        return (
          <Select
            value={field.value ?? ""}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={String(name)}
              aria-invalid={fieldState.invalid}
              className="w-full"
            >
              <SelectValue placeholder={placeholder} label={selectedLabel} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }}
    />
  );
}
