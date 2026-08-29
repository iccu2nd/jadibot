import { Shazam } from 'node-shazam'
import fs from 'fs'
import fsp from 'fs/promises'
import os from 'os'
import path from 'path'
import crypto from 'crypto'

const shazam = new Shazam()

const extFromMime = (mimetype = '') => {
    if (/mp4|video/.test(mimetype)) return 'mp4'
    if (/ogg/.test(mimetype)) return 'ogg'
    if (/webm/.test(mimetype)) return 'webm'
    if (/wav/.test(mimetype)) return 'wav'
    return 'mp3'
}

const toWebLink = (uri) => {
    if (!uri) return null
    if (/^https?:\/\//.test(uri)) return uri
    const m = uri.match(/^spotify:(.+)$/)
    if (!m) return uri
    return `https://open.spotify.com/${m[1].replace(/:/g, '/')}`
}

export default {
    cmd: ['findsong', 'whatsong'],
    category: 'tools',
    run: async (m, { sock, prefix, cmd }) => {
        let buffer, ext

        if (m.quoted && /audio|video/.test(m.quoted.type || '')) {
            buffer = await m.download().catch(() => null)
            ext = extFromMime(buffer?.mimetype)
        } else if (m.text && /^https?:\/\//.test(m.text)) {
            const res = await fetch(m.text, { signal: AbortSignal.timeout(20000) }).catch(() => null)
            if (!res || !res.ok) return m.reply('Gagal mengambil file dari URL tersebut.')
            buffer = Buffer.from(await res.arrayBuffer())
            ext = extFromMime(res.headers.get('content-type') || '')
        } else {
            return m.reply(`Kirim/reply audio atau video, atau URL.\nContoh: *${prefix}${cmd}* https://example.com/audio.mp3`)
        }

        if (!buffer) return m.reply('Gagal mengunduh media.')

        const filePath = path.join(os.tmpdir(), `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`)
        await fsp.writeFile(filePath, buffer)

        await m.react('⏳')

        try {
            const result = await shazam.recognise(filePath, 'en-US').catch(() => null)
            const track = result?.track

            if (!track) {
                await m.react('❌')
                return m.reply('Lagu tidak ditemukan.')
            }

            const subtitle = track.subtitle || '-'
            const sections = track.sections?.find(s => s.type === 'SONG')?.metadata || []
            const meta = Object.fromEntries(sections.map(s => [s.title?.toLowerCase(), s.text]))
            const cover = track.images?.coverarthq || track.images?.coverart

            const providers = track.hub?.providers || []
            const spotifyRaw = providers.find(p => /spotify/i.test(p.type))?.actions?.find(a => a.uri)?.uri
            const appleMusicRaw = track.hub?.options?.find(o => /apple/i.test(o.caption || ''))?.actions?.find(a => a.uri)?.uri

            const spotify = toWebLink(spotifyRaw)
            const appleMusic = toWebLink(appleMusicRaw)

            const caption = [
                `- *Judul* : ${track.title || '-'}`,
                `- *Artis* : ${subtitle}`,
                meta.album ? `- *Album* : ${meta.album}` : '',
                meta.label ? `- *Label* : ${meta.label}` : '',
                meta.released ? `- *Rilis* : ${meta.released}` : '',
                track.url ? `- *Shazam* : ${track.url}` : '',
                spotify ? `- *Spotify* : ${spotify}` : '',
                appleMusic ? `- *Apple Music* : ${appleMusic}` : '',
            ].filter(Boolean).join('\n')

            await m.react('✅')

            const playQuery = [track.title, subtitle !== '-' ? subtitle : ''].filter(Boolean).join(' ')

            await sock.sendInteractiveButton(m.from, {
                title: 'FIND SONG',
                body: caption,
                footer: 'Tap tombol untuk putar lagunya',
                image: cover || undefined,
                buttons: [
                    { type: 'reply', label: '▶️ Play Lagu', id: `.play ${playQuery}` }
                ]
            }, { quoted: m })
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply('Gagal mengenali lagu.')
        } finally {
            fs.unlink(filePath, () => {})
        }
    }
}
