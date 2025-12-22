import * as React from "react"

import { cn } from "@/lib/utils"

// Since class-variance-authority is missing, I will just use a simple switch or map.
// Wait, I don't want to install CVA. I'll write a simple version.

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

const badgeVariants = {
  default: "border-transparent bg-primary-600 text-white hover:bg-primary-700/80",
  secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-800/80",
  destructive: "border-transparent bg-red-500 text-gray-50 hover:bg-red-500/80 dark:bg-red-900 dark:text-gray-50 dark:hover:bg-red-900/80",
  outline: "text-gray-950 dark:text-gray-50",
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClass = badgeVariants[variant] || badgeVariants.default
  
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:border-gray-800 dark:focus:ring-gray-300",
        variantClass,
        className
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
