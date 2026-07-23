import { Ollama } from "ollama";

const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
});

export type AIDolekPlatform = "linkedin" | "email" | "blog";
export type AIDolekTone = "formal" | "casual" | "technical";

type ContextDoc = {
  pageContent?: string;
  metadata?: {
    type?: string;
    source?: string;
    description?: string;
  };
};

export class AIDolekGenerator {
  private static systemPrompt = `
Jesteś asystentem AI specjalizującym się w generowaniu spersonalizowanych treści dla różnych platform.
Twoje zadanie to tworzenie angażujących, wartościowych i dopasowanych do kontekstu treści.

Zasady:
1. Używaj zwięzłego, naturalnego języka polskiego.
2. Dopasuj styl do platformy docelowej (LinkedIn, email, blog).
3. Unikaj nadmiernego używania buzzwordów.
4. W treściach uwzględniaj dane z kontekstu.
5. Dla postów na LinkedIn używaj maksymalnie 1300 znaków.
6. Dla emaili używaj struktury: temat, wstęp, rozwinięcie, call-to-action.
`.trim();

  static async generateContent(
    prompt: string,
    platform: AIDolekPlatform,
    context?: string,
    tone: AIDolekTone = "casual"
  ): Promise<string> {
    const fullPrompt = this.buildPrompt(prompt, platform, context, tone);

    try {
      const response = await ollama.chat({
        model: process.env.AIDOLEK_MODEL || "llama3.1:8b",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: fullPrompt },
        ],
        options: {
          temperature: 0.7,
        },
      });

      const content = response.message.content.trim();
      if (!content) {
        throw new Error("No content generated");
      }

      return this.postProcessContent(content, platform);
    } catch (error) {
      console.error("AIDolek generation error:", error);
      throw new Error("Failed to generate content");
    }
  }

  private static buildPrompt(
    prompt: string,
    platform: string,
    context?: string,
    tone: string = "casual"
  ): string {
    const platformHint =
      platform === "linkedin"
        ? "Maksymalnie 1300 znaków."
        : platform === "email"
          ? "Użyj struktury: temat, wstęp, rozwinięcie, call-to-action."
          : "Długość dowolna, ale dobrze ustrukturyzowana.";

    return [
      `Zadanie: ${prompt}`,
      `Platforma: ${platform}`,
      `Ton: ${tone}`,
      context ? `Kontekst:\n${context}` : "",
      "",
      `Wygeneruj treść zgodnie z zasadami. ${platformHint}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private static postProcessContent(content: string, platform: string): string {
    if (platform === "linkedin") {
      return content
        .replace(/\n\s*\n/g, "\n\n")
        .slice(0, 1300);
    }

    if (platform === "email" && !content.includes("Temat:")) {
      const subjectMatch = content.match(/^(.*?)[\n.]/);
      const subject = subjectMatch ? subjectMatch[1] : "Nowa wiadomość";
      return `Temat: ${subject}\n\n${content}`;
    }

    return content;
  }

  /** Składa kontekst z wyników Second Brain (tekst + placeholdery obrazów). */
  static assembleContext(contextResults: ContextDoc[]): string {
    const parts: string[] = [];

    for (const doc of contextResults) {
      if (doc.metadata?.type === "image") {
        let line = `[Obraz: ${doc.metadata.source || "unknown"}]`;
        if (doc.metadata.description) {
          line += ` — ${doc.metadata.description}`;
        } else if (doc.pageContent) {
          line += ` — ${doc.pageContent}`;
        }
        parts.push(line);
      } else if (doc.pageContent) {
        parts.push(doc.pageContent);
      }
    }

    return parts.join("\n\n");
  }

  static async generateWithContext(
    prompt: string,
    platform: AIDolekPlatform,
    contextResults: ContextDoc[],
    tone: AIDolekTone = "casual"
  ): Promise<string> {
    const context = this.assembleContext(contextResults);
    return this.generateContent(prompt, platform, context, tone);
  }
}
