import os from 'os'
import { plugins } from '../lib/plugins.js'

function formatBytes(bytes) {
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(1)} MB`
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const mnt = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const parts = []
    if (d) parts.push(`${d}d`)
    if (h) parts.push(`${h}j`)
    if (mnt) parts.push(`${mnt}m`)
    parts.push(`${s}s`)
    return parts.join(' ')
}

export default {
    cmd: ['stats', 'status'],
    category: 'info',
    run: async (m, { config }) => {
        const mem = process.memoryUsage()
        const totalUsers = Object.keys(global.db.data.users || {}).length
        const totalChats = Object.keys(global.db.data.chats || {}).length
        const totalGroups = Object.keys(global.db.data.chats || {}).filter(jid => jid.endsWith('@g.us')).length

        const text = `*Statistik Bot*\n\n` +
            `› Bot: ${config.botName}\n` +
            `› Uptime: ${formatUptime(process.uptime())}\n` +
            `› Node: ${process.version}\n` +
            `› Platform: ${os.platform()} (${os.arch()})\n\n` +
            `*Memori*\n` +
            `› RAM Bot: ${formatBytes(mem.rss)}\n` +
            `› Heap: ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}\n` +
            `› RAM Server: ${formatBytes(os.totalmem() - os.freemem())} / ${formatBytes(os.totalmem())}\n\n` +
            `*Data*\n` +
            `› Plugin aktif: ${plugins.size}\n` +
            `› User terdaftar: ${totalUsers}\n` +
            `› Grup tercatat: ${totalGroups}\n` +
            `› Total chat: ${totalChats}`

        await m.reply(text)
    }
}
