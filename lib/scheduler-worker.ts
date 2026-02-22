import { eq, and, lte, ne, sql } from "drizzle-orm";
import { db } from "./db";
import { agents, schedules, scheduleEvents } from "./db/schema";
import { writeAuditEvent } from "./audit";
import {
  powerOnDroplet,
  shutdownDroplet,
} from "./do-client";
import { materializeScheduleEvents } from "./schedule-materializer";

/**
 * Single tick of the scheduler. Called from a setInterval in the WS server.
 *
 * 1. Process due schedule events (power_on / shutdown)
 * 2. Check idle timeouts for online agents
 * 3. Re-materialize schedules that are running low on future events
 */
export async function runSchedulerTick(): Promise<void> {
  await processDueEvents();
  await checkIdleTimeouts();
  rematerializeExpiring();
}

// ---------------------------------------------------------------------------
// 1. Process due schedule events
// ---------------------------------------------------------------------------

async function processDueEvents(): Promise<void> {
  const now = new Date();

  const dueEvents = db
    .select()
    .from(scheduleEvents)
    .where(
      and(
        eq(scheduleEvents.executed, false),
        lte(scheduleEvents.ts, now),
      ),
    )
    .all();

  for (const event of dueEvents) {
    try {
      const agent = db
        .select()
        .from(agents)
        .where(eq(agents.id, event.agentId))
        .get();

      if (!agent || agent.status === "deleting" || agent.status === "error") {
        markExecuted(event.id);
        continue;
      }

      if (!agent.doDropletId) {
        markExecuted(event.id);
        continue;
      }

      if (event.action === "power_on") {
        if (agent.status === "offline" || agent.status === "paused") {
          await powerOnDroplet(agent.doDropletId);
          db.update(agents)
            .set({
              status: "creating",
              runtimeState: "running",
              pauseReason: null,
              updatedAt: now,
            })
            .where(eq(agents.id, agent.id))
            .run();
          await writeAuditEvent(agent.id, "scheduler.window_on", {
            dropletId: agent.doDropletId,
            eventId: event.id,
          }, "system");
        }
      } else if (event.action === "shutdown") {
        if (agent.status === "online" || agent.status === "paused") {
          await shutdownDroplet(agent.doDropletId);
          db.update(agents)
            .set({ status: "offline", updatedAt: now })
            .where(eq(agents.id, agent.id))
            .run();
          await writeAuditEvent(agent.id, "scheduler.window_off", {
            dropletId: agent.doDropletId,
            eventId: event.id,
          }, "system");
        }
      }

      markExecuted(event.id);
    } catch (err) {
      console.error(
        `[scheduler] failed to process event ${event.id}:`,
        err,
      );
      markExecuted(event.id);
    }
  }
}

function markExecuted(eventId: string): void {
  db.update(scheduleEvents)
    .set({ executed: true })
    .where(eq(scheduleEvents.id, eventId))
    .run();
}

// ---------------------------------------------------------------------------
// 2. Idle timeout checks
// ---------------------------------------------------------------------------

async function checkIdleTimeouts(): Promise<void> {
  const onlineAgents = db
    .select()
    .from(agents)
    .where(eq(agents.status, "online"))
    .all();

  const now = new Date();

  for (const agent of onlineAgents) {
    try {
      const schedule = db
        .select()
        .from(schedules)
        .where(eq(schedules.agentId, agent.id))
        .get();

      if (!schedule || !schedule.enabled) continue;
      if (schedule.mode !== "idle_rule" && schedule.mode !== "both") continue;
      if (!schedule.idleMinutes) continue;

      const lastActivity = agent.lastActivityAt;
      if (!lastActivity) continue;

      const idleMs = now.getTime() - lastActivity.getTime();
      const limitMs = schedule.idleMinutes * 60_000;

      if (idleMs < limitMs) continue;

      db.update(agents)
        .set({
          status: "paused",
          runtimeState: "paused",
          pauseReason: `Idle for ${schedule.idleMinutes} minutes`,
          updatedAt: now,
        })
        .where(eq(agents.id, agent.id))
        .run();

      await writeAuditEvent(agent.id, "scheduler.idle_triggered", {
        idleMinutes: schedule.idleMinutes,
        idleMs,
        idleAction: schedule.idleAction,
      }, "system");

      if (
        schedule.idleAction === "shutdown_instance" &&
        agent.doDropletId
      ) {
        try {
          await shutdownDroplet(agent.doDropletId);
          db.update(agents)
            .set({ status: "offline", updatedAt: now })
            .where(eq(agents.id, agent.id))
            .run();
        } catch (err) {
          console.error(
            `[scheduler] idle shutdown failed for agent ${agent.id}:`,
            err,
          );
        }
      }
    } catch (err) {
      console.error(
        `[scheduler] idle check failed for agent ${agent.id}:`,
        err,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Re-materialize schedules running low on future events
// ---------------------------------------------------------------------------

function rematerializeExpiring(): void {
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  const allSchedules = db
    .select()
    .from(schedules)
    .where(eq(schedules.enabled, true))
    .all();

  for (const schedule of allSchedules) {
    if (schedule.mode !== "time_window" && schedule.mode !== "both") continue;

    const latestEvent = db
      .select({ ts: scheduleEvents.ts })
      .from(scheduleEvents)
      .where(
        and(
          eq(scheduleEvents.agentId, schedule.agentId),
          eq(scheduleEvents.executed, false),
        ),
      )
      .orderBy(sql`${scheduleEvents.ts} DESC`)
      .limit(1)
      .get();

    if (!latestEvent || latestEvent.ts <= twoDaysFromNow) {
      materializeScheduleEvents(schedule);
    }
  }
}
