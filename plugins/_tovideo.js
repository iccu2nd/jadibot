import { webp2mp4 } from '../lib/webp2mp4.js'

function isAnimatedWebp(buffer) {
    return buffer.includes('ANIM') || buffer.includes('ANMF')
}

export default {
    cmd: ['tovideo', 'tovid', 'stickertovideo'],
    category: 'tools',
    run: async (m, ctx) => {
        const sock = ctx.sock || ctx.conn
        const prefix = ctx.prefix || ctx.usedPrefix || '.'
        const cmd = ctx.cmd || ctx.command || 'tovideo'

        const target = m.quoted || m
        const buffer = await m.download().catch(() => null)

        if (!buffer) {
            return m.reply(`⌗ *Stiker/Video ke Video*\n\nReply stiker bergerak atau video dengan caption *${prefix}${cmd}*.`)
        }

        const isWebp = /webp/.test(buffer.mimetype || '') && target.type === 'stickerMessage'
        const isVideo = /video/.test(buffer.mimetype || '')

        if (!isWebp && !isVideo) {
            return m.reply(`⌗ *Stiker/Video ke Video*\n\nReply stiker bergerak atau video dengan caption *${prefix}${cmd}*.`)
        }

        if (isWebp && !isAnimatedWebp(buffer)) {
            await m.react('❌')
            return m.reply(`❌ Itu stiker diam (bukan animasi).\n\nUntuk stiker diam, pakai *${prefix}toimg* ya, bukan *${prefix}${cmd}*.`)
        }

        await m.react('⏳')

        if (isVideo) {
            try {
                await sock.sendVideo(m.from, buffer, '✅ Berhasil diubah jadi video!', m, false)
                await m.react('✅')
            } catch (e) {
                console.error('tovideo Error:', e)
                await m.react('❌')
                m.reply('❌ Gagal mengirim video.')
                throw e
            }
            return
        }

        try {
            const videoUrl = await webp2mp4(buffer)
            await sock.sendVideo(m.from, videoUrl, '✅ Berhasil diubah jadi video!', m, false)
            await m.react('✅')
        } catch (e) {
            console.error('tovideo Error:', e)
            await m.react('❌')
            m.reply('❌ Gagal mengubah stiker jadi video (server konversi lagi susah dihubungi, coba lagi ya).')
            throw e
        }
    }
}
