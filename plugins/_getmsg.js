export default {
    onMessage: async (m, { sock }) => {
        if (!m.body || m.isNewsletter) return false

        const msgs = global.db.data.msgs
        if (!msgs || !(m.body in msgs)) return false

        const entry = msgs[m.body]

        await sock.sendMessage(m.chat, {
            forward: {
                key: {
                    remoteJid: m.chat,
                    id: entry.quotedId || m.id,
                    fromMe: false,
                    participant: entry.sender
                },
                message: entry.message
            },
            force: true
        }, { quoted: m }).catch(() => {})

        return true
    }
}
