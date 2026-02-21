"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ListChecks, User, Calendar, AlertTriangle } from "lucide-react"

type AgentReport = {
  id: string
  title: string
  agent: string
  time: string
  status: "success_request" | "unsuccess_request"
  summary: string
}

export default function LogsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReport, setSelectedReport] = useState<AgentReport | null>(null)

  const reports: AgentReport[] = [
    {
      id: "LOG-2025-001",
      title: "SLACK TRIAGE WORKFLOW",
      agent: "OPENCLAW",
      time: "2026-02-21 14:12 UTC",
      status: "success_request",
      summary:
        "OpenClaw monitored the #incidents Slack channel, grouped repeated alerts, and posted a concise triage summary with next actions for the on-call team.",
    },
    {
      id: "LOG-2025-002",
      title: "GMAIL INBOX ROUTING",
      agent: "OPENCLAW",
      time: "2026-02-21 13:47 UTC",
      status: "unsuccess_request",
      summary:
        "OpenClaw attempted to label and archive low-priority Gmail threads, but OAuth scope for write access was missing and the request failed safely.",
    },
    {
      id: "LOG-2025-003",
      title: "GITHUB ISSUE AUTOMATION",
      agent: "OPENCLAW",
      time: "2026-02-21 12:36 UTC",
      status: "unsuccess_request",
      summary:
        "OpenClaw scanned repository errors, drafted issue tickets, and attempted to assign owners; assignment step failed due to missing org-level permissions.",
    },
    {
      id: "LOG-2025-004",
      title: "GOOGLE CALENDAR PLANNER",
      agent: "OPENCLAW",
      time: "2026-02-21 11:18 UTC",
      status: "success_request",
      summary:
        "OpenClaw created a conflict-free standup block, added meeting context from notes, and updated attendee reminders in Google Calendar.",
    },
    {
      id: "LOG-2025-005",
      title: "TWITTER POST SCHEDULER",
      agent: "OPENCLAW",
      time: "2026-02-21 10:02 UTC",
      status: "unsuccess_request",
      summary:
        "OpenClaw generated a tweet thread draft and queued publishing, but API rate-limit guard was triggered so publishing was deferred.",
    },
  ]

  const getStatusColor = (status: AgentReport["status"]) => {
    switch (status) {
      case "success_request":
        return "bg-white/20 text-white"
      case "unsuccess_request":
        return "bg-red-500/20 text-red-500"
      default:
        return "bg-neutral-500/20 text-neutral-300"
    }
  }

  const filteredReports = reports.filter(
    (report) =>
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.summary.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">AGENT LOGS</h1>
          <p className="text-sm text-neutral-400">
            Simulated OpenClaw agent runs across Slack, Gmail, GitHub, Google Calendar, and Twitter
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-3xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search OpenClaw agent reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400"
              />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">AGENT REPORTS</p>
                <p className="text-2xl font-bold text-white font-mono">1,247</p>
              </div>
              <ListChecks className="w-8 h-8 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">UNSUCCESSFUL REQUEST</p>
                <p className="text-2xl font-bold text-orange-500 font-mono">12</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">AGENT REPORTS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="border border-neutral-700 rounded p-4 hover:border-orange-500/50 transition-colors cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <ListChecks className="w-5 h-5 text-neutral-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-white tracking-wider">{report.title}</h3>
                        <p className="text-xs text-neutral-400 font-mono">{report.id}</p>
                      </div>
                    </div>

                    <p className="text-sm text-neutral-300 ml-8">{report.summary}</p>

                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    <Badge className={getStatusColor(report.status)}>
                      {report.status === "success_request" ? "SUCCESS REQUEST" : "UNSUCCESS REQUEST"}
                    </Badge>

                    <div className="text-xs text-neutral-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span>{report.agent}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span className="font-mono">{report.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="bg-neutral-900 border-neutral-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-white tracking-wider">{selectedReport.title}</CardTitle>
                <p className="text-sm text-neutral-400 font-mono">{selectedReport.id}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setSelectedReport(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Agent:</span>
                    <span className="text-white font-mono">{selectedReport.agent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Time:</span>
                    <span className="text-white font-mono">{selectedReport.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Status:</span>
                    <Badge className={getStatusColor(selectedReport.status)}>
                      {selectedReport.status === "success_request" ? "SUCCESS REQUEST" : "UNSUCCESS REQUEST"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">ENTRY SUMMARY</h3>
                <p className="text-sm text-neutral-300 leading-relaxed">{selectedReport.summary}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
