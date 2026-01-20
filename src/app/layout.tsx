import "@mantine/core/styles.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import React from "react";

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
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="fr">
			<body>{children}</body>
		</html>
	);
}
