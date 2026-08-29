import fs from 'fs/promises'
import path from 'path'
import { CACHE_DIR } from '../lib/cache.js'

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = Number(bytes)
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(2)} ${units[i]}`
}

async function dirSize(dir) {
  let total = 0
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) total += await dirSize(p)
      else {
        const stat = await fs.stat(p).catch(() => null)
        if (stat) total += stat.size
      }
    }
  } catch {}
  return total
}

async function pruneDatabase(sock) {
  const gd = global.db.data
  let removedUsers = 0, removedContacts = 0, removedLid = 0, removedChats = 0

  for (const jid of Object.keys(gd.users)) {
    const u = gd.users[jid]
    const isEmpty = !u.registered && !u.rpg && !u.owo && !u.premium && !u.banned &&
      !(u.money > 0) && !(u.warn > 0) && !(u.streak > 0) && u.afk === -1
    if (isEmpty) {
      delete gd.users[jid]
      removedUsers++
    }
  }

  for (const jid of Object.keys(gd.contacts)) {
    const c = gd.contacts[jid]
    if (!gd.users[jid] && (!c.pushname || c.pushname === 'null')) {
      delete gd.contacts[jid]
      removedContacts++
    }
  }

  for (const lid of Object.keys(gd.lid_mapping)) {
    const target = gd.lid_mapping[lid]
    if (!gd.users[target] && !gd.contacts[target]) {
      delete gd.lid_mapping[lid]
      removedLid++
    }
  }

  try {
    const groups = await sock.groupFetchAllParticipating()
    const activeGroupIds = Object.keys(groups)
    for (const jid of Object.keys(gd.chats)) {
      if (jid.endsWith('@g.us') && !activeGroupIds.includes(jid)) {
        delete gd.chats[jid]
        removedChats++
      }
    }
  } catch {}

  return { removedUsers, removedContacts, removedLid, removedChats }
}

const isPrunableSessionFile = (name) =>
  /^(pre-key|sender-key|session)-.*\.json$/i.test(name)

async function pruneSessionDir(dir, olderThanMs) {
  let freed = 0, removed = 0
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const now = Date.now()
    for (const entry of entries) {
      if (!entry.isFile() || !isPrunableSessionFile(entry.name)) continue
      const filePath = path.join(dir, entry.name)
      const stat = await fs.stat(filePath).catch(() => null)
      if (!stat || now - stat.mtimeMs < olderThanMs) continue
      freed += stat.size
      await fs.unlink(filePath).catch(() => {})
      removed++
    }
  } catch {}
  return { freed, removed }
}

async function pruneTmpDir(olderThanMs) {
  let freed = 0, removed = 0
  const dir = CACHE_DIR
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const now = Date.now()
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const filePath = path.join(dir, entry.name)
      const stat = await fs.stat(filePath).catch(() => null)
      if (!stat || now - stat.mtimeMs < olderThanMs) continue
      freed += stat.size
      await fs.unlink(filePath).catch(() => {})
      removed++
    }
  } catch {}
  return { freed, removed }
}

async function pruneOrphanJadibotSessions() {
  let freed = 0, removed = 0
  const SESSION_DIR = './jadibot_sessions'
  const DB_FILE = './jadibot_db.json'

  let knownNumbers = new Set()
  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    knownNumbers = new Set(Object.keys(parsed.sessions || {}))
  } catch {
    return { freed, removed }
  }

  try {
    const entries = await fs.readdir(SESSION_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || knownNumbers.has(entry.name)) continue
      const dirPath = path.join(SESSION_DIR, entry.name)
      freed += await dirSize(dirPath)
      await fs.rm(dirPath, { recursive: true, force: true }).catch(() => {})
      removed++
    }
  } catch {}

  return { freed, removed }
}

export default {
  cmd: ['clear'],
  category: 'owner',
  description: 'Bersihkan database mati, session lama, temp yatim, dan jadibot orphan sekaligus',

  run: async (m, { sock, isOwner }) => {

    await m.react('🧹')

    const ONE_DAY = 24 * 60 * 60 * 1000
    const SIX_HOURS = 6 * 60 * 60 * 1000

    let db = { removedUsers: 0, removedContacts: 0, removedLid: 0, removedChats: 0 }
    try {
      db = await pruneDatabase(sock)
    } catch (e) {
      console.error(e)
    }

    const [session, tmp, jadibot] = await Promise.all([
      pruneSessionDir('./session', ONE_DAY),
      pruneTmpDir(SIX_HOURS),
      pruneOrphanJadibotSessions()
    ])

    const totalFreed = session.freed + tmp.freed + jadibot.freed
    const totalFiles = session.removed + tmp.removed
    const totalFolders = jadibot.removed
    const totalDbEntries = db.removedUsers + db.removedContacts + db.removedLid + db.removedChats

    await m.react('✅')
    return m.reply(
      `*Full Clean selesai*\n\n` +
      `*Database:*\n` +
      `- User kosong: ${db.removedUsers}\n` +
      `- Contact tak kepake: ${db.removedContacts}\n` +
      `- Lid mapping usang: ${db.removedLid}\n` +
      `- Grup tidak aktif: ${db.removedChats}\n\n` +
      `*Disk:*\n` +
      `- Session pre-key lama: ${session.removed} file (${formatSize(session.freed)})\n` +
      `- Temp file yatim: ${tmp.removed} file (${formatSize(tmp.freed)})\n` +
      `- Jadibot orphan: ${jadibot.removed} folder (${formatSize(jadibot.freed)})\n\n` +
      `Total ${totalDbEntries} entri DB, ${totalFiles} file, ${totalFolders} folder dibersihkan\n` +
      `Disk dibebaskan: *${formatSize(totalFreed)}*`
    )
  }
}
