export default {
    cmd: ['rvo'],
    category: 'tools',
    run: async (m, { sock }) => {
        if (!m.quoted) return m.reply('Reply ke pesan sekali lihat!')

        const buffer = await m.download().catch(() => null)
        if (!buffer || !/image|video|audio/.test(buffer.mimetype)) {
            return m.reply('Hanya untuk foto/video/audio sekali lihat.')
        }

        try {
            if (/image/.test(buffer.mimetype)) {
                await sock.sendImage(m.from, buffer, buffer.caption || '', m)
            } else if (/video/.test(buffer.mimetype)) {
                await sock.sendVideo(m.from, buffer, buffer.caption || '', m)
            } else {
                await sock.sendAudio(m.from, buffer, true, m)
            }
        } catch (e) {
            console.error(e)
            m.reply('Gagal membuka pesan. Mungkin sudah kadaluarsa.')
            throw e
        }
    }
}
