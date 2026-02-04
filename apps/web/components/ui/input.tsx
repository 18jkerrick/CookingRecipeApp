import * as React from "react"
import { cn } from "@acme/core/utils/general"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md px-4 py-2",
          "bg-wk-bg-surface border border-wk-border",
          "text-wk-text-primary font-body text-sm",
          "placeholder:text-wk-text-muted",
          "transition-all duration-200",
          // Focus states
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-wk-accent focus-visible:ring-offset-0",
          "focus-visible:border-wk-accent",
          // File input styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }