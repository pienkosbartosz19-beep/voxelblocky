"use server";

import { z } from "zod";
import path from "path";
import fs from "fs";

// Schema dla agenta (zgodne z lobe-chat-agents)
const AgentSchema = z.object({
  identifier: z.string(),
  avatar: z.string().optional(),
  backgroundColor: z.string().optional(),
  description: z.string(),
  meta: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
  }),
  systemRole: z.string(),
  createAt: z.string().optional(),
  updateAt: z.string().optional(),
});

type Agent = z.infer<typeof AgentSchema>;

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
    const agentsDir = path.join(
      process.env.LOBE_AGENTS_PATH || "C:/Projects/lobe-chat-agents/locales",
      "*",
      "index.json"
    );

    const agentFiles = await fs.promises.glob(agentsDir);
    for (const file of agentFiles) {
      try {
        const agentData = JSON.parse(await fs.promises.readFile(file, "utf-8"));
        const agent = AgentSchema.parse(agentData);
        this.agents.set(agent.identifier, agent);
      } catch (err) {
        console.error(`Failed to load agent from ${file}:`, err);
      }
    }
  }

  // Wyszukiwanie agentów
  public searchAgents(query: string): Agent[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.agents.values()).filter((agent) =>
      agent.meta.title.toLowerCase().includes(lowerQuery) ||
      agent.meta.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
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
    ${agent.systemRole}

    [USER INPUT]
    ${userInput}

    [TASK]
    Wykonaj zadanie zgodnie z rolą systemową. Odpowiedź powinna być zwięzła i merytoryczna.
    `;
  }
}