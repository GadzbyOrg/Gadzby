export const TABAGNSS_MAP = {
	ME: "Siber'ss",
	CH: "Chalon'ss",
	AN: "Boquette",
	BO: "Bordel'ss",
	AI: "KIN",
	CL: "Clun'ss",
	PA: "P3",
	LI: "Birse", 
	KA: "kanak",
} as const;

export const TABAGNSS_OPTIONS = Object.entries(TABAGNSS_MAP).map(([code, label]) => ({
	code,
	label,
}));

export const getTabagnssCode = (value: string): string | null => {
	// Direct match (code)
	if (value in TABAGNSS_MAP) return value;
	
	// Reverse match (label)
	const entry = Object.entries(TABAGNSS_MAP).find(([, label]) => 
		label.toLowerCase() === value.toLowerCase()
	);
	if (entry) return entry[0];

	// Handle other common variations if needed
	// Not perfect but should work for most cases
	const lower = value.toLowerCase();
	if (lower.includes("metz")) return "ME";
	if (lower.includes("chalon")) return "CH";
	if (lower.includes("angers")) return "AN";
	if (lower.includes("bordeaux")) return "BO";
	if (lower.includes("aix")) return "AI";
	if (lower.includes("cluny")) return "CL";
	if (lower.includes("paris")) return "PA";
	if (lower.includes("lille")) return "LI";
	if (lower.includes("karlsruhe")) return "KA";

	return null;
}
