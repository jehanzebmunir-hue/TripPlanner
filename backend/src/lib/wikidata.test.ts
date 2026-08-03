import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithRetry = vi.fn();
vi.mock("./httpRetry", () => ({ fetchWithRetry: (...a: unknown[]) => fetchWithRetry(...a) }));

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("photoUrlForWikidataId", () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
  });

  it("queries Wikidata's real entity-data endpoint with a real, identifying User-Agent", async () => {
    fetchWithRetry.mockResolvedValue(response({ entities: { Q1996069: { claims: {} } } }));
    const { photoUrlForWikidataId } = await import("./wikidata");

    await photoUrlForWikidataId("Q1996069");

    const [url, init] = fetchWithRetry.mock.calls[0];
    expect(url).toBe("https://www.wikidata.org/wiki/Special:EntityData/Q1996069.json");
    expect(init.headers["User-Agent"]).toBeTruthy();
  });

  it("resolves a real P18 image claim to a Commons Special:FilePath URL", async () => {
    fetchWithRetry.mockResolvedValue(
      response({
        entities: {
          Q1996069: {
            claims: {
              P18: [{ mainsnak: { datavalue: { value: "Musée de l'Armée, Paris 4 May 2019.jpg" } } }],
            },
          },
        },
      })
    );
    const { photoUrlForWikidataId } = await import("./wikidata");

    const url = await photoUrlForWikidataId("Q1996069");

    expect(url).toBe(
      "https://commons.wikimedia.org/wiki/Special:FilePath/Mus%C3%A9e%20de%20l'Arm%C3%A9e%2C%20Paris%204%20May%202019.jpg?width=400"
    );
  });

  it("returns undefined rather than a fabricated URL when the entity has no P18 claim", async () => {
    fetchWithRetry.mockResolvedValue(response({ entities: { Q999: { claims: {} } } }));
    const { photoUrlForWikidataId } = await import("./wikidata");

    expect(await photoUrlForWikidataId("Q999")).toBeUndefined();
  });

  it("returns undefined rather than throwing when the request fails", async () => {
    fetchWithRetry.mockResolvedValue(new Response(null, { status: 500 }));
    const { photoUrlForWikidataId } = await import("./wikidata");

    expect(await photoUrlForWikidataId("Q1")).toBeUndefined();
  });
});
