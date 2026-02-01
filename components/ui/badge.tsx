import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border-0 px-2 py-1 text-xs font-bold tracking-wide w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden uppercase",
  {
    variants: {
      variant: {
        default: "bg-[#0EA5E9] text-white",
        secondary:
          "bg-[#0F172A] text-white",
        destructive:
          "bg-[#EF4444] text-white",
        outline:
          "border-[2px] border-[#0F172A] text-[#0F172A] bg-white",
        success:
          "bg-[#10B981] text-white",
        warning:
          "bg-[#F59E0B] text-white",
        ghost: "bg-[#F1F5F9] text-[#0F172A]",
        link: "text-[#0EA5E9] underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
