"use server";

import { AgentRegistry } from "@/lib/AgentRegistry";
import { VectorStore } from "@/lib/vectorStore";
import { AIDolekGenerator } from "../../../../mini-services/ai-dolek";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const {
      agentId,
      prompt,
      platform,
      useContext,
      contextQuery,
      contextType,
      tone,
    } = await request.json();

    if (!agentId || !prompt) {
      return NextResponse.json(
        { error: "Missing required parameters: agentId and prompt" },
        { status: 400 }
      );
    }

    // 1. Pobierz agenta i wygeneruj prompt z rolą systemową
    const registry = await AgentRegistry.getInstance();
    const fullPrompt = await registry.generatePrompt(agentId, prompt);

    const resolvedPlatform =
      platform === "linkedin" || platform === "email" || platform === "blog"
        ? platform
        : "blog";

    // 2. Wygeneruj treść z AIDolek (z lub bez kontekstu z Second Brain)
    let content: string;
    if (useContext && contextQuery) {
      const type = contextType === "image" ? "image" : "text";
      const contextResults = await VectorStore.similaritySearch(
        contextQuery,
        3,
        type
      );
      content = await AIDolekGenerator.generateWithContext(
        fullPrompt,
        resolvedPlatform,
        contextResults,
        tone || "casual"
      );
    } else {
      content = await AIDolekGenerator.generateContent(
        fullPrompt,
        resolvedPlatform,
        undefined,
        tone || "casual"
      );
    }

    return NextResponse.json({
      agent: agentId,
      platform: resolvedPlatform,
      content,
    });
  } catch (error) {
    console.error("Agent Generate API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}