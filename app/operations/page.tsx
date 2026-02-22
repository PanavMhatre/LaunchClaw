"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { CalendarDays, Pause, Play, Power, RotateCcw, Clock3, Bot, Zap, Trash2 } from "lucide-react"

type ControlState = "running" | "paused" | "stopped"
type ScheduleMode = "specific" | "smart"
type ScheduleEvent = { id: string; time: string }
type ScheduleDayBlock = { day: string; events: ScheduleEvent[] }
type ControlAction = "stop" | "resume" | "restart"

type OperationsPageProps = {
  agentId?: string
}

type ApiAgent = {
  id: string
  name: string
  region: string
  size: string
  status: string
  runtimeState?: string
  pauseReason?: string | null
}

type AgentListRow = {
  id: string
  status: string
}

type ConnectorRow = {
  provider: string
  status: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_PROVIDERS = new Set(["slack", "google", "github"])

function toControlState(agentStatus: string | undefined, runtimeState: string | undefined): ControlState {
  // runtimeState takes priority when the agent is online
  if (runtimeState === "paused") return "paused"
  if (runtimeState === "stopped") return "stopped"
  if (agentStatus === "offline") return "stopped"
  if (agentStatus === "online" || agentStatus === "creating") return "running"
  return "stopped"
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string }
    if (typeof data.error === "string" && data.error.length > 0) {
      return data.error
    }
  } catch {
    // fall through to fallback
  }
  return fallback
}

async function resolveApiAgentId(rawAgentId: string): Promise<string> {
  if (UUID_REGEX.test(rawAgentId)) return rawAgentId

  const legacyMatch = rawAgentId.match(/^agent-(\d{2})$/i)
  if (!legacyMatch) {
    throw new Error("Invalid agent id format. Use a valid API v1 agent id.")
  }

  const slotIndex = Math.max(0, Number.parseInt(legacyMatch[1], 10) - 1)
  const listResponse = await fetch("/api/v1/agents", { cache: "no-store" })

  if (!listResponse.ok) {
    throw new Error(`Failed to load API v1 agents (${listResponse.status}).`)
  }

  const listData = (await listResponse.json()) as { agents?: AgentListRow[] }
  const allAgents = Array.isArray(listData.agents) ? listData.agents : []
  if (allAgents.length === 0) {
    throw new Error("No API v1 agents found. Create an API agent first.")
  }

  const onlineAgents = allAgents.filter((agent) => agent.status === "online")
  const ordered = onlineAgents.length > 0 ? onlineAgents : allAgents

  return ordered[slotIndex]?.id ?? ordered[0].id
}

