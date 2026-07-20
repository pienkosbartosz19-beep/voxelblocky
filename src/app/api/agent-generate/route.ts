"use server";

import { AgentRegistry } from "@/lib/AgentRegistry";
import { AIDolekGenerator } from "../../../../mini-services/ai-dolek";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { agentId, prompt, platform, useContext, contextQuery } = await request.json();

    if (!agentId || !prompt) {
      return NextResponse.json(
        { error: "Missing required parameters: agentId and prompt" },
        { status: 400 }
      );
    }

    // 1. Pobierz agenta i wygeneruj prompt z rolą systemową
    const registry = await AgentRegistry.getInstance();
    const fullPrompt = await registry.generatePrompt(agentId, prompt);

    // 2. Wygeneruj treść z AIDolek (z lub bez kontekstu z Second Brain)
    let content: string;
    if (useContext && contextQuery) {
      content = await AIDolekGenerator.generateWithContext(
        fullPrompt,
        platform || "blog",
        contextQuery
      );
    } else {
      content = await AIDolekGenerator.generateContent(
        fullPrompt,
        platform || "blog"
      );
    }

    return NextResponse.json({
      agent: agentId,
      platform: platform || "blog",
      content,
    });
  }  catch (error) {
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