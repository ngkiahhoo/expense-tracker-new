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
  ...props
}: InputProps) {
  return (
    <input
      {...props}
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