export default function OperationsPage({ agentId = "" }: OperationsPageProps) {
  const [controlState, setControlState] = useState<ControlState>("running")
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("specific")
  const [activeApiAgentId, setActiveApiAgentId] = useState("")
  const [activeAgentMeta, setActiveAgentMeta] = useState<ApiAgent | null>(null)
  const [connectedProviders, setConnectedProviders] = useState<string[]>([])
  const [controlActionLoading, setControlActionLoading] = useState<ControlAction | null>(null)
  const [controlError, setControlError] = useState("")
  const [controlNotice, setControlNotice] = useState("")

  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [weekdaysOnly, setWeekdaysOnly] = useState(true)
  const [idleMinutes, setIdleMinutes] = useState("20")

  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleDayBlock[]>([
    {
      day: "Mon, Feb 23",
      events: [
        { id: "mon-on", time: "08:00 AM" },
        { id: "mon-off", time: "05:00 PM" },
      ],
    },
    {
      day: "Tue, Feb 24",
      events: [
        { id: "tue-on", time: "08:00 AM" },
        { id: "tue-off", time: "05:00 PM" },
      ],
    },
    {
      day: "Wed, Feb 25",
      events: [
        { id: "wed-on", time: "08:00 AM" },
        { id: "wed-off", time: "05:00 PM" },
      ],
    },
  ])

  const getControlBadge = (state: ControlState) => {
    switch (state) {
      case "running":
        return <Badge className="bg-white/20 text-white">RUNNING</Badge>
      case "paused":
        return <Badge className="bg-orange-500/20 text-orange-500">PAUSED</Badge>
      case "stopped":
        return <Badge className="bg-red-500/20 text-red-500">STOPPED</Badge>
      default:
        return <Badge className="bg-neutral-500/20 text-neutral-300">UNKNOWN</Badge>
    }
  }

  const refreshAgentContext = async (apiAgentId: string) => {
    const agentResponse = await fetch(`/api/v1/agents/${apiAgentId}`, { cache: "no-store" })
    if (!agentResponse.ok) {
      const errorText = await readApiError(agentResponse, `Failed to load agent (${agentResponse.status}).`)
      throw new Error(errorText)
    }

    const agentPayload = (await agentResponse.json()) as { agent?: ApiAgent }
    if (!agentPayload.agent) {
      throw new Error("Agent payload missing from API response.")
    }

    setActiveAgentMeta(agentPayload.agent)
    setControlState(toControlState(agentPayload.agent.status, agentPayload.agent.runtimeState))

    const connectorsResponse = await fetch(`/api/v1/agents/${apiAgentId}/connectors`, { cache: "no-store" })
    if (!connectorsResponse.ok) {
      setConnectedProviders([])
      return
    }

    const connectorsPayload = (await connectorsResponse.json()) as { connectors?: ConnectorRow[] }
    const rows = Array.isArray(connectorsPayload.connectors) ? connectorsPayload.connectors : []

    const providers = rows
      .filter((row) => row.status === "pending" || row.status === "connected")
      .map((row) => row.provider)
      .filter((provider) => VALID_PROVIDERS.has(provider))

    setConnectedProviders(Array.from(new Set(providers)))
  }

  useEffect(() => {
    let disposed = false

    if (!agentId) {
      setControlError("Missing agent id. Open the dashboard through an agent card first.")
      setActiveApiAgentId("")
      setActiveAgentMeta(null)
      return
    }

    const load = async () => {
      try {
        setControlError("")
        const resolvedId = await resolveApiAgentId(agentId)
        if (disposed) return

        setActiveApiAgentId(resolvedId)
        await refreshAgentContext(resolvedId)
      } catch (error) {
        if (disposed) return
        const message = error instanceof Error ? error.message : "Failed to initialize control actions."
        setControlError(message)
      }
    }

    void load()

    return () => {
      disposed = true
    }
  }, [agentId])

  const removeScheduledDay = (day: string) => {
    setUpcomingEvents((prev) => prev.filter((block) => block.day !== day))
  }

  const stopAgent = async () => {
    if (!activeApiAgentId) {
      setControlError("No API agent selected for stop action.")
      return
    }

    setControlActionLoading("stop")
    setControlError("")
    setControlNotice("")

    try {
      const response = await fetch(`/api/v1/agents/${activeApiAgentId}/control/stop`, { method: "POST" })
      if (response.ok) {
        setControlState("stopped")
        setControlNotice("Agent stopped successfully.")
        await refreshAgentContext(activeApiAgentId)
        return
      }

      if (response.status === 409) {
        const data = await readApiError(response, "Agent already stopped.")
        setControlNotice(data)
        await refreshAgentContext(activeApiAgentId)
        return
      }

      const errorText = await readApiError(response, `Failed to stop agent (${response.status}).`)
      throw new Error(errorText)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to stop agent."
      setControlError(message)
    } finally {
      setControlActionLoading(null)
    }
  }

  const resumeAgent = async () => {
    if (!activeApiAgentId) {
      setControlError("No API agent selected for resume action.")
      return
    }

    setControlActionLoading("resume")
    setControlError("")
    setControlNotice("")

    try {
      const response = await fetch(`/api/v1/agents/${activeApiAgentId}/control/resume`, { method: "POST" })
      if (response.ok) {
        setControlState("running")
        setControlNotice("Agent resumed successfully.")
        await refreshAgentContext(activeApiAgentId)
        return
      }

      if (response.status === 409) {
        // Not paused — try instance/on in case it's powered off
        const onResponse = await fetch(`/api/v1/agents/${activeApiAgentId}/instance/on`, { method: "POST" })
        if (onResponse.ok || onResponse.status === 409) {
          setControlState("running")
          setControlNotice(onResponse.status === 409 ? "Agent is already running." : "Agent power-on initiated.")
          await refreshAgentContext(activeApiAgentId)
          return
        }

        const onError = await readApiError(onResponse, `Failed to power on agent (${onResponse.status}).`)
        throw new Error(onError)
      }

      const errorText = await readApiError(response, `Failed to resume agent (${response.status}).`)
      throw new Error(errorText)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resume agent."
      setControlError(message)
    } finally {
      setControlActionLoading(null)
    }
  }

  const pauseAgent = async () => {
    if (!activeApiAgentId) {
      setControlError("No API agent selected for pause action.")
      return
    }

    setControlActionLoading("stop")
    setControlError("")
    setControlNotice("")

    try {
      const response = await fetch(`/api/v1/agents/${activeApiAgentId}/control/pause`, { method: "POST" })
      if (response.ok) {
        setControlState("paused")
        setControlNotice("Agent paused successfully.")
        await refreshAgentContext(activeApiAgentId)
        return
      }

      if (response.status === 409) {
        const data = await readApiError(response, "Agent already paused.")
        setControlNotice(data)
        await refreshAgentContext(activeApiAgentId)
        return
      }

      const errorText = await readApiError(response, `Failed to pause agent (${response.status}).`)
      throw new Error(errorText)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to pause agent."
      setControlError(message)
    } finally {
      setControlActionLoading(null)
    }
  }

  const restartAgent = async () => {
    if (!activeApiAgentId) {
      setControlError("No API agent selected for restart action.")
      return
    }

    setControlActionLoading("restart")
    setControlError("")
    setControlNotice("")

    try {
      const response = await fetch(`/api/v1/agents/${activeApiAgentId}/control/restart`, { method: "POST" })

      if (response.ok) {
        setControlState("running")
        setControlNotice("Agent restart initiated — droplet is rebooting.")
        await refreshAgentContext(activeApiAgentId)
        return
      }

      if (response.status === 409) {
        const data = await readApiError(response, "Cannot restart agent in current state.")
        setControlNotice(data)
        await refreshAgentContext(activeApiAgentId)
        return
      }

      const errorText = await readApiError(response, `Failed to restart agent (${response.status}).`)
      throw new Error(errorText)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to restart agent."
      setControlError(message)
    } finally {
      setControlActionLoading(null)
    }
  }

  const actionBusy = controlActionLoading !== null

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wider">CONTROL CENTER</h1>
        <p className="text-sm text-neutral-400">Manual controls, scheduling, and future run plan</p>
        <p className="text-xs text-neutral-500 mt-2 font-mono">API AGENT: {activeApiAgentId || "--"}</p>
        {controlNotice && <p className="text-xs text-white mt-1">{controlNotice}</p>}
        {controlError && <p className="text-xs text-red-400 mt-1">{controlError}</p>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="bg-neutral-900 border-neutral-700 xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">AGENT STATE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">{getControlBadge(controlState)}</div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">MANUAL CONTROLS (SANDBOXING)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                onClick={() => {
                  void pauseAgent()
                }}
                disabled={actionBusy}
                className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
              <Button
                onClick={() => {
                  void resumeAgent()
                }}
                variant="outline"
                disabled={actionBusy}
                className="border-white/30 text-white hover:bg-neutral-800 bg-transparent flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {controlActionLoading === "resume" ? "Resuming..." : "Resume"}
              </Button>
              <Button
                onClick={() => {
                  void stopAgent()
                }}
                variant="outline"
                disabled={actionBusy}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent flex items-center gap-2"
              >
                <Power className="w-4 h-4" />
                {controlActionLoading === "stop" ? "Stopping..." : "Stop"}
              </Button>
              <Button
                onClick={() => {
                  void restartAgent()
                }}
                variant="outline"
                disabled={actionBusy}
                className="border-neutral-600 text-neutral-200 hover:bg-neutral-800 bg-transparent flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {controlActionLoading === "restart" ? "Restarting..." : "Restart"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">SMART ON/OFF SCHEDULING</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setScheduleMode("specific")}
              className={
                scheduleMode === "specific"
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              }
            >
              <Clock3 className="w-4 h-4 mr-2" />
              Specific Times
            </Button>
            <Button
              onClick={() => setScheduleMode("smart")}
              className={
                scheduleMode === "smart"
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              }
            >
              <Bot className="w-4 h-4 mr-2" />
              Smart Timed Activities
            </Button>
          </div>

          {scheduleMode === "specific" ? (
            <div className="space-y-4 border border-neutral-700 rounded p-4">
              <div className="text-sm text-neutral-400">
                Active from <span className="text-white font-mono">{startTime}</span> -{" "}
                <span className="text-white font-mono">{endTime}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 tracking-wider">START TIME</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 bg-neutral-800 border-neutral-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 tracking-wider">END TIME</label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 bg-neutral-800 border-neutral-600 text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={weekdaysOnly}
                  onChange={(e) => setWeekdaysOnly(e.target.checked)}
                  className="accent-orange-500"
                />
                Only active on weekdays
              </label>
            </div>
          ) : (
            <div className="space-y-4 border border-neutral-700 rounded p-4">
              <div className="text-sm text-neutral-400">
                Start and stop automatically based on usage and idle behavior.
              </div>
              <div>
                <label className="text-xs text-neutral-400 tracking-wider">IDLE AUTO-OFF RULE (MINUTES)</label>
                <Input
                  type="number"
                  min="1"
                  value={idleMinutes}
                  onChange={(e) => setIdleMinutes(e.target.value)}
                  className="mt-1 bg-neutral-800 border-neutral-600 text-white"
                />
              </div>
              <div className="text-sm text-neutral-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                If no activity for <span className="font-mono">{idleMinutes}</span> minutes {"->"} turn off
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">CALENDAR OF SCHEDULED EVENTS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingEvents.map((dayBlock) => (
            <div key={dayBlock.day} className="border border-neutral-700 rounded p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-white font-medium">
                  <CalendarDays className="w-4 h-4 text-orange-500" />
                  {dayBlock.day}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeScheduledDay(dayBlock.day)}
                  className="text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Schedule
                </Button>
              </div>
              <div className="space-y-2">
                {dayBlock.events.map((event) => (
                  <div key={event.id} className="text-sm">
                    <span className="text-neutral-300 font-mono">{event.time}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
