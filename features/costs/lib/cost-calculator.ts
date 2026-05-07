const DEEPGRAM_COST_PER_MINUTE = 0.0043;
const OPENROUTER_INPUT_PER_1K = 0.003;
const OPENROUTER_OUTPUT_PER_1K = 0.015;
const BRIDGE_COST_PER_CHUNK = 0.00025;

export function calculateDeepgramCost(durationSeconds: number): number {
  return (durationSeconds / 60) * DEEPGRAM_COST_PER_MINUTE;
}

export function calculateAIChatCost(
  inputTokens: number,
  outputTokens: number
): number {
  return (
    (inputTokens / 1000) * OPENROUTER_INPUT_PER_1K +
    (outputTokens / 1000) * OPENROUTER_OUTPUT_PER_1K
  );
}

export function calculateBridgeCost(chunkCount: number): number {
  return chunkCount * BRIDGE_COST_PER_CHUNK;
}

export function estimateTokenSplit(totalTokens: number): {
  input: number;
  output: number;
} {
  const input = Math.round(totalTokens * 0.7);
  const output = totalTokens - input;
  return { input, output };
}

export function estimateSessionCost(session: {
  duration: number;
  chunk_count: number;
}): { deepgram: number; bridge: number; total: number } {
  const deepgram = calculateDeepgramCost(session.duration);
  const bridge = calculateBridgeCost(session.chunk_count);
  return { deepgram, bridge, total: deepgram + bridge };
}

export const COST_CONSTANTS = {
  DEEPGRAM_COST_PER_MINUTE,
  OPENROUTER_INPUT_PER_1K,
  OPENROUTER_OUTPUT_PER_1K,
  BRIDGE_COST_PER_CHUNK,
} as const;
