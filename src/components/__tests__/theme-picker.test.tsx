import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { ThemePicker } from "../theme-picker";

describe("ThemePicker", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders all 6 theme buttons", () => {
    render(<ThemePicker />);
    // toBeInTheDocument() requires jest-dom setup
    expect(screen.getByText("Ambre")).toBeTruthy();
    expect(screen.getByText("Ocean")).toBeTruthy();
    expect(screen.getByText("Forest")).toBeTruthy();
    expect(screen.getByText("Sunset")).toBeTruthy();
    expect(screen.getByText("Galaxy")).toBeTruthy();
    expect(screen.getByText("Rose")).toBeTruthy();
  });

  it("saves key to localStorage and sets data-theme on click", () => {
    render(<ThemePicker />);
    fireEvent.click(screen.getByRole("button", { name: /ocean/i }));
    expect(localStorage.getItem("gadzby-theme")).toBe("ocean");
    expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");
  });

  it("removes localStorage key and data-theme when default (Ambre) is selected", () => {
    localStorage.setItem("gadzby-theme", "ocean");
    document.documentElement.setAttribute("data-theme", "ocean");
    render(<ThemePicker />);
    fireEvent.click(screen.getByRole("button", { name: /ambre/i }));
    expect(localStorage.getItem("gadzby-theme")).toBeNull();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
