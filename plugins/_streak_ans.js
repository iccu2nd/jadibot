import { checkBrokenStreaks, settings } from '../lib/database.js'

let schedulerStarted = false

export default {
    onConnect: async (sock) => {
        if (schedulerStarted) return
        schedulerStarted = true

        const run = () => {
            const jakartaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
            const nextMidnight = new Date(jakartaNow)
            nextMidnight.setHours(24, 0, 5, 0)
            const delay = nextMidnight - jakartaNow

            setTimeout(async () => {
                if (settings.mode !== 'self') {
                    checkBrokenStreaks()
                }
                run()
            }, delay)
        }
        run()
    },

    onMessage: async (m, { sock }) => {
        const info = m.userInit
        if (!info || !info.streakUpdated || info.streak < 3) return false
        if (global.db.data.users[m.sender]?.streakNotif === false) return false

        await sock.sendMessage(m.from, {
            text: `🔥 Streak Anda\n\n› Nama: ${m.pushName || 'User'}\n› Streak: ${info.streak} hari 🔥\n\nChat bot setiap hari biar streak Anda tidak putus!\n\n_Ingin menonaktifkan notifikasi ini? Ketik .streaknotif off_`,
            mentions: m.isGroup ? [m.sender] : undefined
        }, { quoted: m }).catch(() => {})

        return false
    }
}
