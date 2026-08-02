import { describe, expect, it } from "vitest";
import { en } from "./en";
import { es } from "./es";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flatten(obj: Record<string, any>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null ? flatten(value, path) : [path];
  });
}

describe("translation resources", () => {
  it("has an identical key set in every language, so a missing translation is a build-time failure, not a silent runtime fallback", () => {
    const enKeys = flatten(en).sort();
    const esKeys = flatten(es).sort();

    expect(esKeys).toEqual(enKeys);
  });

  it("has no empty translation values in either language", () => {
    for (const [lang, resource] of [
      ["en", en],
      ["es", es],
    ] as const) {
      for (const key of flatten(resource)) {
        const value = key.split(".").reduce((o: any, k) => o[k], resource); // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(value.trim(), `${lang}.${key} is empty`).not.toBe("");
      }
    }
  });
});
