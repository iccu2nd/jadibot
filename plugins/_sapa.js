import { settings } from '../lib/database.js'

const COOLDOWN = 3600000 // 1 jam

export default {
    onMessage: async (m) => {
        if (!m.isGroup || m.key.fromMe) return false

        const text = settings.sapaList[m.sender]
        if (!text) return false

        const user = global.db.data.users[m.sender]
        const now = Date.now()
        if (user.lastSapa && now - user.lastSapa < COOLDOWN) return false

        user.lastSapa = now

        try {
            await m.reply(text.replace(/@pushname/g, m.pushName || m.sender.split('@')[0]), {
                mentions: [m.sender]
            })
        } catch (e) {
            console.error(e)
        }

        return false
    }
}
