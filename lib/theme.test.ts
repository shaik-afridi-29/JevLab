import { describe, it, expect } from "vitest";
import { resolveTheme, type StoredTheme } from "./theme";

describe("resolveTheme", () => {
  it("explicit preference always wins over system", () => {
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
  });
  it("falls back to the OS setting when nothing is stored", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });
  it("treats garbage as unset", () => {
    expect(resolveTheme("midnight" as StoredTheme, true)).toBe("dark");
    expect(resolveTheme(undefined as unknown as StoredTheme, false)).toBe("light");
  });
});
