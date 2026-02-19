"use client";

import { useEffect } from "react";

export function ServiceWorkerUnregister() {
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				for (const registration of registrations) {
					registration.unregister();
				}
			});
		}
	}, []);

	return null;
}
