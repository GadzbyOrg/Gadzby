import type { Metadata } from "next";

import { type ChangeKind, CHANGELOG } from "@/features/changelog/data";
import { cn } from "@/lib/utils";

import packageJson from "../../../../package.json";

export const metadata: Metadata = { title: "Nouveautés" };

const KIND_STYLES: Record<ChangeKind, { label: string; className: string }> = {
	feature: { label: "Nouveau", className: "bg-accent-500/15 text-accent-600" },
	improvement: { label: "Amélioré", className: "bg-elevated text-fg" },
	fix: { label: "Corrigé", className: "bg-elevated text-fg-muted" },
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
	day: "numeric",
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});

export default function ChangelogPage() {
	return (
		<div className="mx-auto max-w-2xl px-4 py-8">
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-fg">Mises à Jours</h1>
				<p className="mt-2 text-fg-muted">
					Historique des mises à jour de Gadzby
				</p>
			</div>

			<ol className="relative border-l border-border ml-2">
				{CHANGELOG.map((release) => {
					const isCurrent = release.version === packageJson.version;
					return (
						<li key={release.version} className="relative pl-6 pb-10 last:pb-0">
							<span
								aria-hidden
								className={cn(
									"absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface-100",
									isCurrent ? "bg-accent-500" : "bg-border",
								)}
							/>
							<header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<h2 className="font-mono text-lg font-semibold text-fg">
									v{release.version}
								</h2>
								{release.title && (
									<span className="text-sm font-medium text-fg-muted">
										{release.title}
									</span>
								)}
								<time
									dateTime={release.date}
									className="text-xs text-fg-subtle"
								>
									{dateFormatter.format(new Date(release.date))}
								</time>
								{isCurrent && (
									<span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-600">
										Actuelle
									</span>
								)}
							</header>
							<ul className="mt-3 space-y-2">
								{release.changes.map((change) => {
									const kind = KIND_STYLES[change.kind];
									return (
										<li
											key={change.text}
											className="flex items-start gap-3 text-sm text-fg"
										>
											<span
												className={cn(
													"mt-0.5 w-20 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[11px] font-medium",
													kind.className,
												)}
											>
												{kind.label}
											</span>
											<span className="leading-relaxed">{change.text}</span>
										</li>
									);
								})}
							</ul>
						</li>
					);
				})}
			</ol>
		</div>
	);
}
