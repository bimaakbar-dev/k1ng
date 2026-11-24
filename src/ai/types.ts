import type { ChatMessage } from "../types";

export interface AIProvider {
  id: string;
  label: string;
  model: string;
  chat(messages: ChatMessage[], system?: string): Promise<string>;
}
