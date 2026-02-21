"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, RefreshCw, Shield, XCircle } from "lucide-react"

type MetricsResponse = {
  cpuPercent: number
  ramPercent: number
  ramUsedGb: number
  ramTotalGb: number
  storagePercent: number
  storageUsedGb: number
  storageTotalGb: number
  storageAvailable: boolean
  updatedAt: string
}

type SkillScanResult = {
  file: string
  status: "safe" | "warning"
  findings: string[]
}

type ScanResponse = {
  scannedAt: string
  skills: {
    scannedAt: string
    total: number
    safe: number
    warning: number
    results: SkillScanResult[]
  }
  workflows: {
    status: "safe" | "warning"
    scannedFiles: number
    issues: string[]
  }
  apis: {
    status: "safe" | "warning"
    externalDomains: string[]
    riskyDomains: string[]
  }
  docker: {
    status: "safe" | "warning" | "info"
    dockerfile: boolean
    compose: boolean
    engineReachable: boolean
    engineVersion: string
    details: string
  }
}

function StatusBadge({ status }: { status: "safe" | "warning" | "info" }) {
  if (status === "safe") {
    return <Badge className="bg-white/20 text-white">SAFE</Badge>
  }

  if (status === "warning") {
    return <Badge className="bg-red-500/20 text-red-500">WARNING</Badge>
  }

  return <Badge className="bg-neutral-500/20 text-neutral-300">INFO</Badge>
}

