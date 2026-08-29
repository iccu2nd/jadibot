import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const CACHE_DIR = path.join(process.cwd(), '.cache')

let ensured = false
function ensureCacheDir() {
    if (ensured) return
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    ensured = true
}

export function cacheFile(ext) {
    ensureCacheDir()
    const name = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`
    return path.join(CACHE_DIR, name)
}

export async function cleanupCacheFiles(paths) {
    const list = Array.isArray(paths) ? paths : [paths]
    await Promise.all(list.map(p => fs.promises.unlink(p).catch(() => {})))
}

const AUTO_SWEEP_INTERVAL_MS = 30 * 60 * 1000
const AUTO_SWEEP_MAX_AGE_MS = 60 * 60 * 1000

async function autoSweep() {
    try {
        ensureCacheDir()
        const entries = await fs.promises.readdir(CACHE_DIR, { withFileTypes: true })
        const now = Date.now()
        await Promise.all(entries.map(async entry => {
            if (!entry.isFile()) return
            const filePath = path.join(CACHE_DIR, entry.name)
            const stat = await fs.promises.stat(filePath).catch(() => null)
            if (!stat || now - stat.mtimeMs < AUTO_SWEEP_MAX_AGE_MS) return
            await fs.promises.unlink(filePath).catch(() => {})
        }))
    } catch {}
}

setInterval(() => { autoSweep() }, AUTO_SWEEP_INTERVAL_MS)
