import { eq } from "drizzle-orm";
import { db } from "./db";
import { agents, budgets, tokenUsageTotals } from "./db/schema";
import { calculateCostUsd } from "./cost";
import { writeAuditEvent } from "./audit";
import {
  shutdownDroplet,
  powerOffDroplet,
} from "./do-client";

/**
 * Check whether the agent's token/cost usage has exceeded its budget.
 * If so, mark the budget as exceeded, pause the agent, and optionally
 * trigger a droplet shutdown or power-off.
 *
 * Designed to be called synchronously after token accounting in the
 * LLM proxy so it runs in the same request cycle.
 */
export function checkAndEnforceBudget(agentId: string): void {
  const budget = db
    .select()
    .from(budgets)
    .where(eq(budgets.agentId, agentId))
    .get();

  if (!budget || !budget.enabled || budget.exceededAt) return;

  const totals = db
    .select()
    .from(tokenUsageTotals)
    .where(eq(tokenUsageTotals.agentId, agentId))
    .get();

  if (!totals) return;

  const totalTokens = totals.totalInputTokens + totals.totalOutputTokens;
  const estimatedCost = calculateCostUsd(
    totals.totalInputTokens,
    totals.totalOutputTokens,
  );

  let exceeded = false;
  let reason = "";

  if (budget.tokenLimitTotal && totalTokens >= budget.tokenLimitTotal) {
    exceeded = true;
    reason = `Token limit exceeded: ${totalTokens} >= ${budget.tokenLimitTotal}`;
  }

  if (
    !exceeded &&
    budget.costLimitUsd &&
    estimatedCost >= Number(budget.costLimitUsd)
  ) {
    exceeded = true;
    reason = `Cost limit exceeded: $${estimatedCost.toFixed(6)} >= $${budget.costLimitUsd}`;
  }

  if (!exceeded) return;

  const now = new Date();

  db.update(budgets)
    .set({ exceededAt: now })
    .where(eq(budgets.agentId, agentId))
    .run();

  db.update(agents)
    .set({
      status: "paused",
      runtimeState: "paused",
      pauseReason: reason,
      updatedAt: now,
    })
    .where(eq(agents.id, agentId))
    .run();

  writeAuditEvent(agentId, "budget.exceeded", {
    reason,
    totalTokens,
    estimatedCost,
    tokenLimit: budget.tokenLimitTotal,
    costLimit: budget.costLimitUsd ? Number(budget.costLimitUsd) : null,
    actionOnExceed: budget.actionOnExceed,
  }, "system");

  writeAuditEvent(agentId, "budget.paused_agent", { reason }, "system");

  const agent = db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .get();

  if (!agent?.doDropletId) return;

  if (budget.actionOnExceed === "shutdown_instance") {
    writeAuditEvent(agentId, "budget.shutdown_instance", {
      dropletId: agent.doDropletId,
    }, "system");
    shutdownDroplet(agent.doDropletId).catch((err) => {
      console.error("[budget-enforcer] shutdown failed:", err);
    });
  } else if (budget.actionOnExceed === "power_off_instance") {
    writeAuditEvent(agentId, "budget.shutdown_instance", {
      dropletId: agent.doDropletId,
      action: "power_off",
    }, "system");
    powerOffDroplet(agent.doDropletId).catch((err) => {
      console.error("[budget-enforcer] power_off failed:", err);
    });
  }
}
