export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
}
