export default {
    cmd: ['upch', 'uploadch'],
    category: 'owner',
    run: async (m, { sock, text, config }) => {
        if (!m.isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')
        if (!config.idch) return m.reply('config.idch belum diset.')

        if (m.quoted) {
            const buffer = await m.download().catch((e) => { throw e })
            const caption = text || ''

            if (/^image/.test(buffer.mimetype)) {
                await sock.sendMessage(config.idch, { image: buffer, caption })
            } else if (/^video/.test(buffer.mimetype)) {
                await sock.sendMessage(config.idch, { video: buffer, caption })
            } else if (/^audio/.test(buffer.mimetype)) {
                await sock.sendMessage(config.idch, { audio: buffer, mimetype: buffer.mimetype, ptt: false })
            } else {
                return m.reply('Cuma bisa post gambar, video, atau audio/lagu.')
            }
            return m.reply('✅ Berhasil di-post ke channel.')
        }

        if (!text) return m.reply('Masukan teks yang mau di-post, atau reply gambar/video/audio.\nContoh: .upch Halo semua!')
        await sock.sendMessage(config.idch, { text })
        return m.reply('✅ Berhasil di-post ke channel.')
    }
}
