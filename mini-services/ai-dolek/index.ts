"use strict";

import { Ollama } from "ollama";
import { VectorStore } from "../../../src/lib/vectorStore";

const ollama = new Ollama({ host: "http://localhost:11434" });

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
  `;

  static async generateContent(
    prompt: string,
    platform: "linkedin" | "email" | "blog",
    context?: string,
    tone: "formal" | "casual" | "technical" = "casual"
  ): Promise<string> {
    const fullPrompt = this.buildPrompt(prompt, platform, context, tone);

    try {
      const response = await ollama.chat({
        model: "llama3.1:8b", // Lokalny model Llama 3.1 8B
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
    tone: string
  ): string {
    return `
    Zadanie: ${prompt}
    Platforma: ${platform}
    Ton: ${tone}
    ${context ? `Kontekst: ${context}` : ""}

    Wygeneruj treść zgodnie z zasadami. $\n      platform === "linkedin" ? "Maksymalnie 1300 znaków." :
      platform === "email" ? "Użyj struktury: temat, wstęp, rozwinięcie, call-to-action." :
      "Długość dowolna, ale dobrze ustrukturyzowana."\n    `;
  }

  private static postProcessContent(content: string, platform: string): string {
    if (platform === "linkedin") {
      return content
        .replace(/\n\s*\n/g, "\n\n")
        .replace(/#(\w+)/g, "#$1")
        .slice(0, 1300);
    }

    if (platform === "email" && !content.includes("Temat:")) {
      const subjectMatch = content.match(/^(.*?)[\n.]/);
      const subject = subjectMatch ? subjectMatch[1] : "Nowa wiadomość";
      return `Temat: ${subject}\n\n${content}`;
    }

    return content;
  }

  static async generateWithContext(
    prompt: string,
    platform: "linkedin" | "email" | "blog",
    contextResults: any[], // Wyniki z VectorStore.similaritySearch (Document[])
    tone: "formal" | "casual" | "technical" = "casual"
  ): Promise<string> {
    // Przygotowanie kontekstu (tekst + obrazy)
    let context = "";
    for (const doc of contextResults) {
      if (doc.metadata?.type === "image") {
        // Dla obrazów: dodajemy opis do promptu
        context += `\n\n[Obraz: ${doc.metadata.source}]`;
        if (doc.metadata.description) {
          context += ` przedstawia: ${doc.metadata.description}`;
        }
      } else {
        // Dla tekstu: dodajemy pageContent
        context += `\n\n${doc.pageContent}`;
      }
    }

    return this.generateContent(prompt, platform, context, tone);
  }
}

// Example usage
if (import.meta.main) {
  const testPrompt = "Napisz post na LinkedIn o korzyściach z lokalnego AI";
  AIDolekGenerator.generateWithContext(
    testPrompt,
    "linkedin",
    "lokalne AI"
  ).then(console.log).catch(console.error);
}