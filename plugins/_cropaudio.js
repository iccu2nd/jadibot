import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import fsp from 'fs/promises'
import { cacheFile } from '../lib/cache.js'

const toSeconds = t => t.split('.').reduce((a, b) => a * 60 + (+b || 0), 0)

export default {
    cmd: ['cropaudio', 'cutaudio', 'trimaudio'],
    category: 'tools',
    run: async (m, { sock, text }) => {
        if (!m.quoted) return m.reply('Reply ke pesan audio/voice note.\nContoh: .cropaudio 0.00-0.32')
        if (!text?.includes('-')) return m.reply('Format salah.\nContoh: .cropaudio 0.00-0.32')

        const [start, end] = text.trim().split('-').map(toSeconds)
        if (isNaN(start) || isNaN(end) || end <= start) return m.reply('Rentang waktu tidak valid.')

        const buffer = await m.download().catch(() => null)
        if (!buffer || !/audio/.test(buffer.mimetype)) return m.reply('Hanya bisa digunakan pada pesan audio/voice note.')

        await m.react('⏳')

        const inPath = cacheFile('audio')
        const outPath = cacheFile('mp3')
        await fsp.writeFile(inPath, buffer)

        const run = opts => new Promise((res, rej) => {
            ffmpeg(inPath).inputOptions([`-ss ${start}`]).outputOptions([`-t ${end - start}`, ...opts]).output(outPath).on('error', rej).on('end', res).run()
        })

        try {
            try { await run(['-c copy']) } catch { await run(['-c:a', 'libmp3lame']) }

            const trimmed = await fsp.readFile(outPath)
            await sock.sendMessage(m.from, { audio: trimmed, mimetype: 'audio/mpeg' }, { quoted: m })
            await m.react('✅')
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply('Gagal memotong audio.')
            throw e
        } finally {
            fs.unlink(inPath, () => {})
            fs.unlink(outPath, () => {})
        }
    }
}
