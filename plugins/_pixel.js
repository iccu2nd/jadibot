import fs from 'fs'
import fsp from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import { cacheFile } from '../lib/cache.js'

const execAsync = promisify(exec)

export default {
    cmd: ['pixel', 'blur'],
    category: 'tools',
    run: async (m, { sock, text }) => {
        const cmd = m.body.replace(/^[./#!]/, '').trim().split(/ +/)[0].toLowerCase()
        const buf = await m.download().catch(() => null)
        if (!buf) return m.reply('Kirim atau reply gambar/video/stiker!')

        const mime = buf.mimetype || ''
        const isVideo = /video/.test(mime)
        const isWebp = /webp/.test(mime)
        const isImage = /image/.test(mime) && !isWebp

        if (!isImage && !isVideo && !isWebp) return m.reply('Format tidak didukung!')

        await m.react('⏳')

        try {
            const lvl = Math.min(Math.max(parseInt(text) || 50, 1), 100)

            if (isImage) {
                const sharp = (await import('sharp')).default
                let result
                if (cmd === 'blur') {
                    result = await sharp(buf).blur(lvl).jpeg({ quality: 75 }).toBuffer()
                } else {
                    const tiny = Math.round(4 + (lvl / 100) * 56)
                    const small = await sharp(buf).resize(tiny, tiny, { fit: 'inside', kernel: 'nearest' }).toBuffer()
                    const meta = await sharp(small).metadata()
                    result = await sharp(small).resize(meta.width * 20, meta.height * 20, { kernel: 'nearest' }).jpeg({ quality: 30 }).toBuffer()
                }
                await sock.sendMessage(m.from, { image: result, mimetype: 'image/jpeg' }, { quoted: m })
                return await m.react('✅')
            }

            let inputArg
            let vf
            if (cmd === 'blur') {
                const b = Math.max(1, Math.round(lvl / 5)) * 2 + 1
                vf = `boxblur=${b}:1`
            } else {
                const factor = Math.max(2, Math.round((101 - lvl) / 10))
                vf = `scale=trunc(iw/${factor}/2)*2:trunc(ih/${factor}/2)*2:flags=neighbor,scale=iw*${factor}:ih*${factor}:flags=neighbor`
            }
            const tmpOut = cacheFile('burik_out.mp4')
            const tmpIn = cacheFile('burik.mp4')
            const tmpPng = cacheFile('burik.png')
            const tmpGif = cacheFile('burik_in.gif')

            try {
                if (isWebp) {
                    const sharp = (await import('sharp')).default

                    const meta = await sharp(buf, { animated: true }).metadata()
                    const isAnimated = meta.pages && meta.pages > 1

                    if (isAnimated) {
                        await sharp(buf, { animated: true }).gif().toFile(tmpGif)
                        inputArg = `-i "${tmpGif}"`
                    } else {
                        const frame = await sharp(buf).png().toBuffer()
                        await fsp.writeFile(tmpPng, frame)
                        inputArg = `-loop 1 -i "${tmpPng}" -t 3`
                    }
                } else {
                    await fsp.writeFile(tmpIn, buf)
                    inputArg = `-i "${tmpIn}"`
                }

                await execAsync(
                    `ffmpeg -y ${inputArg} -vf "${vf}" -c:v libx264 -crf 28 -preset fast -t 30 -an -pix_fmt yuv420p "${tmpOut}"`,
                    { timeout: 60000 }
                )

                const outBuf = await fsp.readFile(tmpOut)

                await sock.sendMessage(m.from, {
                    video: outBuf,
                    mimetype: 'video/mp4',
                    gifPlayback: isWebp
                }, { quoted: m })

                await m.react('✅')
            } finally {
                await Promise.all([tmpIn, tmpPng, tmpGif, tmpOut].map(f => fsp.unlink(f).catch(() => {})))
            }
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply(`❌ ${e.message}`)
            throw e
        }
    }
}
