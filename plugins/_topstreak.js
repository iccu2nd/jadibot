export default {
    cmd: ['topstreak', 'streakboard'],
    category: 'main',
    run: async (m, { sock }) => {
        if (!m.isGroup) return m.reply('Fitur ini cuma bisa dipakai di grup.')

        const metadata = await sock.groupMetadata(m.from)
        const members = metadata.participants
            .map(p => p.phoneNumber || (p.id?.endsWith('@s.whatsapp.net') ? p.id : null))
            .filter(Boolean)

        const ranked = members
            .map(jid => {
                const user = global.db.data.users[jid]
                if (!user || !user.streak || user.streak < 3) return null
                const contact = global.db.data.contacts[jid]
                const number = jid.split('@')[0]
                const name = (contact?.pushname && contact.pushname !== 'null') ? contact.pushname : number
                return { jid, name, number, streak: user.streak }
            })
            .filter(Boolean)
            .sort((a, b) => b.streak - a.streak)
            .slice(0, 10)

        if (!ranked.length) return m.reply('Belum ada yang punya streak aktif di grup ini. Chat 3 hari berturut-turut buat buka streak!')

        const medals = ['🥇', '🥈', '🥉']
        const lines = ranked.map((r, i) => `${medals[i] || `${i + 1}.`} ${r.name} — ${r.streak} hari 🔥\n   https://wa.me/${r.number}`)

        return m.reply(`🏆 Leaderboard Streak\n\n${lines.join('\n')}`)
    }
}
