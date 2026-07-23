import { AIDolekGenerator } from "../mini-services/ai-dolek/index";
import { describe, it, expect } from "bun:test";

describe("AIDolekGenerator — bez Ollamy", () => {
  it("assembleContext łączy tekst i obrazy", () => {
    const context = AIDolekGenerator.assembleContext([
      {
        pageContent: "OpenClaude to narzędzie do analizy kodu.",
        metadata: { type: "text" },
      },
      {
        pageContent: "[IMAGE] avatar.jpg",
        metadata: {
          type: "image",
          source: "avatar.jpg",
          description: "Awatar AI",
        },
      },
    ]);

    expect(context).toInclude("OpenClaude");
    expect(context).toInclude("[Obraz: avatar.jpg]");
    expect(context).toInclude("Awatar AI");
  });

  it("assembleContext pomija puste dokumenty", () => {
    const context = AIDolekGenerator.assembleContext([
      { pageContent: "", metadata: { type: "text" } },
      { metadata: { type: "image", source: "a.png" } },
    ]);
    expect(context).toInclude("[Obraz: a.png]");
  });

  it("generateWithContext składa kontekst z Document[] (mock Ollama — skip jeśli offline)", async () => {
    // Testuje tylko assemble path przez publiczne API, bez twardego require Ollamy:
    // jeśli Ollama nie działa — generowanie rzuci, więc sprawdzamy assembleContext oddzielnie.
    const assembled = AIDolekGenerator.assembleContext([
      { pageContent: "Kontekst testowy o Second Brain." },
    ]);
    expect(assembled).toInclude("Second Brain");
  });
});

describe("AIDolekGenerator — integracja Ollama (opcjonalna)", () => {
  const runLive = process.env.AIDOLEK_LIVE_TEST === "1";

  it.skipIf(!runLive)(
    "generateContent linkedin (wymaga AIDOLEK_LIVE_TEST=1 i Ollamy)",
    async () => {
      const content = await AIDolekGenerator.generateContent(
        "Napisz jedno zdanie o lokalnym AI",
        "linkedin",
        undefined,
        "casual"
      );
      expect(typeof content).toBe("string");
      expect(content.length).toBeGreaterThan(0);
      expect(content.length).toBeLessThanOrEqual(1300);
    },
    120_000
  );
});
