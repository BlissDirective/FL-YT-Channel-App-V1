import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/** One CTA system: amber = the single primary action of a view, ink =
    secondary, ghost = quiet, coral = destructive. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold shadow-card transition-all disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-ink hover:scale-[1.02] disabled:hover:scale-100",
        secondary: "bg-ink text-card hover:scale-[1.02] disabled:hover:scale-100",
        ghost: "border border-line bg-card text-ink hover:bg-accent-soft",
        destructive: "bg-coral text-white hover:bg-coral/90",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
