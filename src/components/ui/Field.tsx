import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn, fieldStyles } from "./styles";

type FieldSize = keyof typeof fieldStyles.sizes;

interface SharedFieldProps {
  fieldSize?: FieldSize;
}

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    SharedFieldProps {}

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    SharedFieldProps {}

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    SharedFieldProps {}

export function Input({
  className = "",
  fieldSize = "lg",
  onFocus,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      onFocus={(event) => {
        // New numeric records commonly start at zero. Select that placeholder
        // so typing an amount replaces it instead of producing values like 0500.
        if (props.type === "number" && Number(event.currentTarget.value) === 0) {
          event.currentTarget.select();
        }
        onFocus?.(event);
      }}
      className={cn(
        fieldStyles.base,
        fieldStyles.sizes[fieldSize],
        className
      )}
    />
  );
}

export function Select({
  className = "",
  fieldSize = "lg",
  ...props
}: SelectProps) {
  return (
    <select
      {...props}
      className={cn(
        fieldStyles.base,
        fieldStyles.sizes[fieldSize],
        className
      )}
    />
  );
}

export function Textarea({
  className = "",
  fieldSize = "lg",
  ...props
}: TextareaProps) {
  return (
    <textarea
      {...props}
      className={cn(
        fieldStyles.base,
        fieldStyles.sizes[fieldSize],
        fieldStyles.textarea,
        className
      )}
    />
  );
}
