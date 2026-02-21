"use client"

import { useRef, useState } from "react"
import { Mic, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

const initialMessages = [
  {
    role: "assistant",
    text: "LaunchClaw AI online. Share your objective and I will coordinate the next action set.",
  },
  {
    role: "user",
    text: "Summarize current system posture and flag critical anomalies.",
  },
  {
    role: "assistant",
    text: "Posture stable. Two anomaly clusters detected in access-control logs. I can generate a response plan now.",
  },
]

export default function CommandCenterPage() {
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const hasText = draft.trim().length > 0

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }

  const handleSend = () => {
    const content = draft.trim()
    if (!content) return
    setMessages((prev) => [...prev, { role: "user", text: content }])
    setDraft("")
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.style.height = "44px"
    })
  }

  return (
    <div className="h-[calc(100vh-4rem)] p-4 md:p-5">
      <Card className="w-full h-full max-w-7xl mx-auto bg-neutral-900 border-neutral-700 shadow-2xl flex flex-col overflow-hidden">
        <CardHeader className="border-b border-neutral-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white tracking-wider">CHAT</CardTitle>
              <p className="text-xs text-neutral-400 mt-1">Secure assistant channel</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-orange-500 font-medium">
              <Sparkles className="w-4 h-4" />
              <span>AI READY</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    message.role === "assistant"
                      ? "bg-neutral-800 border border-neutral-700 text-neutral-100"
                      : "bg-orange-500 text-white"
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
                    handleSend()
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
                  onClick={handleSend}
                  className={`h-10 ${
                    hasText ? "w-10 p-0 rounded-full" : "w-16 px-3 rounded-md"
                  } bg-orange-500 hover:bg-orange-600 text-white`}
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
