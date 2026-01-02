import "@mantine/core/styles.css";
import React from "react";
import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
	title: "Projet Gadzby",
	description: "Borgia 2.0",
	manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
	themeColor: "#000000",
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
