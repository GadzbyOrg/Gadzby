"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// Minimal Toast Implementation
type ToastProps = {
	title?: string;
	description?: string;
	variant?: "default" | "destructive" | "success";
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
			<div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] sm:pt-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none">
				{toasts.map((t) => (
					<div
						key={t.id}
						className={cn(
							"group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border shadow-lg transition-all",
							// Padding adjustments for mobile readability
							"p-4 sm:p-6 sm:pr-8",
							// Animation properties
							"animate-in fade-in-0 sm:slide-in-from-bottom-full slide-in-from-top-full duration-300",
							t.variant === "destructive" || t.title?.toLowerCase().includes("erreur")
								? "destructive group border-red-900 bg-red-900 text-red-50"
								: t.variant === "success" || t.title?.toLowerCase().includes("succès")
								? "success group border-green-900 bg-green-900 text-green-50"
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
