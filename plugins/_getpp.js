export default {
    cmd: ['getpp'],
    category: 'main',
    run: async (m, { sock, text }) => {
        let jid = m.mentionedJid?.[0] || m.quoted?.sender

        if (!jid && text) {
            const number = text.replace(/\D/g, '')
            if (!number) return m.reply('Nomor tidak valid.\nContoh: .getpp 628123456789')

            let check
            try {
                check = await sock.onWhatsApp(number + '@s.whatsapp.net')
            } catch {
                check = []
            }
            if (!check?.[0]?.exists) return m.reply('Nomor tidak terdaftar di WhatsApp.')
            jid = check[0].jid
        }

        if (!jid) return m.reply('Tag, reply, atau kasih nomornya.\nContoh:\n.getpp @user')

        const pp = await sock.profilePictureUrl(jid, 'image').catch(() => null)
        if (!pp) return m.reply('Terjadi kesalahan saat mengambil foto profile\n\n> mungkin dia tidak punya foto profil atau privasinya dibatasi.')

        await sock.sendMessage(m.from, {
            image: pp,
            caption: `@${jid.split('@')[0]}`,
            mentions: [jid]
        }, { quoted: m })
    }
}
