import { AIDolekGenerator } from "@/mini-services/ai-dolek";
import { describe, it, expect, mock } from "bun:test";
import { VectorStore } from "@/lib/vectorStore";

// Mock VectorStore
mock.module("@/lib/vectorStore", () => ({
  VectorStore: {
    similaritySearch: mock(() =>
      Promise.resolve([
        { pageContent: "OpenClaude to zaawansowane narzędzie do analizy kodu." },
        { pageContent: "OpenClaude integruje się z Next.js i React." },
      ])
    ),
  },
}));

describe("AIDolekGenerator", () => {
  it("should generate content without context", async () => {
    const content = await AIDolekGenerator.generateContent(
      "Napisz krótki post o AI",
      "linkedin",
      undefined,
      "casual"
    );
    expect(content).toBeString();
    expect(content.length).toBeLessThan(1300);
  });

  it("should generate content with context", async () => {
    const content = await AIDolekGenerator.generateWithContext(
      "Napisz post o OpenClaude",
      "linkedin",
      "OpenClaude features"
    );
    expect(content).toInclude("OpenClaude");
    expect(content.length).toBeLessThan(1300);
  });

  it("should generate email with subject", async () => {
    const content = await AIDolekGenerator.generateContent(
      "Napisz email o nowej funkcji w naszym produkcie",
      "email",
      undefined,
      "formal"
    );
    expect(content).toInclude("Temat:");
  });

  it("should respect platform character limits", async () => {
    const longPrompt = "Napisz bardzo długi post na LinkedIn o wszystkich zaletach AI w programowaniu. " +
      "Wymień wszystkie możliwe zastosowania, technologie i przyszłe kierunki rozwoju.";

    const content = await AIDolekGenerator.generateContent(
      longPrompt,
      "linkedin"
    );
    expect(content.length).toBeLessThanOrEqual(1300);
  });

  it("should handle different tones", async () => {
    const prompt = "Napisz o zaletach TypeScript";

    const formalContent = await AIDolekGenerator.generateContent(
      prompt,
      "blog",
      undefined,
      "formal"
    );

    const casualContent = await AIDolekGenerator.generateContent(
      prompt,
      "blog",
      undefined,
      "casual"
    );

    expect(formalContent).not.toEqual(casualContent);
    expect(formalContent).toInclude("TypeScript");
    expect(casualContent).toInclude("TypeScript");
  });
});