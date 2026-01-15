import { IconBrandGithub, IconCode, IconMail, IconPalette } from "@tabler/icons-react";
import Link from "next/link";
import React from "react";

export function Footer() {
	return (
		<footer className="w-full border-t border-dark-800 bg-dark-950 py-6 mt-auto">
			<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-8">
				<div className="flex flex-col items-center gap-3 md:items-start">
					<div className="flex flex-col gap-1.5 md:items-start">
						<div className="group flex items-center gap-2 cursor-default">
							<IconCode
								size={16}
								className="text-gray-600 transition-colors group-hover:text-primary-400"
							/>
							<p className="text-sm font-medium text-gray-400 transition-colors group-hover:text-gray-300">
								Usiné à Siber&apos;ss par{" "}
								<span className="text-gray-300 transition-colors group-hover:text-white">
									Modo 4! Me223
								</span>
							</p>
						</div>
						<div className="group flex items-center gap-2 cursor-default">
							<IconPalette
								size={16}
								className="text-gray-600 transition-colors group-hover:text-purple-400"
							/>
							<p className="text-sm font-medium text-gray-400 transition-colors group-hover:text-gray-300">
								Logo par{" "}
								<span className="text-gray-300 transition-colors group-hover:text-white">
									Kefta 159-97 Me223
								</span>
							</p>
						</div>
					</div>
					<p className="ml-0.5 text-xs font-mono text-gray-600">Licence MIT</p>
				</div>

				<div className="flex items-center gap-4">
					<Link
						href="https://github.com/GadzbyOrg/Gadzby"
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
