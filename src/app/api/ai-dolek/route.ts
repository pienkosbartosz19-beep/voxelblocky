"use server";

import { AIDolekGenerator } from "../../../../mini-services/ai-dolek";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, platform, useContext, contextQuery, contextType, tone } = await request.json();

    if (!prompt || !platform) {
      return NextResponse.json(
        { error: "Missing required parameters: prompt and platform are required" },
        { status: 400 }
      );
    }

    let content: string;
    if (useContext && contextQuery) {
      // Wyszukiwanie kontekstu w Second Brain (multimodalne)
      const contextResults = await VectorStore.similaritySearch(
        contextQuery,
        3,
        contextType || "text" // Domyślnie tekst
      );

      content = await AIDolekGenerator.generateWithContext(
        prompt,
        platform,
        contextResults, // Przekazujemy wyniki wyszukiwania (tekst + obrazy)
        tone
      );
    } else {
      content = await AIDolekGenerator.generateContent(
        prompt,
        platform,
        undefined,
        tone
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("AIDolek API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate content", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}