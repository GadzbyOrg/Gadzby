import "./globals.css";

import type { Metadata, Viewport } from "next";
import React from "react";

import { ServiceWorkerUnregister } from "@/components/ServiceWorkerUnregister";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
	title: "Gadzby",
	description: "Borgia 2.0",
	manifest: "/manifest.webmanifest",
	icons: {
		icon: "/icons/web-app-manifest-192x192.png",
		apple: "/apple-touch-icon.png",
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Gadzby",
	},
};

export const viewport: Viewport = {
	themeColor: "#0f172a",
	viewportFit: "cover",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="fr" data-mode="dark">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,400;1,600;1,700&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body>
				<ThemeProvider />
				<ServiceWorkerUnregister />
				{children}
			</body>
		</html>
	);
}
