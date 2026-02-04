import * as React from "react"
import { cn } from "@acme/core/utils/general"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium font-body",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wk-accent focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:translate-y-[1px]",
          // Variant styles
          {
            'default': "bg-wk-accent text-white hover:bg-wk-accent-hover hover:-translate-y-[1px]",
            'destructive': "bg-wk-error text-white hover:opacity-90",
            'outline': "border border-wk-border bg-transparent hover:bg-wk-bg-surface-hover text-wk-text-primary",
            'secondary': "bg-transparent border border-wk-accent text-wk-accent hover:bg-wk-accent-muted",
            'ghost': "text-wk-text-secondary hover:text-wk-text-primary hover:bg-wk-bg-surface-hover",
            'link': "text-wk-accent underline-offset-4 hover:underline",
          }[variant],
          // Size styles
          {
            'default': "h-10 px-4 py-2",
            'sm': "h-9 rounded-md px-3",
            'lg': "h-11 rounded-md px-8",
            'icon': "h-10 w-10",
          }[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }