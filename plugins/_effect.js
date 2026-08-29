import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import fsp from 'fs/promises'
import { cacheFile } from '../lib/cache.js'

const EFFECTS = {
    bass: {
        label: 'Bass Boost',
        filter: 'bass=g=20:f=110:w=0.6,volume=1.5'
    },
    earrape: {
        label: 'Earrape',
        filter: 'bass=g=25:f=80,acrusher=bits=8:mode=log:aa=0.5,volume=8'
    },
    reverb: {
        label: 'Reverb (Hall)',
        filter: 'aecho=1:0.85:35|70|140|220:0.35|0.25|0.15|0.08,lowpass=f=7500,highpass=f=110'
    },
    slow: {
        label: 'Slow Motion',
        filter: 'rubberband=tempo=0.75:transients=smooth:smoothing=on:pitchq=quality'
    },
    fast: {
        label: 'Speed Up',
        filter: 'rubberband=tempo=1.35:transients=smooth:smoothing=on:pitchq=quality'
    },
    nightcore: {
        label: 'Nightcore',
        filter: 'asetrate=44100*1.25,aresample=44100,atempo=1.06'
    },
    deep: {
        label: 'Deep Voice',
        filter: 'asetrate=44100*0.8,aresample=44100'
    },
    chipmunk: {
        label: 'Chipmunk Voice',
        filter: 'asetrate=44100*1.5,aresample=44100'
    },
    robot: {
        label: 'Robot Voice',
        filter: 'vibrato=f=6:d=0.6,flanger,tremolo=f=9:d=0.6'
    },
    echo: {
        label: 'Echo',
        filter: 'aecho=0.8:0.7:60:0.35'
    },
    '8d': {
        label: '8D Audio (headphone wajib)',
        filter: 'pan=stereo|c0=c0|c1=c0,apulsator=hz=0.08:mode=sine:amount=1,extrastereo=m=2.2,aecho=0.8:0.7:40|80:0.25|0.15',
        stereo: true
    },
    slowedreverb: {
        label: 'Slowed + Reverb',
        filter: 'asetrate=44100*0.85,aresample=44100,aecho=1:0.85:35|70|140|220:0.35|0.25|0.15|0.08,lowpass=f=7500,highpass=f=110'
    }
}

const MASTER_CHAIN = 'acompressor=threshold=0.1:ratio=3:attack=20:release=250,alimiter=limit=0.95'

const effectList = () => Object.entries(EFFECTS).map(([key, v]) => `- ${key} (${v.label})`).join('\n')

function applyEffect(inPath, outPath, filter, { stereo = false } = {}) {
    return new Promise((resolve, reject) => {
        const cmd = ffmpeg(inPath).audioFilters(`${filter},${MASTER_CHAIN}`)

        if (stereo) {
            cmd.audioCodec('libmp3lame')
                .audioChannels(2)
                .audioFrequency(44100)
                .audioBitrate(192)
                .toFormat('mp3')
                .addOutputOptions(['-map_metadata -1'])
        } else {
            cmd.audioCodec('libopus')
                .audioChannels(1)
                .audioFrequency(48000)
                .audioBitrate(64)
                .toFormat('ogg')
                .addOutputOptions([
                    '-map_metadata', '-1',
                    '-vn',
                    '-threads', '0',
                    '-application', 'voip',
                    '-compression_level', '0'
                ])
        }

        cmd.output(outPath)
            .on('error', reject)
            .on('end', resolve)
            .run()
    })
}

export default {
    cmd: ['effect', 'audioeffect', 'fx'],
    category: 'tools',
    description: 'Kasih effect ke audio/video (bass, earrape, reverb, slow, dll)',

    run: async (m, { sock, text, prefix, cmd }) => {
        const key = text?.trim().toLowerCase()

        if (!key) {
            return m.reply(`*Daftar Effect Audio*\n\n${effectList()}\n\nCara pakai: reply audio/video/voice note dengan *${prefix + cmd} <nama effect>*\nContoh: ${prefix + cmd} reverb`)
        }

        const effect = EFFECTS[key]
        if (!effect) return m.reply(`Effect *${key}* tidak ditemukan.\n\nEffect yang tersedia:\n${effectList()}`)

        if (!m.quoted) return m.reply(`Reply pesan audio/video/voice note dengan perintah ini.\nContoh: ${prefix + cmd} ${key}`)

        const buffer = await m.download().catch(() => null)
        if (!buffer || !/audio|video/.test(buffer.mimetype)) {
            return m.reply('Hanya bisa digunakan pada pesan audio, voice note, atau video.')
        }

        await m.react('⏳')

        const isStereo = effect.stereo === true
        const inPath = cacheFile('in')
        const outPath = cacheFile(isStereo ? 'mp3' : 'ogg')
        await fsp.writeFile(inPath, buffer)

        try {
            await applyEffect(inPath, outPath, effect.filter, { stereo: isStereo })

            const result = await fsp.readFile(outPath)

            if (isStereo) {
                await sock.sendMessage(m.from, {
                    audio: result,
                    ptt: false,
                    mimetype: 'audio/mpeg'
                }, { quoted: m })
                await m.reply('Pakai headphone/earphone biar efek 8D-nya kerasa muter di kedua kuping.')
            } else {
                await sock.sendMessage(m.from, {
                    audio: result,
                    ptt: true,
                    mimetype: 'audio/ogg; codecs=opus'
                }, { quoted: m })
            }

            await m.react('✅')
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply(`Gagal menerapkan effect *${key}*.`)
            throw e
        } finally {
            fs.unlink(inPath, () => {})
            fs.unlink(outPath, () => {})
        }
    }
}