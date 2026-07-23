import path from "path";

type FeaturePipeline = (
  input: unknown,
  options?: { pooling?: string; normalize?: boolean }
) => Promise<{ data: Float32Array | number[] }>;

/**
 * Lazy CLIP embeddings — bez top-level await (bezpieczne dla Next.js).
 * embedDocuments/embedQuery zgodne z interfejsem LangChain Embeddings.
 */
export class ImageEmbeddings {
  private static instance: ImageEmbeddings | null = null;
  private pipelinePromise: Promise<FeaturePipeline> | null = null;

  private constructor() {}

  static async getInstance(): Promise<ImageEmbeddings> {
    if (!ImageEmbeddings.instance) {
      ImageEmbeddings.instance = new ImageEmbeddings();
    }
    return ImageEmbeddings.instance;
  }

  private async getPipeline(): Promise<FeaturePipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        const { pipeline } = await import("@xenova/transformers");
        return (await pipeline(
          "feature-extraction",
          "Xenova/clip-vit-base-patch32"
        )) as FeaturePipeline;
      })();
    }
    return this.pipelinePromise;
  }

  async embedImage(imagePath: string): Promise<number[]> {
    const sharp = (await import("sharp")).default;
    const extractor = await this.getPipeline();

    // CLIP/ViT: JPEG buffer jest prostszy w Node niż raw RGB
    const imageBuffer = await sharp(imagePath)
      .resize(224, 224, { fit: "cover" })
      .jpeg()
      .toBuffer();

    const output = await extractor(imageBuffer, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(output.data);
  }

  /** Dla FAISS: jeśli string wygląda na ścieżkę obrazu — embed obrazu, inaczej zero-vector fallback. */
  async embedDocuments(documents: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (const doc of documents) {
      if (this.looksLikeImagePath(doc)) {
        out.push(await this.embedImage(doc));
      } else {
        // Zapytania tekstowe / placeholdery: stub 512-d (CLIP base)
        out.push(new Array(512).fill(0));
      }
    }
    return out;
  }

  async embedQuery(query: string): Promise<number[]> {
    if (this.looksLikeImagePath(query)) {
      return this.embedImage(query);
    }
    const [vec] = await this.embedDocuments([query]);
    return vec;
  }

  private looksLikeImagePath(value: string): boolean {
    const ext = path.extname(value).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
  }
}
