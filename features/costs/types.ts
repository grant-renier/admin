export interface CostSummary {
  deepgramTotal: number;
  aiChatTotal: number;
  bridgeTotal: number;
  grandTotal: number;
}

export interface DailyDeepgramUsage {
  date: string;
  minutes: number;
  cost: number;
  sessionCount: number;
}

export interface DailyAIChatUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  messageCount: number;
}

export interface DailyBridgeUsage {
  date: string;
  chunkCount: number;
  cost: number;
  sessionCount: number;
}

export interface PerSessionCost {
  sessionId: string;
  sessionName: string;
  userEmail: string;
  deepgramCost: number;
  aiChatCost: number;
  bridgeCost: number;
  totalCost: number;
  createdAt: string;
}
