import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";

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

describe("DateRangePicker", () => {
	it("renders placeholder when no value", () => {
		render(<DateRangePicker placeholder="Choisir une période" />);
		expect(screen.getByText("Choisir une période")).toBeDefined();
	});

	it("renders formatted range when both values provided", () => {
		render(
			<DateRangePicker
				startValue="2026-04-01"
				endValue="2026-04-30"
			/>,
		);
		expect(screen.getByText("01/04/2026 → 30/04/2026")).toBeDefined();
	});

	it("renders hidden inputs when names provided", () => {
		const { container } = render(
			<DateRangePicker
				startName="startDate"
				endName="endDate"
				startValue="2026-04-01"
				endValue="2026-04-30"
			/>,
		);
		const hiddens = container.querySelectorAll('input[type="hidden"]');
		expect(hiddens).toHaveLength(2);
		expect((hiddens[0] as HTMLInputElement).name).toBe("startDate");
		expect((hiddens[1] as HTMLInputElement).name).toBe("endDate");
	});
});
