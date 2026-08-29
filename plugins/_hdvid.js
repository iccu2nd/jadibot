import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import fsp from 'fs/promises'
import { cacheFile } from '../lib/cache.js'

const MAX_INPUT_MB = 60
const MAX_INPUT_BYTES = MAX_INPUT_MB * 1024 * 1024
const CRF = 17
const PRESET = 'slow'
const TIMEOUT_MS = 15 * 60 * 1000

const formatSize = bytes => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`

const vf = [
    `hqdn3d=3:2:4:3`,
    `scale='if(gte(iw,ih),1920,1080)':'if(gte(iw,ih),1080,1920)':force_original_aspect_ratio=decrease:flags=lanczos+accurate_rnd+full_chroma_int`,
    `scale=trunc(iw/2)*2:trunc(ih/2)*2`,
    `unsharp=5:5:1.1:5:5:0.3`,
    `deband=1thr=0.02:2thr=0.02:3thr=0.02:4thr=0.02:range=16:blur=1`,
    `eq=contrast=1.03:saturation=1.05`
].join(',')

const runFfmpeg = (inPath, outPath) => new Promise((resolve, reject) => {
    let done = false
    const finish = fn => (...a) => { if (done) return; done = true; clearTimeout(timer); fn(...a) }
    const cmd = ffmpeg(inPath)
        .videoFilters(vf)
        .videoCodec('libx264')
        .outputOptions(['-preset', PRESET, '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-map_metadata', '-1'])
        .audioCodec('aac')
        .audioBitrate('192k')
        .audioFrequency(48000)
        .output(outPath)
        .on('error', finish(reject))
        .on('end', finish(resolve))

    const timer = setTimeout(() => { cmd.kill('SIGKILL'); finish(reject)(new Error('Proses terlalu lama dan dihentikan otomatis.')) }, TIMEOUT_MS)
    cmd.run()
})

export default {
    cmd: ['hdvid'],
    category: 'tools',
    run: async (m, { sock, prefix }) => {
        const buffer = await m.download().catch(() => null)

        if (!buffer || !/video/.test(buffer.mimetype)) {
            return m.reply(`⌗ *Super HD Video*\n\nUpscale video ke Full HD, jernih & smooth.\n\n› Reply video atau kirim video dengan caption *${prefix}hdvid*\n📦 Maksimal ukuran video: ${MAX_INPUT_MB} MB`)
        }
        if (buffer.length > MAX_INPUT_BYTES) return m.reply(`Ukuran video maksimal ${MAX_INPUT_MB} MB.\nUkuran video Anda: ${formatSize(buffer.length)}`)

        await m.react('⏳')

        const inPath = cacheFile('mp4')
        const outPath = cacheFile('mp4')
        await fsp.writeFile(inPath, buffer)

        try {
            await runFfmpeg(inPath, outPath)
            const outStat = await fsp.stat(outPath)
            if (outStat.size < 1000) throw new Error('Hasil video kosong atau gagal dibuat.')

            const caption = `✅ *Super HD Video selesai*\n\n📐 Kualitas: Full HD, jernih & smooth\n✨ Denoise + deband + sharpen\n📥 Ukuran awal: ${formatSize(buffer.length)}\n📤 Ukuran hasil: ${formatSize(outStat.size)}`
            const result = await fsp.readFile(outPath)

            if (outStat.size > 100 * 1024 * 1024) {
                await sock.sendMessage(m.from, { document: result, mimetype: 'video/mp4', fileName: 'hdvid.mp4', caption: `${caption}\n\n⚠️ Dikirim sebagai dokumen karena ukuran hasil cukup besar.` }, { quoted: m })
            } else {
                await sock.sendMessage(m.from, { video: result, mimetype: 'video/mp4', caption }, { quoted: m })
            }

            await m.react('✅')
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply('Gagal memproses video.')
            throw e
        } finally {
            fs.unlink(inPath, () => {})
            fs.unlink(outPath, () => {})
        }
    }
}
