"use client";

import { IconBrandGithub, IconBrandWhatsapp, IconBug, IconCode, IconMail, IconPalette } from "@tabler/icons-react";
import Link from "next/link";
import Script from "next/script";
import React, { useState } from "react";
import packageJson from "../../../package.json";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function Footer() {
	const [contactOpen, setContactOpen] = useState(false);
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
					<p className="ml-0.5 text-xs font-mono text-gray-600">
						Licence MIT • v{packageJson.version}
					</p>
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
					<Dialog open={contactOpen} onOpenChange={setContactOpen}>
						<DialogTrigger asChild>
							<button className="flex items-center gap-2 rounded-full border border-dark-800 bg-dark-900 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-primary-700/50 hover:text-primary-400">
								<IconMail size={16} />
								<span>Contact</span>
							</button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Comment entrer en contact ?</DialogTitle>
								<DialogDescription>
									Choisissez votre méthode préférée pour nous joindre.
								</DialogDescription>
							</DialogHeader>
							<div className="flex flex-col gap-3 mt-4">
								<Link
									href="mailto:louis.chabanon@gmail.com"
									className="flex items-center gap-3 rounded-xl border border-dark-800 bg-dark-950 p-4 transition-colors hover:border-primary-500 hover:bg-dark-900 group"
								>
									<IconMail className="text-gray-400 group-hover:text-primary-500 transition-colors" size={24} />
									<div className="flex flex-col">
										<span className="font-semibold text-white">Email</span>
										<span className="text-sm text-gray-400">louis.chabanon@gmail.com</span>
									</div>
								</Link>
								<Link
									href="https://wa.me/33768646581"
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-3 rounded-xl border border-dark-800 bg-dark-950 p-4 transition-colors hover:border-green-500 hover:bg-dark-900 group"
								>
									<IconBrandWhatsapp className="text-gray-400 group-hover:text-green-500 transition-colors" size={24} />
									<div className="flex flex-col">
										<span className="font-semibold text-white">WhatsApp</span>
										<span className="text-sm text-gray-400">Envoyer un message WhatsApp</span>
									</div>
								</Link>
							</div>
						</DialogContent>
					</Dialog>
					<button
						data-tally-open="GxD49k"
						className="flex items-center gap-2 rounded-full border border-dark-800 bg-dark-900 !px-3 !py-1.5 !text-xs !font-medium text-gray-400 transition-colors hover:border-primary-700/50 hover:text-primary-400"
					>
						<IconBug size={16} />
						<span className="!text-xs !font-medium">Signaler un bug</span>
					</button>
				</div>
				<Script id="tally-iframe-resizer-config">
					{`window.iFrameResize = { warningTimeout: 0 };`}
				</Script>
				<Script src="https://tally.so/widgets/embed.js" />
			</div>
		</footer>
	);
}
