"use strict";

import OpenAI from "openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OpenAIEmbeddings } from "@langchain/openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class LocalVectorStore {
  private static instance: FaissStore;
  private static embeddings: OpenAIEmbeddings;

  private constructor() {}

  public static async getInstance() {
    if (!LocalVectorStore.instance) {
      LocalVectorStore.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
      });
      try {
        LocalVectorStore.instance = await FaissStore.load(
          process.env.VECTOR_STORE_PATH || "./vector_store",
          LocalVectorStore.embeddings
        );
      } catch {
        LocalVectorStore.instance = new FaissStore(LocalVectorStore.embeddings, {});
      }
    }
    return LocalVectorStore.instance;
  }

  public static async similaritySearch(query: string, k: number = 3) {
    const instance = await LocalVectorStore.getInstance();
    return instance.similaritySearch(query, k);
  }
}

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
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.7,
      });

      const content = response.choices[0].message.content?.trim();
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

    Wygeneruj treść zgodnie z zasadami. ${
      platform === "linkedin" ? "Maksymalnie 1300 znaków." :
      platform === "email" ? "Użyj struktury: temat, wstęp, rozwinięcie, call-to-action." :
      "Długość dowolna, ale dobrze ustrukturyzowana."
    }
    `;
  }

  private static postProcessContent(content: string, platform: string): string {
    // LinkedIn: Ensure proper line breaks and hashtags
    if (platform === "linkedin") {
      return content
        .replace(/\n\s*\n/g, "\n\n") // Fix double line breaks
        .replace(/#(\w+)/g, "#$1") // Ensure hashtags are properly formatted
        .slice(0, 1300); // Enforce character limit
    }

    // Email: Extract subject if not present
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
    queryForContext: string
  ): Promise<string> {
    const contextDocs = await LocalVectorStore.similaritySearch(queryForContext, 3);
    const context = contextDocs.map(doc => doc.pageContent).join("\n\n");
    return this.generateContent(prompt, platform, context);
  }
}

// Example usage
if (import.meta.main) {
  const testPrompt = "Napisz post na LinkedIn o korzyściach z używania OpenClaude w projektach programistycznych";
  AIDolekGenerator.generateWithContext(
    testPrompt,
    "linkedin",
    "OpenClaude features and benefits"
  ).then(console.log).catch(console.error);
}