import * as React from "react"

import { cn } from "~/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // Add special styling for numeric inputs to make them more mobile-friendly
    const isNumeric = type === 'number';
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-purple-900/50 bg-gray-900/80 backdrop-blur-sm px-3 py-2 text-base text-white ring-offset-gray-900 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-neutral-50 placeholder:text-purple-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-inner shadow-purple-900/10",
          // Add enhanced styling for numeric inputs
          isNumeric && "text-center font-medium text-lg md:text-xl",
          className
        )}
        ref={ref}
        inputMode={isNumeric ? "decimal" : undefined} // Better numeric keyboard on mobile
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
