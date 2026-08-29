export default {
    cmd: ['sticker', 'stiker', 's'],
    category: 'tools',
    run: async (m, { sock, text, config, prefix, cmd }) => {
        const crop = /(^|\s)--crop(\s|$)/.test(text)

        const buffer = await m.download().catch(() => null)
        if (!buffer || !/image|video|webp/.test(buffer.mimetype)) {
            return m.reply(`Kirim atau balas gambar/video dengan perintah *${prefix}${cmd}*${crop ? ' --crop' : ''}.`)
        }

        await m.react('⏳')

        try {
            await sock.sendSticker(m.from, buffer, m, {
                packname: config.packname,
                author: config.author,
                isAnimated: /video|gif/.test(buffer.mimetype),
                crop
            })

            await m.react('✅')
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply('Stiker gagal dibuat.')
            throw e
        }
    }
}
