import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        allow: "border-success/40 bg-success/10 text-success",
        warn: "border-warning/40 bg-warning/10 text-warning",
        block: "border-destructive/40 bg-destructive/10 text-destructive",
        pending: "border-primary/40 bg-primary/10 text-primary",
        demo: "border-warning/30 bg-warning/5 text-warning font-mono uppercase tracking-wider text-[10px]",
        local:
          "border-primary/30 bg-primary/5 text-primary-glow font-mono uppercase tracking-wider text-[10px]",
        live: "border-success/30 bg-success/5 text-success font-mono uppercase tracking-wider text-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
