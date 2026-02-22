"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Loader2, Mic, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatMessage = { role: "assistant" | "user" | "system"; text: string }

type ChatStatus = "idle" | "initializing" | "ready" | "streaming" | "error" | "paused" | "stopped"

type CommandCenterProps = { agentId?: string }

type AgentListRow = { id: string; status: string }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveApiAgentId(rawAgentId: string): Promise<string> {
  if (UUID_REGEX.test(rawAgentId)) return rawAgentId

  const legacyMatch = rawAgentId.match(/^agent-(\d{2})$/i)
  if (!legacyMatch) {
    throw new Error("Invalid agent id format.")
  }

  const slotIndex = Math.max(0, Number.parseInt(legacyMatch[1], 10) - 1)
  const res = await fetch("/api/v1/agents", { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to list agents (${res.status}).`)

  const data = (await res.json()) as { agents?: AgentListRow[] }
  const all = Array.isArray(data.agents) ? data.agents : []
  if (all.length === 0) throw new Error("No API v1 agents found.")

  const online = all.filter((a) => a.status === "online")
  const ordered = online.length > 0 ? online : all
  return ordered[slotIndex]?.id ?? ordered[0].id
}

async function createSession(apiAgentId: string): Promise<string> {
  const res = await fetch(`/api/v1/agents/${apiAgentId}/chat/sessions`, {
    method: "POST",
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Failed to create session (${res.status}).`)
  }
  const data = (await res.json()) as { session_id?: string }
  if (!data.session_id) throw new Error("Session id missing from response.")
  return data.session_id
}

