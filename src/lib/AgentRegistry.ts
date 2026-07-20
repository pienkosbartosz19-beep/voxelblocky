"use server";

import { z } from "zod";
import path from "path";
import fs from "fs";

// Schema dla agenta (zgodne z rzeczywistą strukturą lobe-chat-agents)
const AgentSchema = z.object({
  config: z.object({
    systemRole: z.string(),
    openingMessage: z.string().optional(),
    openingQuestions: z.array(z.string()).optional(),
  }),
  meta: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
  }),
  summary: z.string().optional(),
});

type Agent = z.infer<typeof AgentSchema> & { identifier: string };

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, Agent>;

  private constructor() {
    this.agents = new Map();
  }

  public static async getInstance(): Promise<AgentRegistry> {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
      await AgentRegistry.instance.loadAgents();
    }
    return AgentRegistry.instance;
  }

  // Ładowanie agentów z lobe-chat-agents
  private async loadAgents() {
    const agentsDir = process.env.LOBE_AGENTS_PATH || "C:/Projects/lobe-chat-agents/locales";

    try {
      const agentFolders = await fs.promises.readdir(agentsDir);
      for (const folder of agentFolders) {
        const indexPath = path.join(agentsDir, folder, "index.json");
        try {
          const stats = await fs.promises.stat(indexPath);
          if (stats.isFile()) {
            const agentData = JSON.parse(await fs.promises.readFile(indexPath, "utf-8"));
            const agent = AgentSchema.parse(agentData);
            const agentWithIdentifier = { ...agent, identifier: folder };
            this.agents.set(folder, agentWithIdentifier);
          }
        } catch (err) {
          // Ignoruj błędne pliki agentów
        }
      }
    } catch (err) {
      console.error("Failed to load agents directory:", err);
    }
  }

  // Wyszukiwanie agentów
  public searchAgents(query: string): Agent[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.agents.values()).filter((agent) =>
      agent.meta.title.toLowerCase().includes(lowerQuery) ||
      agent.meta.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      agent.identifier.toLowerCase().includes(lowerQuery)
    );
  }

  // Pobieranie agenta po ID
  public getAgent(identifier: string): Agent | undefined {
    return this.agents.get(identifier);
  }

  // Lista wszystkich agentów
  public listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  // Generowanie promptu dla agenta
  public async generatePrompt(identifier: string, userInput: string): Promise<string> {
    const agent = this.getAgent(identifier);
    if (!agent) throw new Error(`Agent ${identifier} not found`);

    return `
    [SYSTEM ROLE]
    ${agent.config.systemRole}

    [USER INPUT]
    ${userInput}

    [TASK]
    Wykonaj zadanie zgodnie z rolą systemową. Odpowiedź powinna być zwięzła i merytoryczna.
    `;
  }
}