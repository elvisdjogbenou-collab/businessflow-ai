import { describe, expect, it } from "vitest";
import { isProtectedApplicationPath } from "./auth-access";

describe("private application route protection", () => {
  it("protects the app namespace and dashboard routes", () => {
    expect(isProtectedApplicationPath("/app")).toBe(true);
    expect(isProtectedApplicationPath("/app/dashboard")).toBe(true);
    expect(isProtectedApplicationPath("/app/customers")).toBe(true);
  });

  it("does not protect public authentication routes", () => {
    expect(isProtectedApplicationPath("/")).toBe(false);
    expect(isProtectedApplicationPath("/login")).toBe(false);
    expect(isProtectedApplicationPath("/signup")).toBe(false);
  });
});