function getWsUrl(agentId: string, sessionId: string): string {
  if (typeof window === "undefined") return ""
  const wsPort = 8080
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const host = window.location.hostname
  return `${protocol}//${host}:${wsPort}/ws/chat?agent_id=${agentId}&session_id=${sessionId}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommandCenterPage({ agentId = "" }: CommandCenterProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "OpenClaw Agent online. Share your objective and I will coordinate the next action set." },
  ])
  const [draft, setDraft] = useState("")
  const [chatStatus, setChatStatus] = useState<ChatStatus>("idle")
  const [initError, setInitError] = useState("")
  const [useWebSocket, setUseWebSocket] = useState(true)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sessionRef = useRef<string>("")
  const apiIdRef = useRef<string>("")
  const abortRef = useRef<AbortController | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const assistantBufferRef = useRef<string>("")

  const hasText = draft.trim().length > 0

  // Auto-scroll when messages change
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // -------------------------------------------------------------------------
  // WebSocket connection
  // -------------------------------------------------------------------------

  const connectWebSocket = useCallback(() => {
    const id = apiIdRef.current
    const sess = sessionRef.current
    if (!id || !sess) return

    const url = getWsUrl(id, sess)
    const ws = new WebSocket(url)

    ws.onopen = () => {
      console.log("[chat-ws] connected")
      setChatStatus("ready")
      setUseWebSocket(true)
    }

    ws.onmessage = (event) => {
      let msg: { type: string; text?: string; message?: string; reason?: string }
      try {
        msg = JSON.parse(event.data as string)
      } catch {
        return
      }

      switch (msg.type) {
        case "assistant_delta":
          assistantBufferRef.current += msg.text ?? ""
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last?.role === "assistant") {
              return [...prev.slice(0, -1), { role: "assistant", text: assistantBufferRef.current }]
            }
            return [...prev, { role: "assistant", text: assistantBufferRef.current }]
          })
          setChatStatus("streaming")
          break

        case "assistant_done":
          assistantBufferRef.current = ""
          setChatStatus("ready")
          break

        case "error":
          setMessages((prev) => [
            ...prev,
            { role: "system", text: `Error: ${msg.message ?? "Unknown error"}` },
          ])
          setChatStatus("ready")
          break

        case "paused":
          setMessages((prev) => [
            ...prev,
            { role: "system", text: `Agent paused${msg.reason ? `: ${msg.reason}` : ""}` },
          ])
          setChatStatus("paused")
          break

        case "stopped":
          setMessages((prev) => [
            ...prev,
            { role: "system", text: "Agent has been stopped." },
          ])
          setChatStatus("stopped")
          break
      }
    }

    ws.onclose = (event) => {
      console.log(`[chat-ws] closed code=${event.code} reason=${event.reason}`)
      wsRef.current = null

      // If close code indicates server-side rejection, fall back to HTTP
      if (event.code === 4009 || event.code === 1006) {
        console.log("[chat-ws] falling back to HTTP SSE")
        setUseWebSocket(false)
        setChatStatus("ready")
      } else if (event.code === 4003) {
        // Agent paused or stopped
        setChatStatus(event.reason?.includes("stopped") ? "stopped" : "paused")
      } else if (event.code === 4001 || event.code === 4004) {
        setInitError(event.reason || "Session or agent not found")
        setChatStatus("error")
      }
    }

    ws.onerror = () => {
      console.log("[chat-ws] error, will fall back to HTTP SSE")
    }

    wsRef.current = ws
  }, [])

  // -------------------------------------------------------------------------
  // Initialize session on mount
  // -------------------------------------------------------------------------

  const initSession = useCallback(async () => {
    if (!agentId) {
      setInitError("No agent selected. Open the dashboard from an agent card first.")
      return
    }

    setChatStatus("initializing")
    setInitError("")

    try {
      const resolvedId = await resolveApiAgentId(agentId)
      apiIdRef.current = resolvedId

      const sessId = await createSession(resolvedId)
      sessionRef.current = sessId

      // Try WebSocket first
      connectWebSocket()

      // If WS doesn't connect in 3 seconds, fall back to HTTP
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log("[chat] WS not connected after timeout, using HTTP SSE")
          setUseWebSocket(false)
          setChatStatus("ready")
        }
      }, 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initialize chat."
      setInitError(msg)
      setChatStatus("error")
    }
  }, [agentId, connectWebSocket])

  useEffect(() => {
    void initSession()
    return () => {
      abortRef.current?.abort()
      wsRef.current?.close()
    }
  }, [initSession])

  // -------------------------------------------------------------------------
  // Send message — WebSocket or HTTP SSE
  // -------------------------------------------------------------------------

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }

  const handleSendWs = (content: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // Fall back to HTTP
      setUseWebSocket(false)
      void handleSendHttp(content)
      return
    }

    const userMsg: ChatMessage = { role: "user", text: content }
    setMessages((prev) => [...prev, userMsg])
    setDraft("")
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) el.style.height = "44px"
    })

    // Add blank assistant message for streaming
    assistantBufferRef.current = ""
    setMessages((prev) => [...prev, { role: "assistant", text: "" }])
    setChatStatus("streaming")

    ws.send(JSON.stringify({ type: "user_message", text: content }))
  }

  const handleSendHttp = async (content: string) => {
    // If session isn't ready, try to re-initialize
    if (!sessionRef.current || !apiIdRef.current) {
      await initSession()
      if (!sessionRef.current || !apiIdRef.current) {
        setMessages((prev) => [
          ...prev,
          { role: "system", text: "Cannot send — session not initialized. Check configuration." },
        ])
        return
      }
    }

    const userMsg: ChatMessage = { role: "user", text: content }
    setMessages((prev) => [...prev, userMsg])
    setDraft("")
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) el.style.height = "44px"
    })

    // Build history from existing messages
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.text }))

    setChatStatus("streaming")
    setMessages((prev) => [...prev, { role: "assistant", text: "" }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(
        `/api/v1/agents/${apiIdRef.current}/chat/sessions/${sessionRef.current}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content, history }),
          signal: controller.signal,
        },
      )

      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        const errMsg = errBody?.error ?? `Request failed (${res.status}).`
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === "assistant" && last.text === "") {
            return [...prev.slice(0, -1), { role: "system", text: `Error: ${errMsg}` }]
          }
          return [...prev, { role: "system", text: `Error: ${errMsg}` }]
        })
        setChatStatus("ready")
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "system", text: "Error: No response stream." },
        ])
        setChatStatus("ready")
        return
      }

      const decoder = new TextDecoder()
      let assistantText = ""
      let leftover = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = leftover + decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")
        leftover = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6).trim()
          if (payload === "[DONE]") continue

          try {
            const parsed = JSON.parse(payload)
            const delta = parsed.choices?.[0]?.delta?.content
            if (typeof delta === "string") {
              assistantText += delta
              const snapshot = assistantText
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", text: snapshot },
              ])
            }
          } catch {
            // skip
          }
        }
      }

      // Process remaining
      if (leftover.startsWith("data: ")) {
        const payload = leftover.slice(6).trim()
        if (payload !== "[DONE]") {
          try {
            const parsed = JSON.parse(payload)
            const delta = parsed.choices?.[0]?.delta?.content
            if (typeof delta === "string") {
              assistantText += delta
            }
          } catch {
            // skip
          }
        }
      }

      if (!assistantText) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", text: "(No response from agent.)" },
        ])
      } else {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", text: assistantText },
        ])
      }

      setChatStatus("ready")
    } catch (err) {
      if (controller.signal.aborted) return
      const msg = err instanceof Error ? err.message : "Request failed."
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === "assistant" && last.text === "") {
          return [...prev.slice(0, -1), { role: "system", text: `Error: ${msg}` }]
        }
        return [...prev, { role: "system", text: `Error: ${msg}` }]
      })
      setChatStatus("ready")
    } finally {
      abortRef.current = null
    }
  }

  const handleSend = async () => {
    const content = draft.trim()
    if (!content) return
    if (chatStatus === "streaming") return

    if (useWebSocket && wsRef.current?.readyState === WebSocket.OPEN) {
      handleSendWs(content)
    } else {
      await handleSendHttp(content)
    }
  }

  // -------------------------------------------------------------------------
  // Status indicator
  // -------------------------------------------------------------------------

  const statusIndicator = () => {
    switch (chatStatus) {
      case "initializing":
        return (
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>INITIALIZING</span>
          </div>
        )
      case "ready":
        return (
          <div className="flex items-center gap-2 text-xs text-orange-500 font-medium">
            <Sparkles className="w-4 h-4" />
            <span>{useWebSocket ? "READY (WS)" : "READY (HTTP)"}</span>
          </div>
        )
      case "streaming":
        return (
          <div className="flex items-center gap-2 text-xs text-orange-500 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>STREAMING</span>
          </div>
        )
      case "paused":
        return (
          <div className="flex items-center gap-2 text-xs text-yellow-500 font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>PAUSED</span>
          </div>
        )
      case "stopped":
        return (
          <div className="flex items-center gap-2 text-xs text-red-400 font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>STOPPED</span>
          </div>
        )
      case "error":
        return (
          <button
            onClick={() => void initSession()}
            className="flex items-center gap-2 text-xs text-red-400 font-medium hover:text-red-300 transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            <span>RETRY</span>
          </button>
        )
      default:
        return (
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
            <Sparkles className="w-4 h-4" />
            <span>IDLE</span>
          </div>
        )
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="h-[calc(100vh-4rem)] p-4 md:p-5">
      <Card className="w-full h-full max-w-7xl mx-auto bg-neutral-900 border-neutral-700 shadow-2xl flex flex-col overflow-hidden">
        <CardHeader className="border-b border-neutral-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white tracking-wider">CHAT</CardTitle>
              <p className="text-xs text-neutral-400 mt-1">Secure assistant channel</p>
            </div>
            {statusIndicator()}
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          {initError && (
            <div className="mx-5 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {initError}
            </div>
          )}

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    message.role === "assistant"
                      ? "bg-neutral-800 border border-neutral-700 text-neutral-100"
                      : message.role === "user"
                        ? "bg-orange-500 text-white"
                        : "bg-neutral-800/50 border border-dashed border-neutral-700 text-neutral-400 italic text-xs"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-800 p-4">
            <div className="rounded-2xl border border-neutral-700 bg-neutral-800 p-3">
              <Textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  autoResize()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
                placeholder="Type your message..."
                className="min-h-[44px] max-h-[180px] resize-none overflow-y-auto bg-transparent border-0 px-1 py-0 text-white placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button className="h-10 px-4 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 text-white">
                  <Mic className="w-4 h-4 mr-2" />
                  Voice AI
                </Button>
                <Button
                  onClick={() => void handleSend()}
                  disabled={chatStatus === "initializing" || chatStatus === "streaming" || chatStatus === "paused" || chatStatus === "stopped"}
                  className={`h-10 ${
                    hasText ? "w-10 p-0 rounded-full" : "w-16 px-3 rounded-md"
                  } bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50`}
                >
                  {hasText ? <Send className="w-4 h-4" /> : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
