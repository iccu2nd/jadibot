import fs from 'fs'
import fsp from 'fs/promises'
import ffmpeg from 'fluent-ffmpeg'
import { cacheFile } from '../lib/cache.js'

const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const isAnimatedWebp = (buffer) => buffer.includes('ANIM') || buffer.includes('ANMF')

const compressImage = async (buffer, quality) => {
    const sharp = (await import('sharp')).default
    let img = sharp(buffer).rotate()
    const meta = await img.metadata()
    const maxDim = 1280
    if ((meta.width || 0) > maxDim || (meta.height || 0) > maxDim) {
        img = img.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    }
    return img.jpeg({ quality, mozjpeg: true }).toBuffer()
}

const compressWebp = async (buffer, quality, animated) => {
    const sharp = (await import('sharp')).default
    let img = sharp(buffer, { animated })
    const meta = await img.metadata()
    const maxDim = 512
    if ((meta.width || 0) > maxDim || (meta.height || 0) > maxDim) {
        img = img.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    }
    return img.webp({ quality, effort: 4 }).toBuffer()
}

const compressVideo = (inPath, outPath, crf, audioBitrate) => new Promise((resolve, reject) => {
    ffmpeg(inPath)
        .videoCodec('libx264')
        .outputOptions([`-crf ${crf}`, '-preset veryfast', '-vf', 'scale=-2:720', '-movflags +faststart'])
        .audioCodec('aac')
        .audioBitrate(audioBitrate)
        .toFormat('mp4')
        .output(outPath)
        .on('error', reject)
        .on('end', resolve)
        .run()
})

const compressAudio = (inPath, outPath, bitrate) => new Promise((resolve, reject) => {
    ffmpeg(inPath)
        .audioCodec('libmp3lame')
        .audioBitrate(bitrate)
        .toFormat('mp3')
        .addOutputOptions(['-map_metadata', '-1'])
        .output(outPath)
        .on('error', reject)
        .on('end', resolve)
        .run()
})

export default {
    cmd: ['compress', 'kompres'],
    category: 'tools',
    run: async (m, { sock, prefix, cmd, text }) => {
        if (!m.quoted) {
            return m.reply(
                `📦 *Kompres Media*\n\n` +
                `Reply gambar/video/audio/stiker dengan *${prefix}${cmd} [level]*\n\n` +
                `Level 1-100 (default 50). Makin kecil levelnya, makin kecil ukuran filenya tapi kualitas makin turun.\n\n` +
                `Contoh:\n${prefix}${cmd}\n${prefix}${cmd} 30`
            )
        }

        const buffer = await m.download().catch(() => null)
        if (!buffer) return m.reply('❌ Gagal ambil medianya, coba reply ulang.')

        const level = clamp(parseInt(text) || 50, 1, 100)
        const mimetype = buffer.mimetype || ''
        const originalSize = buffer.length

        await m.react('⏳')

        let inPath = null
        let outPath = null

        try {
            if (/^image\/webp/.test(mimetype)) {
                const animated = isAnimatedWebp(buffer)
                const quality = clamp(level, 15, 90)
                const result = await compressWebp(buffer, quality, animated)
                const pct = (100 - (result.length / originalSize * 100)).toFixed(1)
                await sock.sendSticker(m.from, result, m, { isAnimated: animated })
                await m.reply(`${fmtSize(originalSize)} → ${fmtSize(result.length)} (hemat ${pct}%)`)

            } else if (/^image\//.test(mimetype)) {
                const quality = clamp(level, 10, 95)
                const result = await compressImage(buffer, quality)
                const pct = (100 - (result.length / originalSize * 100)).toFixed(1)
                await sock.sendImage(m.from, result, `${fmtSize(originalSize)} → ${fmtSize(result.length)} (hemat ${pct}%)`, m)

            } else if (/^video\//.test(mimetype)) {
                const crf = Math.round(51 - (level / 100 * 33))
                inPath = cacheFile('in')
                outPath = cacheFile('mp4')
                await fsp.writeFile(inPath, buffer)
                await compressVideo(inPath, outPath, crf, 96)
                const result = await fsp.readFile(outPath)
                const pct = (100 - (result.length / originalSize * 100)).toFixed(1)
                await sock.sendVideo(m.from, result, `${fmtSize(originalSize)} → ${fmtSize(result.length)} (hemat ${pct}%)`, m)

            } else if (/^audio\//.test(mimetype)) {
                const bitrate = Math.round(32 + (level / 100 * 96))
                inPath = cacheFile('in')
                outPath = cacheFile('mp3')
                await fsp.writeFile(inPath, buffer)
                await compressAudio(inPath, outPath, bitrate)
                const result = await fsp.readFile(outPath)
                const pct = (100 - (result.length / originalSize * 100)).toFixed(1)
                await sock.sendAudio(m.from, result, false, m)
                await m.reply(`${fmtSize(originalSize)} → ${fmtSize(result.length)} (hemat ${pct}%)`)

            } else {
                await m.react('❌')
                return m.reply(`❌ Tipe media ini belum didukung.\n\nYang bisa: gambar, video, audio, stiker.`)
            }

            await m.react('✅')
        } catch (e) {
            console.error('compress Error:', e)
            await m.react('❌')
            m.reply('❌ Gagal mengompres media.')
            throw e
        } finally {
            if (inPath) fs.unlink(inPath, () => {})
            if (outPath) fs.unlink(outPath, () => {})
        }
    }
}