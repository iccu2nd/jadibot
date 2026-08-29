const toMention = jid => '@' + jid.split('@')[0]
const getRandom = arr => arr[Math.floor(Math.random() * arr.length)]

export default {
    cmd: ['jadian'],
    category: 'fun',
    run: async (m, { sock }) => {
        if (!m.isGroup) return m.reply('Fitur ini cuma bisa dipakai di grup.')

        const metadata = await sock.groupMetadata(m.from)
        const participants = metadata.participants.map(p => p.id)
        if (participants.length < 2) return m.reply('Anggota grup kurang dari 2 orang.')

        const a = getRandom(participants)
        let b
        do {
            b = getRandom(participants)
        } while (b === a)

        await sock.sendMessage(m.from, {
            text: `${toMention(a)} ❤️ ${toMention(b)}`,
            mentions: [a, b]
        }, { quoted: m })
    }
}
