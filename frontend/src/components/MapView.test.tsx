import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Place } from "../types";
import { MapView } from "./MapView";

function place(overrides: Partial<Place> & Pick<Place, "id" | "name">): Place {
  return {
    city: "nyc",
    category: "sightseeing-culture",
    tier: "static",
    source: "seed",
    lastVerifiedAt: new Date().toISOString(),
    confidence: 90,
    band: "verified",
    daysSince: 1,
    recentConfirmations: 0,
    ...overrides,
  };
}

describe("MapView", () => {
  it("labels the region with only the count of places that actually have coordinates", () => {
    const places = [
      place({ id: "p1", name: "Has coords", lat: 40.75, lng: -73.98 }),
      place({ id: "p2", name: "No coords" }), // lat/lng both undefined -- never plotted, never counted
    ];

    render(<MapView places={places} />);

    expect(screen.getByRole("region", { name: "Map showing 1 places" })).toBeInTheDocument();
  });

  it("plots a real marker for every place with coordinates", async () => {
    const places = [
      place({ id: "p1", name: "The Met", lat: 40.7794, lng: -73.9632 }),
      place({ id: "p2", name: "Central Park", lat: 40.7829, lng: -73.9654 }),
    ];

    const { container } = render(<MapView places={places} />);

    await waitFor(() => {
      expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2);
    });
  });

  it("renders with zero markers rather than throwing when nothing has coordinates yet", () => {
    render(<MapView places={[place({ id: "p1", name: "No coords" })]} />);

    expect(screen.getByRole("region", { name: "Map showing 0 places" })).toBeInTheDocument();
  });
});
