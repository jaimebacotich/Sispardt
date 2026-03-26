"use client";

import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>;
  className?: string;
  render: (props: {
    field: Parameters<
      Parameters<typeof Controller<TFieldValues, FieldPath<TFieldValues>>>[0]["render"]
    >[0]["field"];
    fieldState: { error?: { message?: string }; invalid: boolean };
  }) => React.ReactNode;
}

export function FormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  rules,
  className,
  render,
}: FormFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <div className={cn("flex flex-col gap-1.5", className)}>
          {label && (
            <Label
              htmlFor={String(name)}
              className={cn(fieldState.error && "text-destructive")}
            >
              {label}
              {required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
          )}
          {render({ field, fieldState: { error: fieldState.error, invalid: fieldState.invalid } })}
          {fieldState.error?.message ? (
            <p className="text-xs text-destructive">{fieldState.error.message}</p>
          ) : description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}
    />
  );
}
