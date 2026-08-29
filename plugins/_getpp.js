export default {
    cmd: ['getpp'],
    category: 'main',
    run: async (m, { sock }) => {
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        const jid = rawTarget || m.sender

        if (!rawTarget) return m.reply('Tag atau reply orangnya dulu.\nContoh: .getpp @user')

        const pp = await sock.profilePictureUrl(jid, 'image').catch(() => null)
        if (!pp) return m.reply('Nggak bisa ambil PP-nya, mungkin dia nggak punya foto profil atau privasinya dibatasi.')

        await sock.sendMessage(m.from, {
            image: pp,
            caption: `@${jid.split('@')[0]}`,
            mentions: [jid]
        }, { quoted: m })
    }
}
