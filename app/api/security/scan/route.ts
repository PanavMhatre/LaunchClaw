import { exec as execCb } from "child_process"
import fs from "fs/promises"
import path from "path"
import { promisify } from "util"
import { NextResponse } from "next/server"

const execAsync = promisify(execCb)

const MAX_FILES_TO_SCAN = 500
const SCAN_DIRECTORIES = ["app", "components", "hooks", "lib"]
const CODE_FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".md", ".json", ".yml", ".yaml"])
const IGNORE_DIRECTORIES = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"])

const suspiciousPatterns = [
  { label: "destructive delete", regex: /rm\s+-rf\s+\/?/i },
  { label: "shell pipe execution", regex: /curl\s+[^\n]*\|\s*(sh|bash)/i },
  { label: "dynamic eval", regex: /\beval\s*\(/i },
  { label: "base64 command decode", regex: /base64\s+(-d|--decode)/i },
  { label: "spawned shell", regex: /child_process\.(exec|spawn)\s*\(/i },
]

function getStatusFromFindings(findingsCount: number): "safe" | "warning" {
  return findingsCount > 0 ? "warning" : "safe"
}

async function walkFiles(startDir: string) {
  const results: string[] = []

  async function walk(currentDir: string) {
    if (results.length >= MAX_FILES_TO_SCAN) return

    let entries: Awaited<ReturnType<typeof fs.readdir>>
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (results.length >= MAX_FILES_TO_SCAN) return

      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        if (!IGNORE_DIRECTORIES.has(entry.name)) {
          await walk(fullPath)
        }
        continue
      }

      if (!entry.isFile()) continue
      const ext = path.extname(entry.name).toLowerCase()
      if (CODE_FILE_EXTENSIONS.has(ext) || entry.name === "SKILL.md") {
        results.push(fullPath)
      }
    }
  }

  await walk(startDir)
  return results
}

async function scanSkillFiles(rootDir: string) {
  const files = await walkFiles(rootDir)
  const skillFiles = files.filter((file) => path.basename(file) === "SKILL.md")

  const results: Array<{ file: string; status: "safe" | "warning"; findings: string[] }> = []

  for (const file of skillFiles) {
    const relativePath = path.relative(rootDir, file)
    let content = ""
    try {
      content = await fs.readFile(file, "utf8")
    } catch {
      results.push({
        file: relativePath,
        status: "warning",
        findings: ["failed to read file"],
      })
      continue
    }

    const findings = suspiciousPatterns.filter((pattern) => pattern.regex.test(content)).map((pattern) => pattern.label)

    results.push({
      file: relativePath,
      status: getStatusFromFindings(findings.length),
      findings,
    })
  }

  const warningCount = results.filter((result) => result.status === "warning").length

  return {
    scannedAt: new Date().toISOString(),
    total: results.length,
    safe: results.length - warningCount,
    warning: warningCount,
    results,
  }
}

async function scanAgenticWorkflows(rootDir: string) {
  const findings: string[] = []
  const scannedFiles: string[] = []

  for (const directory of SCAN_DIRECTORIES) {
    const fullDir = path.join(rootDir, directory)
    const files = await walkFiles(fullDir)

    for (const file of files) {
      scannedFiles.push(file)
      let content = ""
      try {
        content = await fs.readFile(file, "utf8")
      } catch {
        continue
      }

      for (const pattern of suspiciousPatterns) {
        if (pattern.regex.test(content)) {
          findings.push(`${path.relative(rootDir, file)} -> ${pattern.label}`)
        }
      }
    }
  }

  return {
    status: findings.length > 0 ? "warning" : "safe",
    scannedFiles: scannedFiles.length,
    issues: findings.slice(0, 20),
  }
}

async function scanApiSurface(rootDir: string) {
  const files: string[] = []

  for (const directory of SCAN_DIRECTORIES) {
    const fullDir = path.join(rootDir, directory)
    files.push(...(await walkFiles(fullDir)))
  }

  const domains = new Set<string>()
  const riskyDomains = new Set<string>()
  const urlRegex = /https?:\/\/[^\s"')`]+/g

  for (const file of files) {
    let content = ""
    try {
      content = await fs.readFile(file, "utf8")
    } catch {
      continue
    }

    const matches = content.match(urlRegex) ?? []
    for (const match of matches) {
      try {
        const url = new URL(match)
        domains.add(url.hostname)

        if (
          url.hostname.includes("ngrok") ||
          url.hostname.includes("local") ||
          url.hostname.includes("example")
        ) {
          riskyDomains.add(url.hostname)
        }
      } catch {
        // Ignore malformed URL-like text.
      }
    }
  }

  return {
    status: riskyDomains.size > 0 ? "warning" : "safe",
    externalDomains: Array.from(domains).sort(),
    riskyDomains: Array.from(riskyDomains).sort(),
  }
}

async function scanDockerState(rootDir: string) {
  const dockerfilePath = path.join(rootDir, "Dockerfile")
  const dockerComposePath = path.join(rootDir, "docker-compose.yml")
  const dockerComposeAltPath = path.join(rootDir, "docker-compose.yaml")

  const hasDockerfile = await fs
    .access(dockerfilePath)
    .then(() => true)
    .catch(() => false)

  const hasCompose = (await fs
    .access(dockerComposePath)
    .then(() => true)
    .catch(() => false)) ||
    (await fs
      .access(dockerComposeAltPath)
      .then(() => true)
      .catch(() => false))

  let engineReachable = false
  let engineVersion = ""

  try {
    const { stdout } = await execAsync("docker version --format '{{.Server.Version}}'", { timeout: 3000 })
    const version = stdout.trim()
    if (version) {
      engineReachable = true
      engineVersion = version
    }
  } catch {
    engineReachable = false
  }

  const status = hasDockerfile || hasCompose ? (engineReachable ? "safe" : "warning") : "info"

  return {
    status,
    dockerfile: hasDockerfile,
    compose: hasCompose,
    engineReachable,
    engineVersion,
    details: engineReachable
      ? `Docker engine reachable (${engineVersion}).`
      : "Docker engine not reachable from runtime.",
  }
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const rootDir = process.cwd()

  const [skills, workflows, apis, docker] = await Promise.all([
    scanSkillFiles(rootDir),
    scanAgenticWorkflows(rootDir),
    scanApiSurface(rootDir),
    scanDockerState(rootDir),
  ])

  return NextResponse.json(
    {
      scannedAt: new Date().toISOString(),
      skills,
      workflows,
      apis,
      docker,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
