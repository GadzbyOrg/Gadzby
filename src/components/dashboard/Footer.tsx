import { IconBrandGithub, IconBug, IconCode, IconMail, IconPalette } from "@tabler/icons-react";
import Link from "next/link";
import React from "react";
import packageJson from "../../../package.json";

export function Footer() {
	return (
		<footer className="w-full border-t border-border bg-surface-950 py-6 mt-auto">
			<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-8">
				<div className="flex flex-col items-center gap-3 md:items-start">
					<div className="flex flex-col gap-1.5 md:items-start">
						<div className="group flex items-center gap-2 cursor-default">
							<IconCode
								size={16}
								className="text-fg-subtle transition-colors group-hover:text-accent-400"
							/>
							<p className="text-sm font-medium text-fg-muted transition-colors group-hover:text-fg">
								Usiné à Siber&apos;ss par{" "}
								<span className="text-fg transition-colors group-hover:text-fg">
									Modo 4! Me223
								</span>
							</p>
						</div>
						<div className="group flex items-center gap-2 cursor-default">
							<IconPalette
								size={16}
								className="text-fg-subtle transition-colors group-hover:text-purple-400"
							/>
							<p className="text-sm font-medium text-fg-muted transition-colors group-hover:text-fg">
								Logo par{" "}
								<span className="text-fg transition-colors group-hover:text-fg">
									Kefta 159-97 Me223
								</span>
							</p>
						</div>
					</div>
					<p className="ml-0.5 text-xs font-mono text-fg-subtle">
						Licence MIT • v{packageJson.version}
					</p>
				</div>

				<div className="flex items-center gap-4">
					<Link
						href="https://github.com/GadzbyOrg/Gadzby"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-2 rounded-full border border-border bg-surface-900 px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-accent-700/50 hover:text-accent-400"
					>
						<IconBrandGithub size={16} />
						<span>GitHub</span>
					</Link>
					<Link
						href="mailto:louis.chabanon@gadz.org"
						className="flex items-center gap-2 rounded-full border border-border bg-surface-900 px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-accent-700/50 hover:text-accent-400"
					>
						<IconMail size={16} />
						<span>Contact</span>
					</Link>
					<Link
						href="https://forms.gle/ngwX9tdf2aaa2quw5"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-2 rounded-full border border-border bg-surface-900 px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-accent-700/50 hover:text-accent-400"
					>
						<IconBug size={16} />
						<span>Signaler un bug</span>
					</Link>
				</div>
			</div>
		</footer>
	);
}
