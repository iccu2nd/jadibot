export default {
    cmd: ['uptime'],
    category: 'info',
    run: async (m, { config }) => {
        const seconds = process.uptime()

        const d = Math.floor(seconds / 86400)
        const h = Math.floor((seconds % 86400) / 3600)
        const mnt = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)

        const parts = []
        if (d) parts.push(`${d}d`)
        if (h) parts.push(`${h}j`)
        if (mnt) parts.push(`${mnt}m`)
        parts.push(`${s}d`.replace('d', 's'))

        await m.reply(`Bot Active!\n${parts.join(' ')}`)
    }
}
