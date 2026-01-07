import React from "react";
import { IconBrandGithub, IconMail } from "@tabler/icons-react";
import Link from "next/link";

export function Footer() {
	return (
		<footer className="w-full border-t border-dark-800 bg-dark-950 py-6 mt-auto">
			<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-8">
				<div className="flex flex-col items-center gap-1 md:items-start">
					<p className="text-sm font-medium text-gray-400">
						Usiné à Siber'ss par Modo 4! Me223
					</p>
					<p className="text-xs text-gray-500">Licence MIT</p>
				</div>

				<div className="flex items-center gap-4">
					<Link
						href="https://github.com/LouisChabanon/Gadzby"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-2 rounded-full border border-dark-800 bg-dark-900 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-primary-700/50 hover:text-primary-400"
					>
						<IconBrandGithub size={16} />
						<span>GitHub</span>
					</Link>
					<Link
						href="mailto:louis.chabanon@gadz.org"
						className="flex items-center gap-2 rounded-full border border-dark-800 bg-dark-900 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-primary-700/50 hover:text-primary-400"
					>
						<IconMail size={16} />
						<span>Contact</span>
					</Link>
				</div>
			</div>
		</footer>
	);
}
