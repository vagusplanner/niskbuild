import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#1D6FB8] text-white shadow hover:bg-[#2980B9]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-[#4A6E8A] bg-transparent text-[#0D1A2A] dark:text-[#D4E0EC] shadow-sm hover:bg-[#D4E0EC] dark:hover:bg-[#1B2A4A]",
        secondary:
          "bg-[#D4E0EC] text-[#0D1A2A] shadow-sm hover:bg-[#C0CDD9]",
        ghost: "hover:bg-[#D4E0EC]/50 hover:text-[#0D1A2A] dark:hover:bg-[#1B2A4A] dark:hover:text-[#D4E0EC]",
        link: "text-[#1D6FB8] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }