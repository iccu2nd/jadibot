import axios from 'axios'
import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import os from 'os'
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'

const BG_URL = 'https://i.ibb.co/PZ683Yn4/a360199cc51d.jpg'
const FONT_URL = 'https://raw.githubusercontent.com/reyzdesu/bot-assets/main/fonts/semiboldios.ttf'
const FONT_PATH = path.join(os.homedir(), '.fonts', 'semiboldios.ttf')
const FONT_FAMILY = 'SFPro-Semibold'
const EMOJI_FONT_URL = 'https://github.com/13rac1/twemoji-color-font/releases/download/v15.0.3/TwemojiMozilla.ttf'
const EMOJI_FONT_PATH = path.join(os.homedir(), '.fonts', 'TwemojiMozilla.ttf')
const EMOJI_FONT_FAMILY = 'Twemoji Mozilla'
const BG_CACHE_PATH = path.join(os.homedir(), '.cache', 'yumibot', 'iqc-bg.jpg')

const BUBBLE_X_R = 0.0435
const BUBBLE_Y_R = 0.4618
const BUBBLE_WIDTH_R = 0.6535
const BUBBLE_HEIGHT_R = 0.0673
const PAD_X_R = 0.0217
const PAD_Y_R = 0.0107

const MAX_FONT_R = 0.0462
const MIN_FONT_R = 0.0217
const LINE_HEIGHT_RATIO = 1.28
const TEXT_COLOR = '#F0F0F0'

let ready = null

function ensureAssets() {
    if (!ready) {
        ready = (async () => {
            const fontExists = await fsp.access(FONT_PATH).then(() => true).catch(() => false)
            if (!fontExists) {
                const res = await axios.get(FONT_URL, { responseType: 'arraybuffer', timeout: 20000 })
                await fsp.mkdir(path.dirname(FONT_PATH), { recursive: true })
                await fsp.writeFile(FONT_PATH, Buffer.from(res.data))
            }
            GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY)

            const emojiFontExists = await fsp.access(EMOJI_FONT_PATH).then(() => true).catch(() => false)
            if (!emojiFontExists) {
                const res = await axios.get(EMOJI_FONT_URL, { responseType: 'arraybuffer', timeout: 30000 })
                await fsp.mkdir(path.dirname(EMOJI_FONT_PATH), { recursive: true })
                await fsp.writeFile(EMOJI_FONT_PATH, Buffer.from(res.data))
            }
            GlobalFonts.registerFromPath(EMOJI_FONT_PATH, EMOJI_FONT_FAMILY)

            const bgBuf = await fsp.readFile(BG_CACHE_PATH).catch(() => null)
            let bgOk = false
            if (bgBuf) {
                try { await loadImage(bgBuf); bgOk = true } catch (e) { bgOk = false }
            }
            if (!bgOk) {
                const res = await axios.get(BG_URL, { responseType: 'arraybuffer', timeout: 20000 })
                await fsp.mkdir(path.dirname(BG_CACHE_PATH), { recursive: true })
                await fsp.writeFile(BG_CACHE_PATH, Buffer.from(res.data))
            }
        })().catch(err => {
            ready = null
            throw err
        })
    }
    return ready
}

function fontStack(fontFamily) {
    return `"${fontFamily}", "${EMOJI_FONT_FAMILY}"`
}

function wrapText(ctx, text, maxWidth, size, fontFamily) {
    ctx.font = `${size}px ${fontStack(fontFamily)}`
    const words = text.split(/\s+/).filter(Boolean)
    const lines = []
    let current = ''

    for (const word of words) {
        const test = current ? `${current} ${word}` : word
        if (ctx.measureText(test).width <= maxWidth) {
            current = test
        } else {
            if (current) lines.push(current)
            current = word
        }
    }
    if (current) lines.push(current)
    return lines
}

function fitText(ctx, text, maxWidth, maxHeight, maxFontSize, minFontSize, fontFamily) {
    for (let size = maxFontSize; size >= minFontSize; size--) {
        const lines = wrapText(ctx, text, maxWidth, size, fontFamily)
        const totalHeight = lines.length * size * LINE_HEIGHT_RATIO
        if (totalHeight <= maxHeight) return { size, lines }
    }
    return { size: minFontSize, lines: wrapText(ctx, text, maxWidth, minFontSize, fontFamily) }
}

export default {
    cmd: ['iqc'],
    category: 'tools',
    run: async (m, { sock, text, prefix, cmd }) => {
        if (!text) return m.reply(`Masukkan teksnya.\nContoh: *${prefix + cmd} halo apa kabar*`)

        await m.react('⏳')
        try {
            await ensureAssets()

            const bg = await loadImage(await fsp.readFile(BG_CACHE_PATH))
            const canvas = createCanvas(bg.width, bg.height)
            const ctx = canvas.getContext('2d')
            ctx.drawImage(bg, 0, 0)

            const bubbleX = bg.width * BUBBLE_X_R
            const bubbleY = bg.height * BUBBLE_Y_R
            const bubbleWidth = bg.width * BUBBLE_WIDTH_R
            const bubbleHeight = bg.height * BUBBLE_HEIGHT_R
            const padX = bg.width * PAD_X_R
            const padY = bg.height * PAD_Y_R
            const maxFontSize = bg.width * MAX_FONT_R
            const minFontSize = bg.width * MIN_FONT_R

            const maxWidth = bubbleWidth - padX * 2
            const maxHeight = bubbleHeight - padY * 2
            const { size, lines } = fitText(ctx, text, maxWidth, maxHeight, maxFontSize, minFontSize, FONT_FAMILY)

            ctx.font = `${size}px ${fontStack(FONT_FAMILY)}`
            ctx.fillStyle = TEXT_COLOR
            ctx.textBaseline = 'top'

            const lineHeight = size * LINE_HEIGHT_RATIO
            const startX = bubbleX + padX
            const startY = bubbleY + padY

            lines.forEach((line, i) => {
                ctx.fillText(line, startX, startY + i * lineHeight)
            })

            const buffer = canvas.toBuffer('image/png')
            await sock.sendImage(m.from, buffer, '', m)
            await m.react('✅')
        } catch (e) {
            console.error('IQC Error:', e)
            await m.react('❌')
            m.reply(`Gagal: ${e.message}`)
            throw e
        }
    }
}