function ProgressBar({ value }: { value: number }) {
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0

  return (
    <div className="w-full bg-neutral-800 rounded-full h-2">
      <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${normalized}%` }} />
    </div>
  )
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--"
  return `${value.toFixed(1)}%`
}

function formatGb(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--"
  return `${value.toFixed(2)} GB`
}

function formatTime(value: string | null | undefined) {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  return date.toLocaleTimeString()
}

export default function IntelligencePage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState("")

  const [scanData, setScanData] = useState<ScanResponse | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState("")

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsError("")
      const response = await fetch("/api/security/metrics", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(`Metrics request failed with ${response.status}`)
      }

      const data: MetricsResponse = await response.json()
      setMetrics(data)
    } catch {
      setMetricsError("Unable to load live system usage metrics.")
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  const runScan = useCallback(async () => {
    try {
      setScanLoading(true)
      setScanError("")

      const response = await fetch("/api/security/scan", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(`Scan request failed with ${response.status}`)
      }

      const data: ScanResponse = await response.json()
      setScanData(data)
    } catch {
      setScanError("Unable to complete security scan.")
    } finally {
      setScanLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMetrics()
    void runScan()

    const intervalId = window.setInterval(() => {
      void fetchMetrics()
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [fetchMetrics, runScan])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">SECURITY CENTER</h1>
          <p className="text-sm text-neutral-400">Live resource usage and autonomous safety scanning</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => void fetchMetrics()}
            variant="outline"
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 bg-transparent"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Usage
          </Button>
          <Button onClick={() => void runScan()} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Shield className="w-4 h-4 mr-2" />
            Run Security Scan
          </Button>
        </div>
      </div>

      {metricsError && <div className="text-sm text-red-400">{metricsError}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 tracking-wider">CPU USAGE</p>
              <p className="text-lg font-bold text-white font-mono">
                {metricsLoading ? "--" : formatPercent(metrics?.cpuPercent)}
              </p>
            </div>
            <ProgressBar value={metrics?.cpuPercent ?? 0} />
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 tracking-wider">RAM USAGE</p>
              <p className="text-lg font-bold text-white font-mono">
                {metricsLoading ? "--" : formatPercent(metrics?.ramPercent)}
              </p>
            </div>
            <ProgressBar value={metrics?.ramPercent ?? 0} />
            {!metricsLoading && metrics && (
              <p className="text-xs text-neutral-500 font-mono">
                {formatGb(metrics.ramUsedGb)} / {formatGb(metrics.ramTotalGb)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 tracking-wider">STORAGE USAGE</p>
              <p className="text-lg font-bold text-white font-mono">
                {metricsLoading ? "--" : metrics?.storageAvailable ? formatPercent(metrics.storagePercent) : "N/A"}
              </p>
            </div>
            <ProgressBar value={metrics?.storagePercent ?? 0} />
            {!metricsLoading && metrics?.storageAvailable && (
              <p className="text-xs text-neutral-500 font-mono">
                {formatGb(metrics.storageUsedGb)} / {formatGb(metrics.storageTotalGb)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">SKILL FILE SAFETY SCAN</CardTitle>
            {scanData && (
              <div className="flex items-center gap-2 text-xs">
                <Badge className="bg-white/20 text-white">SAFE: {scanData.skills.safe}</Badge>
                <Badge className="bg-red-500/20 text-red-500">WARNING: {scanData.skills.warning}</Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {scanLoading && <p className="text-sm text-neutral-400">Scanning skill files...</p>}
          {scanError && <p className="text-sm text-red-400">{scanError}</p>}
          {!scanLoading && scanData && scanData.skills.total === 0 && (
            <p className="text-sm text-neutral-400">No `SKILL.md` files found to scan.</p>
          )}

          {!scanLoading && scanData && scanData.skills.total > 0 && (
            <div className="space-y-2">
              {scanData.skills.results.map((result) => (
                <div key={result.file} className="border border-neutral-700 rounded p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white font-mono">{result.file}</p>
                    <StatusBadge status={result.status} />
                  </div>
                  {result.findings.length > 0 && (
                    <div className="mt-2 text-xs text-red-400">
                      {result.findings.map((finding) => (
                        <p key={`${result.file}-${finding}`}>- {finding}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">
            AGENTIC WORKFLOWS, APIS, AND DOCKER SCAN
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="border border-neutral-700 rounded p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-neutral-400 tracking-wider">WORKFLOWS</p>
              {scanData ? <StatusBadge status={scanData.workflows.status} /> : <Badge className="bg-neutral-800 text-neutral-300">PENDING</Badge>}
            </div>
            <p className="text-sm text-neutral-300">Scanned files: {scanData?.workflows.scannedFiles ?? 0}</p>
            {scanData?.workflows.issues.length ? (
              <div className="text-xs text-red-400 space-y-1 max-h-36 overflow-auto">
                {scanData.workflows.issues.map((issue) => (
                  <p key={issue}>- {issue}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No suspicious workflow patterns found.</p>
            )}
          </div>

          <div className="border border-neutral-700 rounded p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-neutral-400 tracking-wider">API SURFACE</p>
              {scanData ? <StatusBadge status={scanData.apis.status} /> : <Badge className="bg-neutral-800 text-neutral-300">PENDING</Badge>}
            </div>
            {scanData?.apis.externalDomains.length ? (
              <div className="text-xs text-neutral-300 space-y-1 max-h-32 overflow-auto">
                {scanData.apis.externalDomains.map((domain) => (
                  <p key={domain}>- {domain}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No external API domains detected.</p>
            )}
            {Boolean(scanData?.apis.riskyDomains.length) && (
              <div className="text-xs text-red-400 space-y-1">
                {scanData?.apis.riskyDomains.map((domain) => (
                  <p key={domain}>- flagged: {domain}</p>
                ))}
              </div>
            )}
          </div>

          <div className="border border-neutral-700 rounded p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-neutral-400 tracking-wider">DOCKER</p>
              {scanData ? <StatusBadge status={scanData.docker.status} /> : <Badge className="bg-neutral-800 text-neutral-300">PENDING</Badge>}
            </div>
            <p className="text-sm text-neutral-300">Dockerfile: {scanData?.docker.dockerfile ? "Found" : "Missing"}</p>
            <p className="text-sm text-neutral-300">Compose: {scanData?.docker.compose ? "Found" : "Missing"}</p>
            <p className="text-sm text-neutral-300">
              Engine: {scanData?.docker.engineReachable ? `Reachable (${scanData.docker.engineVersion || "version unknown"})` : "Not reachable"}
            </p>
            <p className="text-xs text-neutral-500">{scanData?.docker.details ?? "Waiting for scan..."}</p>
          </div>
        </CardContent>
      </Card>

      {metrics?.updatedAt && (
        <div className="text-xs text-neutral-500 flex items-center gap-2">
          <RefreshCw className="w-3 h-3" />
          Metrics updated: {formatTime(metrics.updatedAt)}
        </div>
      )}

      {scanData?.scannedAt && (
        <div className="text-xs text-neutral-500 flex items-center gap-2">
          {scanData.workflows.status === "safe" && scanData.apis.status === "safe" ? (
            <CheckCircle className="w-3 h-3 text-white" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-orange-500" />
          )}
          Last full scan: {new Date(scanData.scannedAt).toLocaleString()}
        </div>
      )}

      {scanError && (
        <div className="text-xs text-red-400 flex items-center gap-2">
          <XCircle className="w-3 h-3" />
          {scanError}
        </div>
      )}
    </div>
  )
}
