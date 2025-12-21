import "@mantine/core/styles.css";
import React from "react";
import "./globals.css";

export const metadata = {
	title: "Projet Tyrion",
	description: "Borgia 2.0",
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
