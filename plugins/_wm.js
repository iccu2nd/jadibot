export default {
    cmd: ['wm', 'take', 'colong'],
    category: 'tools',
    run: async (m, { sock, text }) => {
        if (!m.quoted) return m.reply("Silakan balas/reply stiker yang ingin diubah watermark-nya.")

        if (m.quoted.type !== 'stickerMessage') return m.reply("Fitur ini hanya dapat digunakan dengan membalas sebuah stiker.")

        const [pack, auth] = (text || '').split('|').map(v => v.trim())

        await m.react('⏳')

        try {
            const buffer = await m.download()

            await sock.sendSticker(m.from, buffer, m, {
                packname: pack || '',
                author: auth || ''
            })

            await m.react('✅')
        } catch (e) {
            await m.react('❌')
            m.reply(`Gagal mengubah watermark stiker: ${e.message}`)
            throw e
        }
    }
}
