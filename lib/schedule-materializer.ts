import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { scheduleEvents } from "./db/schema";
import { addDays, startOfDay } from "date-fns";
import type { Schedule } from "./types";

/**
 * Resolve a wall-clock time in a given IANA timezone to a UTC Date for a
 * specific calendar day.  Uses the Intl API so no extra TZ library is needed.
 */
function toUtcDate(
  dayDate: Date,
  timeStr: string,
  timezone: string,
): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);

  const year = dayDate.getFullYear();
  const month = dayDate.getMonth();
  const day = dayDate.getDate();

  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(year, month, day, 12, 0, 0));

  const partMap: Record<string, string> = {};
  for (const p of localParts) partMap[p.type] = p.value;

  const probe = new Date(
    Date.UTC(
      Number(partMap.year),
      Number(partMap.month) - 1,
      Number(partMap.day),
      hours,
      minutes,
      0,
    ),
  );

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const probeParts = formatter.formatToParts(probe);
  const probeMap: Record<string, string> = {};
  for (const p of probeParts) probeMap[p.type] = p.value;

  const probeHour = Number(probeMap.hour === "24" ? "0" : probeMap.hour);
  const probeMin = Number(probeMap.minute);

  const offsetMs =
    (probeHour - hours) * 3600000 + (probeMin - minutes) * 60000;

  return new Date(probe.getTime() - offsetMs);
}

/**
 * Delete all non-executed future schedule events for the agent, then
 * generate new ones from the schedule definition.
 */
export function materializeScheduleEvents(
  schedule: Schedule,
  days: number = 14,
): void {
  db.delete(scheduleEvents)
    .where(
      and(
        eq(scheduleEvents.agentId, schedule.agentId),
        eq(scheduleEvents.executed, false),
      ),
    )
    .run();

  if (
    schedule.mode !== "time_window" &&
    schedule.mode !== "both"
  ) {
    return;
  }

  if (!schedule.weekdays || !schedule.startTime || !schedule.endTime) {
    return;
  }

  const weekdays: number[] = JSON.parse(schedule.weekdays);
  const now = new Date();
  const today = startOfDay(now);

  for (let d = 0; d <= days; d++) {
    const dayDate = addDays(today, d);
    const jsDay = dayDate.getDay();

    if (!weekdays.includes(jsDay)) continue;

    const onTime = toUtcDate(dayDate, schedule.startTime, schedule.timezone);
    const offTime = toUtcDate(dayDate, schedule.endTime, schedule.timezone);

    if (onTime > now) {
      db.insert(scheduleEvents)
        .values({
          id: crypto.randomUUID(),
          agentId: schedule.agentId,
          ts: onTime,
          action: "power_on",
          source: "time_window",
          executed: false,
          createdAt: now,
        })
        .run();
    }

    if (offTime > now) {
      db.insert(scheduleEvents)
        .values({
          id: crypto.randomUUID(),
          agentId: schedule.agentId,
          ts: offTime,
          action: "shutdown",
          source: "time_window",
          executed: false,
          createdAt: now,
        })
        .run();
    }
  }
}
