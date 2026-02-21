"use client"

import { type MouseEvent, useState } from "react"
import Link from "next/link"
import { ArrowRight, Bot, ShieldCheck, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const highlights = [
  {
    title: "Autonomous Control",
    description: "Run LaunchClaw agents with direct controls, scheduling, and real-time state visibility.",
    icon: Bot,
  },
  {
    title: "Secure Operations",
    description: "Password-protected access and integrated safety checks across skills, APIs, and workflows.",
    icon: ShieldCheck,
  },
  {
    title: "Connected Workflows",
    description: "Link agents to tools like Slack, Gmail, Github, Google Calendar, and Twitter.",
    icon: Workflow,
  },
]

export default function LandingPage() {
  const [glowPosition, setGlowPosition] = useState({ x: 24, y: 20 })

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setGlowPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setGlowPosition({ x: 24, y: 20 })
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-black text-white"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute h-96 w-96 rounded-full bg-orange-500/25 blur-3xl transition-all duration-200 ease-out"
          style={{
            left: `calc(${glowPosition.x}% - 12rem)`,
            top: `calc(${glowPosition.y}% - 12rem)`,
          }}
        />
        <div className="absolute -right-20 bottom-0 h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80" />
      </div>

      <div className="relative z-10 px-6 py-10 md:px-10">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          <section className="rounded-2xl border border-neutral-700/80 bg-neutral-900/75 p-8 backdrop-blur-sm md:p-10">
            <p className="text-xs tracking-[0.2em] text-orange-400">Afore Hacks</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-5xl">LaunchClaw</h1>
            <div className="mt-6">
              <Button asChild className="h-11 px-5 bg-orange-500 hover:bg-orange-600 text-white">
                <Link href="/agents" className="inline-flex items-center gap-2">
                  Try Here
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {highlights.map((item) => (
              <Card key={item.title} className="border-neutral-700 bg-neutral-900/75 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700 bg-neutral-800">
                    <item.icon className="h-4 w-4 text-orange-500" />
                  </div>
                  <CardTitle className="text-sm font-semibold tracking-wide text-white">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-300">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
