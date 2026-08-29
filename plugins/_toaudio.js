import { PassThrough } from 'stream'
import { Readable } from 'stream'
import ffmpeg from 'fluent-ffmpeg'

const toMp3 = (input) => {
    return new Promise((resolve, reject) => {
        const output = new PassThrough()
        const buffers = []
        const source = Buffer.isBuffer(input) ? Readable.from(input) : input

        ffmpeg(source)
            .audioCodec('libmp3lame')
            .audioFrequency(44100)
            .audioBitrate(192)
            .toFormat('mp3')
            .addOutputOptions(['-map_metadata -1'])
            .on('error', (err) => reject(err))
            .pipe(output)

        output.on('data', (chunk) => buffers.push(chunk))
        output.on('end', () => resolve(Buffer.concat(buffers)))
    })
}

export default {
    cmd: ['toaudio'],
    category: 'tools',
    run: async (m, { sock }) => {
        if (!m.quoted) return m.reply('Reply ke pesan video atau audio terlebih dahulu.')

        const buffer = await m.download().catch(() => null)
        if (!buffer || !/audio|video/.test(buffer.mimetype)) {
            return m.reply('Hanya bisa digunakan pada pesan video atau audio.')
        }

        await m.react('⏳')

        try {
            const mp3 = await toMp3(buffer)
            await sock.sendMessage(m.from, {
                audio: mp3,
                ptt: false,
                mimetype: 'audio/mpeg'
            }, { quoted: m })

            await m.react('✅')
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply('Gagal mengkonversi media.')
            throw e
        }
    }
}
