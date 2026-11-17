import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./styles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  fullWidth?: boolean;
  // Shows a spinner and disables the button.
  loading?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", size = "md", iconOnly = false, fullWidth = false, loading = false, type = "button", className, disabled, children, ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonClass({ variant, size, iconOnly, fullWidth }), className)} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
      {children}
    </button>
  );
});

export default Button;
