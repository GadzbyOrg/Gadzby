import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
       default: "bg-primary-600 text-gray-50 hover:bg-primary-600/90 dark:bg-primary-600 dark:text-gray-50 dark:hover:bg-primary-600/90",
       destructive: "bg-red-500 text-gray-50 hover:bg-red-500/90 dark:bg-red-900 dark:text-gray-50 dark:hover:bg-red-900/90",
       outline: "border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900 dark:border-dark-800 dark:bg-dark-950 dark:hover:bg-dark-800 dark:hover:text-gray-50",
       secondary: "bg-gray-100 text-gray-900 hover:bg-gray-100/80 dark:bg-dark-800 dark:text-gray-50 dark:hover:bg-dark-800/80",
       ghost: "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-dark-800 dark:hover:text-gray-50",
       link: "text-gray-900 underline-offset-4 hover:underline dark:text-gray-50",
    }
    
    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
    }

    const Comp = "button"
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-dark-950",
          variants[variant],
          sizes[size],
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
