"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, BarChart3, Coins, Power, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const usageHistory = [120, 140, 165, 190, 175, 220, 260, 240, 280, 320, 300, 340]
const runtimeHistory24h = [20, 28, 24, 36, 42, 33, 31, 45, 39, 41, 37, 34]

export default function SystemsPage() {
  const [budgetLimit, setBudgetLimit] = useState(500)
  const [draftBudgetLimit, setDraftBudgetLimit] = useState("500")
  const [autoShutdown, setAutoShutdown] = useState(true)

  const sessionTokenUsage = 340
  const totalUsageSinceLaunch = 18240

  const usagePercent = useMemo(() => {
    if (budgetLimit <= 0) return 100
    return Math.min((sessionTokenUsage / budgetLimit) * 100, 100)
  }, [budgetLimit, sessionTokenUsage])

  const remainingTokens = Math.max(budgetLimit - sessionTokenUsage, 0)
  const remainingPercent = Math.max(100 - usagePercent, 0)

  const alertState = useMemo(() => {
    if (usagePercent >= 95) {
      return {
        label: "Critical",
        message: "Usage has reached emergency range. Immediate control action required.",
        className: "bg-red-500/20 text-red-400",
        iconClassName: "text-red-400",
        stage: "Stage 4/4",
      }
    }

    if (usagePercent >= 90) {
      return {
        label: "Warning",
        message: "Usage is approaching the limit quickly. Guardrails should be tightened now.",
        className: "bg-orange-500/20 text-orange-400",
        iconClassName: "text-orange-400",
        stage: "Stage 3/4",
      }
    }

    if (usagePercent >= 70) {
      return {
        label: "Watch",
        message: "Usage is climbing. Monitor closely and validate session efficiency.",
        className: "bg-orange-500/20 text-orange-300",
        iconClassName: "text-orange-300",
        stage: "Stage 2/4",
      }
    }

    return {
      label: "Healthy",
      message: "Usage is within target budget. Cost posture is acceptable.",
      className: "bg-white/20 text-white",
      iconClassName: "text-white",
      stage: "Stage 1/4",
    }
  }, [usagePercent])

  const isCostingTooMuch = usagePercent >= 90

  const applyBudgetLimit = () => {
    const parsed = Number.parseInt(draftBudgetLimit, 10)
    if (!Number.isNaN(parsed) && parsed > 0) {
      setBudgetLimit(parsed)
    }
  }

  const dailyLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (11 - index))
      return formatter.format(date)
    })
  }, [])

  const dailyUsageData = dailyLabels.map((label, index) => ({
    label,
    tokens: usageHistory[index],
  }))

  const runtimeUsageData = runtimeHistory24h.map((tokens, index) => ({
    label: `${index * 2}h`,
    tokens,
  }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">USAGE GOVERNANCE</h1>
          <p className="text-sm text-neutral-400">Cost, budget controls, and investor-facing spend posture</p>
        </div>
        <Badge className={`${isCostingTooMuch ? "bg-orange-500/20 text-orange-400" : "bg-white/20 text-white"} px-3 py-1`}>
          {isCostingTooMuch ? "COST RISK: HIGH" : "COST RISK: CONTROLLED"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">SESSION TOKEN USAGE</p>
                <p className="text-2xl font-bold text-white font-mono">{sessionTokenUsage}</p>
              </div>
              <Coins className="w-8 h-8 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">TOTAL SINCE LAUNCH</p>
                <p className="text-2xl font-bold text-white font-mono">{totalUsageSinceLaunch.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">BUDGET LIMIT</p>
                <p className="text-2xl font-bold text-white font-mono">{budgetLimit.toLocaleString()}</p>
              </div>
              <ShieldAlert className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">SPEND ALERT STATUS</p>
                <p className="text-2xl font-bold text-white font-mono">{alertState.label.toUpperCase()}</p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${alertState.iconClassName}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 bg-neutral-900 border-neutral-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">TOKEN USAGE - PAST 12 DAYS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-56 rounded border border-neutral-800 bg-neutral-950/40 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyUsageData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#3f3f46" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#a3a3a3", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#a3a3a3", fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", color: "#fff" }}
                    labelStyle={{ color: "#d4d4d4" }}
                    formatter={(value: number) => [`${value} tokens`, "Usage"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="#f97316"
                    strokeWidth={2}
                    fill="url(#usageGradient)"
                    dot={{ r: 2, fill: "#fb923c" }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="border-t border-neutral-700 pt-5">
              <p className="text-xs text-neutral-400 tracking-wider mb-3">24/7 AGENT RUNTIME TOKEN ACTIVITY (LAST 24H)</p>
              <div className="h-36 rounded border border-neutral-800 bg-neutral-950/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={runtimeUsageData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="runtimeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb923c" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#fb923c" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#3f3f46" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#a3a3a3", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#a3a3a3", fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", color: "#fff" }}
                      labelStyle={{ color: "#d4d4d4" }}
                      formatter={(value: number) => [`${value} tokens`, "Runtime"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="tokens"
                      stroke="#fb923c"
                      strokeWidth={2}
                      fill="url(#runtimeGradient)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">BUDGET CONTROLS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs text-neutral-400 tracking-wider">MAX TOKENS PER SESSION</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={draftBudgetLimit}
                  onChange={(event) => setDraftBudgetLimit(event.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
                <Button onClick={applyBudgetLimit} className="bg-orange-500 hover:bg-orange-600 text-white">
                  Apply
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400 tracking-wider">
                <span>Current Limit Usage</span>
                <span className="font-mono text-white">{usagePercent.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-orange-500/70">
                <div className="h-full bg-white transition-all duration-300" style={{ width: `${usagePercent}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  <span>
                    Used: {sessionTokenUsage.toLocaleString()} ({usagePercent.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  <span>
                    Remaining: {remainingTokens.toLocaleString()} ({remainingPercent.toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded border border-neutral-700 bg-neutral-800/60 p-3">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">AUTO-SHUTDOWN AT THRESHOLD</p>
                <p className="text-xs text-neutral-500 mt-1">Stops new requests after budget is hit.</p>
              </div>
              <Switch checked={autoShutdown} onCheckedChange={setAutoShutdown} />
            </div>

            <div className="rounded border border-neutral-700 bg-neutral-800/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Power className="w-4 h-4 text-orange-400" />
                <p className="text-xs text-neutral-300 tracking-wider">SPEND ALERT STATUS</p>
              </div>
              <div className="flex items-center justify-between">
                <Badge className={alertState.className}>{alertState.label.toUpperCase()}</Badge>
                <span className="text-[11px] text-neutral-400">{alertState.stage}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-2">{alertState.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
