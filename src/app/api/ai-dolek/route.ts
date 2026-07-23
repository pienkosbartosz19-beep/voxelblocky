import { AIDolekGenerator } from "../../../../mini-services/ai-dolek";
import { VectorStore } from "@/lib/vectorStore";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const {
      prompt,
      platform,
      useContext,
      contextQuery,
      contextType,
      tone,
    } = await request.json();

    if (!prompt || !platform) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters: prompt and platform are required",
        },
        { status: 400 }
      );
    }

    const allowedPlatforms = ["linkedin", "email", "blog"] as const;
    if (!allowedPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: "platform must be one of: linkedin, email, blog" },
        { status: 400 }
      );
    }

    let content: string;

    if (useContext && contextQuery) {
      const type = (contextType === "image" ? "image" : "text") as
        | "text"
        | "image";
      const contextResults = await VectorStore.similaritySearch(
        contextQuery,
        3,
        type
      );

      content = await AIDolekGenerator.generateWithContext(
        prompt,
        platform,
        contextResults,
        tone || "casual"
      );
    } else {
      content = await AIDolekGenerator.generateContent(
        prompt,
        platform,
        undefined,
        tone || "casual"
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("AIDolek API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
