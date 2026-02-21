"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Grid3X3, Lock, Shield, Plus, Github, Slack, Twitter } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const ACCESS_PASSWORD = "launchclaw"
const MAX_AGENTS = 15
const AGENTS_STORAGE_KEY = "launchclaw.agents.v1"

function GmailLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path d="M3 7.5v9.8A1.7 1.7 0 0 0 4.7 19h1.4V10L12 14l5.9-4v9h1.4a1.7 1.7 0 0 0 1.7-1.7V7.5L12 13 3 7.5Z" fill="#EA4335" />
      <path d="M3 7.5 12 13l9-5.5v-1A1.7 1.7 0 0 0 19.3 5H4.7A1.7 1.7 0 0 0 3 6.5v1Z" fill="#FFFFFF" />
      <path d="M3 7.5 7 10.1V19H4.7A1.7 1.7 0 0 1 3 17.3V7.5Z" fill="#34A853" />
      <path d="M21 7.5 17 10.1V19h2.3a1.7 1.7 0 0 0 1.7-1.7V7.5Z" fill="#4285F4" />
      <path d="M7 10.1 12 14l5-3.9V19H7v-8.9Z" fill="#FBBC05" />
    </svg>
  )
}

function GoogleCalendarLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="3" fill="#FFFFFF" />
      <rect x="3" y="4" width="18" height="5" rx="3" fill="#1A73E8" />
      <rect x="7" y="3" width="2" height="4" rx="1" fill="#1A73E8" />
      <rect x="15" y="3" width="2" height="4" rx="1" fill="#1A73E8" />
      <rect x="8" y="11" width="8" height="7" rx="1.5" fill="#34A853" />
    </svg>
  )
}

type ConnectionOption = {
  id: string
  label: string
  icon: JSX.Element
}

const AVAILABLE_CONNECTIONS: ConnectionOption[] = [
  { id: "slack", label: "Slack", icon: <Slack className="w-4 h-4 text-[#E01E5A]" /> },
  { id: "gmail", label: "Gmail", icon: <GmailLogo /> },
  { id: "github", label: "Github", icon: <Github className="w-4 h-4 text-white" /> },
  { id: "google-calendar", label: "Google Calendar", icon: <GoogleCalendarLogo /> },
  { id: "twitter", label: "Twitter", icon: <Twitter className="w-4 h-4 text-[#1DA1F2]" /> },
]

type Agent = {
  id: string
  name: string
  status: "ONLINE"
  password: string
  connections: string[]
}

const INITIAL_AGENTS = [
  { id: "agent-01", name: "AGENT 01", status: "ONLINE", password: ACCESS_PASSWORD, connections: [] },
  { id: "agent-02", name: "AGENT 02", status: "ONLINE", password: ACCESS_PASSWORD, connections: [] },
  { id: "agent-03", name: "AGENT 03", status: "ONLINE", password: ACCESS_PASSWORD, connections: [] },
  { id: "agent-04", name: "AGENT 04", status: "ONLINE", password: ACCESS_PASSWORD, connections: [] },
  { id: "agent-05", name: "AGENT 05", status: "ONLINE", password: ACCESS_PASSWORD, connections: [] },
]

