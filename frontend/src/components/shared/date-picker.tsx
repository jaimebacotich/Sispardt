"use client";

import { type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FormField } from "./form-field";
import { Input } from "@/components/ui/input";

interface DatePickerProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  withTime?: boolean;
  min?: string;
  max?: string;
  className?: string;
}

export function DatePicker<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  withTime = false,
  min,
  max,
  className,
}: DatePickerProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
      render={({ field, fieldState }) => (
        <Input
          id={String(name)}
          type={withTime ? "datetime-local" : "date"}
          value={field.value ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={disabled}
          aria-invalid={fieldState.invalid}
          min={min}
          max={max}
          className="w-full"
        />
      )}
    />
  );
}
