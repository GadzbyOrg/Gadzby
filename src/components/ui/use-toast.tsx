"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// Minimal Toast Implementation
type ToastProps = {
	title?: string;
	description?: string;
	variant?: "default" | "destructive";
};

type ToastContextType = {
	toast: (props: ToastProps) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(
	undefined
);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
	const [toasts, setToasts] = React.useState<(ToastProps & { id: number })[]>(
		[]
	);

	const toast = React.useCallback((props: ToastProps) => {
		const id = Date.now();
		setToasts((prev) => [...prev, { ...props, id }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 3000);
	}, []);

	return (
		<ToastContext.Provider value={{ toast }}>
			{children}
			<div className="fixed bottom-0 right-0 z-100 flex flex-col gap-2 p-4 max-w-105 w-full">
				{toasts.map((t) => (
					<div
						key={t.id}
						className={cn(
							"group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
							t.variant === "destructive"
								? "destructive group border-red-900 bg-red-900 text-red-50"
								: "border-gray-800 bg-dark-900 text-gray-100"
						)}
					>
						<div className="grid gap-1">
							{t.title && (
								<div className="text-sm font-semibold">{t.title}</div>
							)}
							{t.description && (
								<div className="text-sm opacity-90">{t.description}</div>
							)}
						</div>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
};

export function useToast() {
	const context = React.useContext(ToastContext);
	// If used outside provider (e.g. while debugging), return dummy
	if (!context) {
		return { toast: (props: any) => console.log("Toast:", props) };
	}
	return context;
}
