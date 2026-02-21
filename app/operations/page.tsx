"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { CalendarDays, Pause, Play, Power, RotateCcw, Clock3, Bot, Zap, Trash2 } from "lucide-react"

type ControlState = "running" | "paused" | "stopped"
type ScheduleMode = "specific" | "smart"
type ScheduleEvent = { id: string; time: string }
type ScheduleDayBlock = { day: string; events: ScheduleEvent[] }

export default function OperationsPage() {
  const [controlState, setControlState] = useState<ControlState>("running")
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("specific")

  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [weekdaysOnly, setWeekdaysOnly] = useState(true)
  const [idleMinutes, setIdleMinutes] = useState("20")

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

  const removeScheduledDay = (day: string) => {
    setUpcomingEvents((prev) => prev.filter((block) => block.day !== day))
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wider">CONTROL CENTER</h1>
        <p className="text-sm text-neutral-400">Manual controls, scheduling, and future run plan</p>
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
                onClick={() => setControlState("paused")}
                className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
              <Button
                onClick={() => setControlState("running")}
                variant="outline"
                className="border-white/30 text-white hover:bg-neutral-800 bg-transparent flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Resume
              </Button>
              <Button
                onClick={() => setControlState("stopped")}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent flex items-center gap-2"
              >
                <Power className="w-4 h-4" />
                Stop
              </Button>
              <Button
                onClick={() => setControlState("running")}
                variant="outline"
                className="border-neutral-600 text-neutral-200 hover:bg-neutral-800 bg-transparent flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Restart
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
                If no activity for <span className="font-mono">{idleMinutes}</span> minutes -> turn off
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
