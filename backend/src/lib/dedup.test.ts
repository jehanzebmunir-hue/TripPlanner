import { describe, expect, it } from "vitest";
import { isLikelyDuplicate } from "./dedup";

describe("isLikelyDuplicate", () => {
  it("flags the real Brussels case: exact name match, ~1m apart", () => {
    const a = { name: "Manneken Pis", lat: 50.8449, lng: 4.3499 };
    const b = { name: "Manneken Pis", lat: 50.84491, lng: 4.34991 };

    expect(isLikelyDuplicate(a, b)).toBe(true);
  });

  it("does not flag two real, distinct nearby places", () => {
    const a = { name: "Eiffel Tower", lat: 48.8584, lng: 2.2945 };
    const b = { name: "Trocadéro Gardens", lat: 48.8616, lng: 2.2893 };

    expect(isLikelyDuplicate(a, b)).toBe(false);
  });

  it("does not flag a name match that's actually far apart", () => {
    const a = { name: "City Hall", lat: 40.7128, lng: -74.006 };
    const b = { name: "City Hall", lat: 41.8781, lng: -87.6298 };

    expect(isLikelyDuplicate(a, b)).toBe(false);
  });

  it("does not flag two close records whose names strip to empty (e.g. non-Latin scripts) rather than false-matching on emptiness", () => {
    const a = { name: "Areopagus Hill", lat: 37.9715, lng: 23.7257 };
    const b = { name: "θέα Ακρόπολης", lat: 37.9716, lng: 23.7257 };

    expect(isLikelyDuplicate(a, b)).toBe(false);
  });

  it("treats a substring match as a duplicate (e.g. a shortened or a fuller name for the same place)", () => {
    const a = { name: "The Metropolitan Museum of Art", lat: 40.7794, lng: -73.9632 };
    const b = { name: "Metropolitan Museum", lat: 40.77941, lng: -73.96321 };

    expect(isLikelyDuplicate(a, b)).toBe(true);
  });

  it("is false when either point is missing coordinates", () => {
    expect(isLikelyDuplicate({ name: "X", lat: null, lng: null }, { name: "X", lat: 1, lng: 1 })).toBe(false);
  });
});
