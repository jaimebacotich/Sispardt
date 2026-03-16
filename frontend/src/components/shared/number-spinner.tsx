"use client";

import { type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FormField } from "./form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface NumberSpinnerProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function NumberSpinner<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  min = 0,
  max = 999,
  step = 1,
  description,
  required,
  disabled,
  className,
}: NumberSpinnerProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
      render={({ field, fieldState }) => {
        const value = Number(field.value ?? min);
        const decrement = () => field.onChange(Math.max(min, value - step));
        const increment = () => field.onChange(Math.min(max, value + step));

        return (
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-r-none h-8 w-8 shrink-0"
              onClick={decrement}
              disabled={disabled || value <= min}
              aria-label="Decrementar"
            >
              <Minus size={14} />
            </Button>
            <Input
              id={String(name)}
              type="number"
              value={value}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!isNaN(v)) field.onChange(Math.min(max, Math.max(min, v)));
              }}
              min={min}
              max={max}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              className="rounded-none text-center w-16 h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-l-none h-8 w-8 shrink-0"
              onClick={increment}
              disabled={disabled || value >= max}
              aria-label="Incrementar"
            >
              <Plus size={14} />
            </Button>
          </div>
        );
      }}
    />
  );
}
