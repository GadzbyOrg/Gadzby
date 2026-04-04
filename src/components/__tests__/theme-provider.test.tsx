import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { ThemeProvider } from "../theme-provider";

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("applies theme from localStorage on mount", () => {
    localStorage.setItem("gadzby-theme", "ocean");
    render(<ThemeProvider />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");
  });

  it("does nothing when localStorage has no theme set", () => {
    render(<ThemeProvider />);
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });
});
