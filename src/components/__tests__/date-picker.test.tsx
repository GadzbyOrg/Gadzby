import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DatePicker } from "@/components/ui/date-picker";

describe("DatePicker", () => {
	it("renders placeholder when no value", () => {
		render(<DatePicker name="date" placeholder="Choisir une date" />);
		expect(screen.getByText("Choisir une date")).toBeDefined();
	});

	it("renders formatted date when value provided", () => {
		render(<DatePicker name="date" value="2026-04-06" />);
		expect(screen.getByText("06/04/2026")).toBeDefined();
	});

	it("renders hidden input with correct name", () => {
		const { container } = render(<DatePicker name="myDate" value="2026-04-06" />);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden).toBeDefined();
		expect(hidden.name).toBe("myDate");
		expect(hidden.value).toBe("2026-04-06");
	});
});
