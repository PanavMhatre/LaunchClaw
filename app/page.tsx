"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Monitor, Settings, Shield, Target, Bell, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import CommandCenterPage from "./command-center/page"
import OperationsPage from "./operations/page"
import IntelligencePage from "./intelligence/page"
import SystemsPage from "./systems/page"

export default function LaunchClawDashboard() {
  const [activeSection, setActiveSection] = useState("chat")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const updateViewport = () => setIsMobile(window.innerWidth < 768)
    updateViewport()
    window.addEventListener("resize", updateViewport)

    return () => window.removeEventListener("resize", updateViewport)
  }, [])
  const sections = [
    { id: "chat", icon: Monitor, label: "CHAT", component: <CommandCenterPage /> },
    { id: "security", icon: Shield, label: "SECURITY", component: <IntelligencePage /> },
    { id: "control", icon: Target, label: "CONTROL", component: <OperationsPage /> },
    { id: "usage", icon: Settings, label: "USAGE", component: <SystemsPage /> },
  ]
  const activeSectionConfig = sections.find((section) => section.id === activeSection) ?? sections[0]

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-16" : "w-72"} bg-neutral-900 border-r border-neutral-700 transition-all duration-300 ${isMobile ? "fixed z-50 h-full" : "relative h-auto"}`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <div className={`${sidebarCollapsed ? "hidden" : "block"}`}>
              <h1 className="text-orange-500 font-bold text-lg tracking-wider">LAUNCHCLAW</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-neutral-400 hover:text-orange-500"
            >
              <ChevronRight
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`}
              />
            </Button>
          </div>

          <nav className="space-y-2">
            {sections.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center p-3 rounded transition-colors ${
                  sidebarCollapsed ? "justify-center" : "gap-3"
                } ${
                  activeSection === item.id
                    ? "bg-orange-500 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="mt-8 p-4 bg-neutral-800 border border-neutral-700 rounded">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs text-white">SYSTEM ONLINE</span>
              </div>
              <div className="text-xs text-neutral-500">
                <div>UPTIME: 72:14:33</div>
                <div>AGENTS: 847 ACTIVE</div>
                <div>MISSIONS: 23 ONGOING</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {!sidebarCollapsed && isMobile && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarCollapsed(true)} />
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${!sidebarCollapsed ? "md:ml-0" : ""}`}>
        {/* Top Toolbar */}
        <div className="h-16 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="text-sm text-neutral-400">
              LAUNCHCLAW / <span className="text-orange-500">{activeSectionConfig.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-neutral-500">LAST UPDATE: 05/06/2025 20:00 UTC</div>
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-orange-500">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-orange-500">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">{activeSectionConfig.component}</div>
      </div>
    </div>
  )
}
