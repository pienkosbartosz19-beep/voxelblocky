"use server";

import { pipeline } from "@xenova/transformers";
import sharp from "sharp";

// Inicjalizacja CLIP (model do wektoryzacji obrazów)
const clipPipeline = await pipeline(
  "feature-extraction",
  "Xenova/clip-vit-base-patch32"
);

export class ImageEmbeddings {
  private static instance: ImageEmbeddings;

  private constructor() {}

  public static async getInstance() {
    if (!ImageEmbeddings.instance) {
      ImageEmbeddings.instance = new ImageEmbeddings();
    }
    return ImageEmbeddings.instance;
  }

  public async embedImage(imagePath: string): Promise<number[]> {
    // Konwersja obrazu do tensora (CLIP wymaga formatu 224x224)
    const imageBuffer = await sharp(imagePath)
      .resize(224, 224)
      .raw()
      .toBuffer();

    // Wektoryzacja obrazu (CLIP)
    const imageEmbeddings = await clipPipeline(imageBuffer, {
      pooling: "mean",
      normalize: true,
    });

    // Konwersja tensora na tablicę liczb
    return Array.from(imageEmbeddings.data);
  }

  // Metoda wymagana przez FAISS (LangChain)
  public async embedDocuments(documents: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const doc of documents) {
      const embedding = await this.embedImage(doc);
      embeddings.push(embedding);
    }
    return embeddings;
  }

  // Metoda wymagana przez FAISS (LangChain)
  public async embedQuery(query: string): Promise<number[]> {
    // Dla uproszczenia używamy embedImage (query to ścieżka do obrazu)
    return this.embedImage(query);
  }
}