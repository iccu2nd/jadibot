export default {
    cmd: ['ssweb2'],
    category: 'tools',
    run: async (m, { sock, text, config }) => {
        if (!text) return m.reply('Masukkan URL!\nContoh: .ssweb google.com')

        const url = /^https?:\/\//i.test(text) ? text : `https://${text}`

        m.reply('⌛ Sedang mengambil screenshot...')

        try {
            const image = `https://api.mightyshare.io/v1/19EIFDUEL496RA3F/jpg?url=${encodeURIComponent(url)}`

            let caption = `⌗ *Website Screenshot*\n\n`
            caption += `› *URL:* ${url}\n\n`
            caption += `> *${config.botName}*`

            await sock.sendMessage(m.from, { image: { url: image }, caption }, { quoted: m })
        } catch (e) {
            console.error(e)
            m.reply('Terjadi kesalahan saat mengambil screenshot.')
            throw e
        }
    }
}
