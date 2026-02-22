export const COST_PER_INPUT_TOKEN =
  Number(process.env.COST_PER_INPUT_TOKEN) || 0.000001;

export const COST_PER_OUTPUT_TOKEN =
  Number(process.env.COST_PER_OUTPUT_TOKEN) || 0.000003;

export function calculateCostUsd(
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN
  );
}
