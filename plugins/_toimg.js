function isAnimatedWebp(buffer) {
    return buffer.includes('ANIM') || buffer.includes('ANMF')
}

export default {
    cmd: ['toimg', 'toimage', 'stickertoimg'],
    category: 'tools',
    run: async (m, { sock, prefix, cmd }) => {
        const target = m.quoted || m
        const buffer = await m.download().catch(() => null)

        if (!buffer || !/webp/.test(buffer.mimetype) || target.type !== 'stickerMessage') {
            return m.reply(`⌗ *Stiker ke Gambar*\n\nReply stiker (yang diam/bukan animasi) dengan caption *${prefix}${cmd}*.\n\nKalau stikernya bergerak, pakai *${prefix}tovideo*.`)
        }

        if (isAnimatedWebp(buffer)) {
            await m.react('❌')
            return m.reply(`❌ Itu stiker bergerak (animasi), bukan stiker diam.\n\nUntuk stiker bergerak, pakai *${prefix}tovideo* ya, bukan *${prefix}toimg*.`)
        }

        await m.react('⏳')

        try {
            const sharp = (await import('sharp')).default
            const result = await sharp(buffer)
                .png({ quality: 100, compressionLevel: 9 })
                .toBuffer()

            if (!result || !result.length) throw new Error('Hasil gambar kosong.')

            await sock.sendImage(m.from, result, '✅ Berhasil diubah jadi gambar!', m)
            await m.react('✅')
        } catch (e) {
            console.error('toimg Error:', e)
            await m.react('❌')
            m.reply('❌ Gagal mengubah stiker jadi gambar.')
            throw e
        }
    }
}
