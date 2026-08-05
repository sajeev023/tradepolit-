"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  function FormInput({ error, icon, rightElement, className, ...props }, ref) {
    const [isFocused, setIsFocused] = useState(false);

    const borderColor = error
      ? "var(--color-loss)"
      : isFocused
        ? "var(--color-accent-primary)"
        : "var(--color-border-default)";

    const boxShadow = isFocused
      ? "0 0 0 2px rgba(30, 212, 168, 0.16)"
      : "none";

    return (
      <div className="relative">
        {icon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`w-full h-11 rounded-lg text-sm transition-all duration-150 outline-none ${
            icon ? "pl-10" : "pl-3"
          } ${rightElement ? "pr-12" : "pr-3"} ${className ?? ""}`}
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            color: "var(--color-text-primary)",
            border: `1px solid ${borderColor}`,
            boxShadow,
          }}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
            {rightElement}
          </span>
        )}
      </div>
    );
  }
);
