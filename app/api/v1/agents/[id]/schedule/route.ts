import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, schedules } from "@/lib/db/schema";
import { scheduleSchema } from "@/lib/types";
import { materializeScheduleEvents } from "@/lib/schedule-materializer";
import type { Schedule } from "@/lib/types";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const schedule = db
    .select()
    .from(schedules)
    .where(eq(schedules.agentId, id))
    .get();

  if (!schedule) {
    return NextResponse.json(
      { error: "No schedule configured" },
      { status: 404 },
    );
  }

  return NextResponse.json(formatSchedule(schedule));
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const now = new Date();

  const existing = db
    .select()
    .from(schedules)
    .where(eq(schedules.agentId, id))
    .get();

  if (existing) {
    db.update(schedules)
      .set({
        mode: data.mode,
        timezone: data.timezone,
        weekdays: data.weekdays ? JSON.stringify(data.weekdays) : null,
        startTime: data.start_time ?? null,
        endTime: data.end_time ?? null,
        idleMinutes: data.idle_minutes ?? null,
        idleAction: data.idle_action,
        enabled: data.enabled,
        updatedAt: now,
      })
      .where(eq(schedules.agentId, id))
      .run();
  } else {
    db.insert(schedules)
      .values({
        id: crypto.randomUUID(),
        agentId: id,
        mode: data.mode,
        timezone: data.timezone,
        weekdays: data.weekdays ? JSON.stringify(data.weekdays) : null,
        startTime: data.start_time ?? null,
        endTime: data.end_time ?? null,
        idleMinutes: data.idle_minutes ?? null,
        idleAction: data.idle_action,
        enabled: data.enabled,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  const saved = db
    .select()
    .from(schedules)
    .where(eq(schedules.agentId, id))
    .get() as Schedule;

  if (saved.enabled) {
    materializeScheduleEvents(saved);
  }

  return NextResponse.json(formatSchedule(saved));
}

function formatSchedule(s: Schedule) {
  return {
    id: s.id,
    agent_id: s.agentId,
    mode: s.mode,
    timezone: s.timezone,
    weekdays: s.weekdays ? JSON.parse(s.weekdays) : null,
    start_time: s.startTime,
    end_time: s.endTime,
    idle_minutes: s.idleMinutes,
    idle_action: s.idleAction,
    enabled: s.enabled,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}
