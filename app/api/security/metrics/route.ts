import fs from "fs/promises"
import os from "os"
import { NextResponse } from "next/server"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type CpuTotals = {
  idle: number
  total: number
}

function readCpuTotals(): CpuTotals {
  const cores = os.cpus()
  let idle = 0
  let total = 0

  for (const core of cores) {
    idle += core.times.idle
    total += core.times.user + core.times.nice + core.times.sys + core.times.irq + core.times.idle
  }

  return { idle, total }
}

async function getCpuUsagePercent() {
  const start = readCpuTotals()
  await sleep(120)
  const end = readCpuTotals()

  const idleDelta = end.idle - start.idle
  const totalDelta = end.total - start.total

  if (totalDelta <= 0) return 0
  const usage = (1 - idleDelta / totalDelta) * 100
  return Math.max(0, Math.min(100, usage))
}

async function getStorageUsage() {
  try {
    const stats = await fs.statfs(process.cwd())
    if (!stats) {
      return null
    }

    const blockSize = Number(stats.bsize)
    const totalBlocks = Number(stats.blocks)
    const availableBlocks = Number(stats.bavail)
    if (!Number.isFinite(blockSize) || !Number.isFinite(totalBlocks) || !Number.isFinite(availableBlocks)) {
      return null
    }

    const totalBytes = blockSize * totalBlocks
    const availableBytes = blockSize * availableBlocks
    const usedBytes = Math.max(0, totalBytes - availableBytes)
    const capacityPercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0

    if (!Number.isFinite(totalBytes) || !Number.isFinite(usedBytes) || !Number.isFinite(capacityPercent)) {
      return null
    }

    return {
      totalGb: totalBytes / (1024 ** 3),
      usedGb: usedBytes / (1024 ** 3),
      percent: capacityPercent,
    }
  } catch {
    return null
  }
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const cpuPercent = await getCpuUsagePercent()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const ramPercent = totalMem > 0 ? (usedMem / totalMem) * 100 : 0

  const storage = await getStorageUsage()

  return NextResponse.json(
    {
      cpuPercent,
      ramPercent,
      ramUsedGb: usedMem / (1024 ** 3),
      ramTotalGb: totalMem / (1024 ** 3),
      storagePercent: storage?.percent ?? 0,
      storageUsedGb: storage?.usedGb ?? 0,
      storageTotalGb: storage?.totalGb ?? 0,
      storageAvailable: Boolean(storage),
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