export default function HomePage() {
  const router = useRouter()

  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS)
  const [hasLoadedAgents, setHasLoadedAgents] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false)
  const [isConnectionsMenuOpen, setIsConnectionsMenuOpen] = useState(false)
  const [newAgentConnections, setNewAgentConnections] = useState<string[]>([])
  const [newAgentPassword, setNewAgentPassword] = useState("")
  const [addAgentError, setAddAgentError] = useState("")
  const [selectedModel, setSelectedModel] = useState("MiniMax M2.5")

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const storedAgents = window.localStorage.getItem(AGENTS_STORAGE_KEY)
      if (storedAgents) {
        const parsedAgents = JSON.parse(storedAgents) as unknown
        if (Array.isArray(parsedAgents) && parsedAgents.length > 0) {
          const normalizedAgents = parsedAgents.flatMap((item) => {
            if (!item || typeof item !== "object") return []
            const candidate = item as Partial<Agent> & { connections?: unknown }
            if (
              typeof candidate.id !== "string" ||
              typeof candidate.name !== "string" ||
              candidate.status !== "ONLINE" ||
              typeof candidate.password !== "string"
            ) {
              return []
            }

            const connections = Array.isArray(candidate.connections)
              ? candidate.connections.filter((connection): connection is string => typeof connection === "string")
              : []
            return [
              {
                id: candidate.id,
                name: candidate.name,
                status: "ONLINE" as const,
                password: candidate.password,
                connections,
              },
            ]
          })

          if (normalizedAgents.length > 0) {
            setAgents(normalizedAgents)
          }
        }
      }
    } catch (error) {
      console.error("Failed to load stored agents:", error)
    } finally {
      setHasLoadedAgents(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedAgents) return

    try {
      window.localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents))
    } catch (error) {
      console.error("Failed to persist agents:", error)
    }
  }, [agents, hasLoadedAgents])

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? null

  const getNextAgentSlot = (currentAgents: Agent[]) => {
    const usedNumbers = new Set(
      currentAgents
        .map((agent) => Number.parseInt(agent.id.replace("agent-", ""), 10))
        .filter((value) => Number.isFinite(value)),
    )
    for (let i = 1; i <= MAX_AGENTS; i += 1) {
      if (!usedNumbers.has(i)) return i
    }
    return null
  }

  const openAddAgentPrompt = () => {
    if (agents.length >= MAX_AGENTS) return
    setIsAddAgentOpen(true)
    setIsConnectionsMenuOpen(false)
    setNewAgentConnections([])
    setNewAgentPassword("")
    setAddAgentError("")
  }

  const closeAddAgentPrompt = () => {
    setIsAddAgentOpen(false)
    setIsConnectionsMenuOpen(false)
    setNewAgentConnections([])
    setNewAgentPassword("")
    setAddAgentError("")
  }

  const toggleConnection = (connectionId: string) => {
    setNewAgentConnections((current) =>
      current.includes(connectionId) ? current.filter((id) => id !== connectionId) : [...current, connectionId],
    )
  }

  const addAgent = () => {
    if (agents.length >= MAX_AGENTS) return
    if (!newAgentPassword.trim()) {
      setAddAgentError("Password is required for new agent.")
      return
    }

    const nextSlot = getNextAgentSlot(agents)
    if (!nextSlot) {
      setAddAgentError("No agent slots available.")
      return
    }

    const paddedNumber = String(nextSlot).padStart(2, "0")
    const nextAgentId = `agent-${paddedNumber}`

    setAgents((current) => [
      ...current,
      {
        id: nextAgentId,
        name: `AGENT ${paddedNumber}`,
        status: "ONLINE",
        password: newAgentPassword,
        connections: newAgentConnections,
      },
    ])
    closeAddAgentPrompt()
  }

  const terminateAgent = (agentId: string) => {
    setAgents((current) => current.filter((agent) => agent.id !== agentId))

    if (selectedAgentId === agentId) {
      closePasswordPrompt()
    }
  }

  const openPasswordPrompt = (agentId: string) => {
    setSelectedAgentId(agentId)
    setPassword("")
    setAuthError("")
  }

  const closePasswordPrompt = () => {
    setSelectedAgentId(null)
    setPassword("")
    setAuthError("")
  }

  const unlockAgentDashboard = () => {
    if (!selectedAgent) return

    if (password !== selectedAgent.password) {
      setAuthError("Invalid password")
      return
    }

    router.push(`/dashboard?agent=${selectedAgent.id}`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-wider text-orange-500">LAUNCHCLAW</h1>
          <p className="text-sm text-neutral-400">Select an agent to access the control dashboard</p>
        </div>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">AGENT GRID (MAX 15)</CardTitle>
              <span className="text-xs text-neutral-400">
                RUNNING: <span className="text-white font-mono">{agents.length}/{MAX_AGENTS}</span>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="border border-neutral-700 rounded-lg p-4 bg-neutral-800 hover:border-orange-500/60 hover:bg-neutral-700 transition-colors text-left space-y-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="w-4 h-4 text-orange-500" />
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/20 text-white">{agent.status}</span>
                  </div>
                  <p className="text-sm font-medium tracking-wide text-white">{agent.name}</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openPasswordPrompt(agent.id)}
                      className="h-8 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Access
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => terminateAgent(agent.id)}
                      className="h-8 px-3 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                    >
                      Terminate
                    </Button>
                  </div>
                </div>
              ))}
              <button
                onClick={openAddAgentPrompt}
                disabled={agents.length >= MAX_AGENTS}
                className="border border-dashed border-neutral-600 rounded-lg p-4 bg-neutral-900 hover:border-orange-500/60 hover:bg-neutral-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between mb-2">
                  <Plus className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-700 text-neutral-300">ADD</span>
                </div>
                <p className="text-sm font-medium tracking-wide">
                  {agents.length >= MAX_AGENTS ? "MAX AGENTS REACHED" : "ADD AGENT"}
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">PREFERENCES</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="text-xs text-neutral-400 tracking-wider">MODEL</label>
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm text-white"
            >
              <option>MiniMax M2.5</option>
              <option>GPT-5.2</option>
              <option>Gemini 3 Pro</option>
              <option>DeepSeek V3.2</option>
              <option>Claude Opus 4.6</option>
              <option>GLM-5</option>
            </select>
            <p className="text-xs text-neutral-500">Selected model: {selectedModel}</p>
          </CardContent>
        </Card>
      </div>

      {selectedAgent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-neutral-900 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-white tracking-wider">Authenticate {selectedAgent.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-neutral-400 tracking-wider">PASSWORD</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        unlockAgentDashboard()
                      }
                    }}
                    className="pl-10 bg-neutral-800 border-neutral-600 text-white"
                    placeholder="Enter agent password"
                  />
                </div>
                {authError && <p className="text-xs text-red-400">{authError}</p>}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={closePasswordPrompt}
                  className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                >
                  Cancel
                </Button>
                <Button onClick={unlockAgentDashboard} className="bg-orange-500 hover:bg-orange-600 text-white">
                  Access Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isAddAgentOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-neutral-900 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-white tracking-wider">New Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-neutral-400 tracking-wider">CONNECTIONS</label>
                <button
                  type="button"
                  onClick={() => setIsConnectionsMenuOpen((current) => !current)}
                  className="w-full h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 flex items-center justify-between text-left hover:border-neutral-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm text-neutral-200">Apps</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 transition-transform ${isConnectionsMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isConnectionsMenuOpen && (
                  <div className="rounded-2xl border border-neutral-700 bg-neutral-800/80 p-2 space-y-1">
                    {AVAILABLE_CONNECTIONS.map((connection) => {
                      const isSelected = newAgentConnections.includes(connection.id)
                      return (
                        <div
                          key={connection.id}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                            isSelected ? "bg-neutral-700" : "hover:bg-neutral-700/70"
                          } transition-colors`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-600 bg-neutral-900">
                              {connection.icon}
                            </span>
                            <span className="text-sm text-neutral-100 truncate">{connection.label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleConnection(connection.id)}
                            className={`text-sm ${isSelected ? "text-green-400" : "text-neutral-300 hover:text-white"}`}
                          >
                            {isSelected ? "Connected" : "Connect"}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <p className="text-xs text-neutral-500">
                  {newAgentConnections.length > 0
                    ? `${newAgentConnections.length} connection${newAgentConnections.length > 1 ? "s" : ""} selected`
                    : "No connections selected yet"}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-neutral-400 tracking-wider">NEW AGENT PASSWORD</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="password"
                    value={newAgentPassword}
                    onChange={(event) => setNewAgentPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        addAgent()
                      }
                    }}
                    className="pl-10 bg-neutral-800 border-neutral-600 text-white"
                    placeholder="Set password for this agent"
                  />
                </div>
                {addAgentError && <p className="text-xs text-red-400">{addAgentError}</p>}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={closeAddAgentPrompt}
                  className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                >
                  Cancel
                </Button>
                <Button onClick={addAgent} className="bg-orange-500 hover:bg-orange-600 text-white">
                  Add Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
