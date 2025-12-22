"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { IconX } from "@tabler/icons-react";

// Simplified Modal Context
interface ModalContextType {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const ModalContext = React.createContext<ModalContextType | undefined>(undefined);

export function useModal() {
    const context = React.useContext(ModalContext);
    if (!context) {
        throw new Error("useModal must be used within a ModalRoot");
    }
    return context;
}

export const Dialog = ({ open, onOpenChange, children }: { open: boolean, onOpenChange: (o: boolean) => void, children: React.ReactNode }) => {
    return (
        <ModalContext.Provider value={{ open, setOpen: onOpenChange }}>
            {open && (
                <div className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" onClick={() => onOpenChange(false)} />
            )}
            {children}
        </ModalContext.Provider>
    );
};

export const DialogTrigger = ({ asChild, children }: { asChild?: boolean, children: React.ReactNode }) => {
    const { setOpen } = useModal();
    // Simplified: assuming asChild pattern handling or just wrapping
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement, {
             onClick: (e: React.MouseEvent) => {
                 (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e);
                 setOpen(true);
             }
        } as any);
    }
    return <button onClick={() => setOpen(true)}>{children}</button>;
};

export const DialogContent = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const { open, setOpen } = useModal();
    if (!open) return null;

    return (
        <div className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
            className
        )} onClick={(e) => e.stopPropagation()}>
            {children}
            <button 
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                onClick={() => setOpen(false)}
            >
                <IconX className="h-4 w-4 text-gray-400" />
                <span className="sr-only">Close</span>
            </button>
        </div>
    );
};

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-500 dark:text-gray-400", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"
