import { cn } from "@/lib/utils";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import React from "react";

// Sanitizer sederhana biar input gak bisa masukin script/link jahat
function sanitizeText(text = "") {
    return text
        .replace(/<[^>]+>/g, "") // hapus tag HTML
        .replace(/https?:\/\/\S+/g, "[link diblokir]") // blokir link
        .slice(0, 200); // batasi panjang
}

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
        ref={ref}
        className={cn(
            `
      fixed inset-x-0 top-4 z-[100] 
      flex flex-col gap-3 px-4 
      w-full max-w-full
      sm:bottom-4 sm:right-4 sm:top-auto sm:max-w-[420px]
    `,
            className
        )}
        {...props}
    />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
    `
    group relative pointer-events-auto flex w-full items-start justify-between
    overflow-hidden rounded-2xl border shadow-xl
    p-4 pr-10 backdrop-blur-2xl bg-card/60
    transition-all duration-350
    data-[state=open]:animate-in data-[state=closed]:animate-out
    data-[state=open]:fade-in-80 data-[state=closed]:fade-out-80
    data-[state=open]:slide-in-from-top-full sm:data-[state=open]:slide-in-from-bottom-full
    data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95
    data-[state=closed]:slide-out-to-right-full
    data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
    data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]
  `,
    {
        variants: {
            variant: {
                default: `
          bg-card/60 text-foreground border-primary/30
          hover:border-accent/70 focus:ring-2 focus:ring-accent
        `,
                success: `
          border-secondary/50 bg-secondary/20 text-secondary-foreground
          hover:border-secondary focus:ring-2 focus:ring-secondary
        `,
                destructive: `
          border-destructive/50 bg-destructive/20 text-destructive-foreground
          hover:border-destructive focus:ring-2 focus:ring-destructive
        `,
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

const Toast = React.forwardRef(({ className, variant, children, ...props }, ref) => (
    <ToastPrimitives.Root
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
    >
        {children}
    </ToastPrimitives.Root>
));
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
    <ToastPrimitives.Action
        ref={ref}
        className={cn(
            `
        inline-flex h-8 shrink-0 items-center justify-center
        rounded-full border border-border/40 bg-transparent
        px-3 text-xs font-medium transition-colors duration-300
        hover:bg-accent hover:text-accent-foreground
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        group-[.destructive]:border-destructive/40
        group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground
      `,
            className
        )}
        {...props}
    />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className={cn(
            `
        absolute right-2 top-2 rounded-full p-1
        text-foreground/60 opacity-0 transition-opacity duration-300
        hover:text-accent focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent
        group-hover:opacity-100
        group-[.destructive]:text-destructive-foreground/70
        group-[.destructive]:hover:text-destructive-foreground
      `,
            className
        )}
        toast-close=""
        {...props}
    >
        <X className="h-4 w-4" />
    </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef(({ className, children, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className={cn("text-sm font-semibold tracking-tight", className)}
        {...props}
    >
        {sanitizeText(children)}
    </ToastPrimitives.Title>
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef(({ className, children, ...props }, ref) => (
    <ToastPrimitives.Description
        ref={ref}
        className={cn("text-xs text-muted-foreground mt-1 leading-snug", className)}
        {...props}
    >
        {sanitizeText(children)}
    </ToastPrimitives.Description>
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
    Toast,
    ToastAction,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
};
