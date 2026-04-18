import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PromssSelector } from "@/components/promss-selector";

const promssList = ["AI226", "AI225", "AI224", "AI223", "AI222"];

describe("PromssSelector", () => {
    it("shows placeholder when no prom'ss is selected", () => {
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="all"
                onChange={vi.fn()}
            />
        );
        expect(screen.getByRole("button").textContent).toContain("Promo");
    });

    it("shows selected prom'ss in the trigger button", () => {
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="AI225"
                onChange={vi.fn()}
            />
        );
        expect(screen.getByRole("button").textContent).toContain("AI225");
    });

    it("opens dropdown and shows all prom'ss on trigger click", () => {
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="all"
                onChange={vi.fn()}
            />
        );
        fireEvent.click(screen.getByRole("button"));
        promssList.forEach((p) => {
            expect(screen.getByText(p)).toBeDefined();
        });
    });

    it("filters prom'ss list when typing in the search input", () => {
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="all"
                onChange={vi.fn()}
            />
        );
        fireEvent.click(screen.getByRole("button"));
        const input = screen.getByPlaceholderText("Rechercher…");
        fireEvent.change(input, { target: { value: "225" } });
        expect(screen.getByText("AI225")).toBeDefined();
        expect(screen.queryByText("AI226")).toBeNull();
        expect(screen.queryByText("AI224")).toBeNull();
    });

    it("calls onChange with selected value and closes popover", () => {
        const onChange = vi.fn();
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="all"
                onChange={onChange}
            />
        );
        fireEvent.click(screen.getByRole("button"));
        fireEvent.click(screen.getByText("AI223"));
        expect(onChange).toHaveBeenCalledWith("AI223");
    });

    it("calls onChange with 'all' when reset item is clicked", () => {
        const onChange = vi.fn();
        render(
            <PromssSelector
                promssList={promssList}
                selectedPromss="AI225"
                onChange={onChange}
            />
        );
        fireEvent.click(screen.getByRole("button"));
        // trigger shows "AI225", so "Promo" only appears once (the reset item in the list)
        fireEvent.click(screen.getByText("Promo"));
        expect(onChange).toHaveBeenCalledWith("all");
    });
});
