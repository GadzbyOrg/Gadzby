export const TABAGNSS_MAP = {
	ME: "Siber'ss",
	CH: "Chalon'ss",
	AN: "Birse",
	BO: "Boquette",
	KA: "KIN",
	CL: "Clun'ss",
	PA: "P3",
	LI: "Lille", 
} as const;

export const TABAGNSS_OPTIONS = Object.entries(TABAGNSS_MAP).map(([code, label]) => ({
	code,
	label,
}));

export const getTabagnssCode = (value: string): string | null => {
	// Direct match (code)
	if (value in TABAGNSS_MAP) return value;
	
	// Reverse match (label)
	const entry = Object.entries(TABAGNSS_MAP).find(([code, label]) => 
		label.toLowerCase() === value.toLowerCase()
	);
	if (entry) return entry[0];

	// Handle other common variations if needed
	const lower = value.toLowerCase();
	if (lower.includes("metz")) return "ME";
	if (lower.includes("chalon")) return "CH";
	if (lower.includes("angers") || lower.includes("anjou")) return "AN";
	if (lower.includes("bordeaux")) return "BO";
	if (lower.includes("aix")) return "KA";
	if (lower.includes("cluny")) return "CL";
	if (lower.includes("paris")) return "PA";
	if (lower.includes("lille")) return "LI";

	return null;
}
