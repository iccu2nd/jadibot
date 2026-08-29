import axios from 'axios'
import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import os from 'os'
import ffmpeg from 'fluent-ffmpeg'
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { cacheFile } from '../lib/cache.js'

const FONT_URL = 'https://raw.githubusercontent.com/reyzdesu/bot-assets/main/fonts/impact.ttf'
const FONT_PATH = path.join(os.homedir(), '.fonts', 'impact.ttf')
const FONT_FAMILY = 'Impact-Meme'
const EMOJI_CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64'
const EMOJI_CACHE_DIR = path.join(os.homedir(), '.cache', 'yumibot', 'emoji')
const EMOJI_CACHE_MAX_BYTES = 5 * 1024 * 1024
const MAX_DIMENSION = 1600
const ANIMATED_MAX_DIMENSION = 512
const MIN_FONT_SIZE = 16
const EMOJI_TEST = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u
let fontReady = null
const emojiImageCache = new Map()

function ensureFont() {
    if (!fontReady) {
        fontReady = (async () => {
            const exists = await fsp.access(FONT_PATH).then(() => true).catch(() => false)
            if (!exists) {
                const res = await axios.get(FONT_URL, { responseType: 'arraybuffer', timeout: 20000 })
                await fsp.mkdir(path.dirname(FONT_PATH), { recursive: true })
                await fsp.writeFile(FONT_PATH, Buffer.from(res.data))
            }
            GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY)
        })().catch(err => {
            fontReady = null
            throw err
        })
    }
    return fontReady
}

const segmentGraphemes = text => Intl.Segmenter
    ? Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text), s => s.segment)
    : Array.from(text)

const isEmoji = g => EMOJI_TEST.test(g)

const touchCacheFile = filePath => {
    const now = new Date()
    fsp.utimes(filePath, now, now).catch(() => {})
}

async function enforceCacheLimit(dir, maxBytes) {
    let names
    try {
        names = await fsp.readdir(dir)
    } catch (e) {
        return
    }
    const entries = (await Promise.all(names.map(async name => {
        const p = path.join(dir, name)
        try {
            const stat = await fsp.stat(p)
            return { path: p, size: stat.size, mtime: stat.mtimeMs }
        } catch (e) {
            return null
        }
    }))).filter(Boolean)

    let total = entries.reduce((s, e) => s + e.size, 0)
    if (total <= maxBytes) return
    entries.sort((a, b) => a.mtime - b.mtime)
    for (const entry of entries) {
        if (total <= maxBytes) break
        try {
            await fsp.unlink(entry.path)
            total -= entry.size
        } catch (e) {}
    }
}

function emojiFilenameVariants(grapheme) {
    const codepoints = Array.from(grapheme).map(c => c.codePointAt(0))
    const withoutFe0f = codepoints.filter(cp => cp !== 0xfe0f).map(cp => cp.toString(16)).join('-')
    const withFe0f = codepoints.map(cp => cp.toString(16)).join('-')
    return [...new Set([withoutFe0f, withFe0f])]
}

async function getEmojiImage(grapheme) {
    const variants = emojiFilenameVariants(grapheme)
    const cacheKey = variants[0]
    if (emojiImageCache.has(cacheKey)) return emojiImageCache.get(cacheKey)

    for (const name of variants) {
        const filePath = path.join(EMOJI_CACHE_DIR, `${name}.png`)
        try {
            let buf
            const cachedBuf = await fsp.readFile(filePath).catch(() => null)
            if (cachedBuf) {
                buf = cachedBuf
                touchCacheFile(filePath)
            } else {
                const res = await axios.get(`${EMOJI_CDN}/${name}.png`, { responseType: 'arraybuffer', timeout: 15000 })
                buf = Buffer.from(res.data)
                await fsp.mkdir(EMOJI_CACHE_DIR, { recursive: true })
                await fsp.writeFile(filePath, buf)
                enforceCacheLimit(EMOJI_CACHE_DIR, EMOJI_CACHE_MAX_BYTES).catch(() => {})
            }
            const img = await loadImage(buf)
            emojiImageCache.set(cacheKey, img)
            return img
        } catch (e) {
            continue
        }
    }
    throw new Error(`emoji not found: ${grapheme}`)
}

function tokenizeWord(word) {
    const graphemes = segmentGraphemes(word)
    const runs = []
    for (const g of graphemes) {
        const type = isEmoji(g) ? 'emoji' : 'text'
        if (type === 'text' && runs.length && runs[runs.length - 1].type === 'text') {
            runs[runs.length - 1].value += g
        } else {
            runs.push({ type, value: g })
        }
    }
    return runs
}

const capHeightFor = (ctx, size) => {
    ctx.font = `${size}px "${FONT_FAMILY}"`
    return ctx.measureText('A').actualBoundingBoxAscent || size * 0.72
}

const measureRuns = (ctx, runs, size, emojiSize) => {
    ctx.font = `${size}px "${FONT_FAMILY}"`
    const widths = runs.map(run => run.type === 'emoji' ? emojiSize : ctx.measureText(run.value).width)
    return { widths, width: widths.reduce((s, w) => s + w, 0) }
}

function fitText(ctx, text, maxWidth, startSize) {
    const wordRuns = text.toUpperCase().split(/\s+/).filter(Boolean).map(tokenizeWord)
    for (let size = startSize; size >= MIN_FONT_SIZE; size--) {
        const capHeight = capHeightFor(ctx, size)
        const emojiSize = capHeight * 1.25
        const spaceWidth = ctx.measureText(' ').width
        const wordMeasures = wordRuns.map(runs => measureRuns(ctx, runs, size, emojiSize))
        const lineWidth = wordMeasures.reduce((s, m) => s + m.width, 0) + spaceWidth * Math.max(0, wordRuns.length - 1)
        if (lineWidth <= maxWidth || size === MIN_FONT_SIZE) return { size, wordRuns, wordMeasures, lineWidth, spaceWidth, capHeight, emojiSize }
    }
}

async function drawMemeBlock(ctx, text, canvasWidth, canvasHeight, maxWidth, maxFontSize, margin, anchor) {
    const { size, wordRuns, wordMeasures, lineWidth, spaceWidth, capHeight, emojiSize } = fitText(ctx, text, maxWidth, maxFontSize)
    ctx.font = `${size}px "${FONT_FAMILY}"`
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#000'
    ctx.lineWidth = Math.max(2, Math.round(size / 12))
    ctx.lineJoin = 'round'
    ctx.textBaseline = 'alphabetic'

    const baselineY = anchor === 'top' ? margin + capHeight : canvasHeight - margin
    const emojiY = baselineY - capHeight / 2 - emojiSize / 2
    let cursorX = canvasWidth / 2 - lineWidth / 2

    for (let i = 0; i < wordRuns.length; i++) {
        const runs = wordRuns[i]
        const widths = wordMeasures[i].widths
        for (let j = 0; j < runs.length; j++) {
            const run = runs[j]
            const w = widths[j]
            if (run.type === 'emoji') {
                const img = await getEmojiImage(run.value)
                ctx.drawImage(img, cursorX, emojiY, emojiSize, emojiSize)
            } else {
                ctx.strokeText(run.value, cursorX, baselineY)
                ctx.fillText(run.value, cursorX, baselineY)
            }
            cursorX += w
        }
        cursorX += spaceWidth
    }
}

async function renderOverlay(width, height, top, bottom) {
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    const maxWidth = width * 0.9
    const maxFontSize = Math.floor(width / 5)
    const margin = height * 0.03

    if (top) await drawMemeBlock(ctx, top, width, height, maxWidth, maxFontSize, margin, 'top')
    if (bottom) await drawMemeBlock(ctx, bottom, width, height, maxWidth, maxFontSize, margin, 'bottom')

    return canvas.toBuffer('image/png')
}

const convertVideoToWebp = async (buffer) => {
    const tempIn = cacheFile('smeme_in.mp4')
    const tempOut = cacheFile('smeme_out.webp')

    const cleanup = async () => {
        await fsp.unlink(tempIn).catch(() => {})
        await fsp.unlink(tempOut).catch(() => {})
    }

    await fsp.writeFile(tempIn, buffer)

    try {
        await new Promise((resolve, reject) => {
            ffmpeg(tempIn)
                .addInputOptions(['-t', '6'])
                .addOutputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', `scale=${ANIMATED_MAX_DIMENSION}:${ANIMATED_MAX_DIMENSION}:force_original_aspect_ratio=decrease`,
                    '-loop', '0',
                    '-preset', 'default',
                    '-qscale', '60',
                    '-vsync', 'cfr',
                    '-r', '12',
                    '-an'
                ])
                .toFormat('webp')
                .save(tempOut)
                .on('end', resolve)
                .on('error', reject)
        })

        const stat = await fsp.stat(tempOut).catch(() => null)
        if (!stat || stat.size === 0) throw new Error('Konversi video gagal')
        return await fsp.readFile(tempOut)
    } finally {
        await cleanup()
    }
}

export default {
    cmd: ['smeme'],
    category: 'tools',
    run: async (m, { sock, text, prefix, cmd }) => {
        let url = ''
        let rest = text || ''

        if (/^https?:\/\/\S+/i.test(rest)) {
            const parts = rest.split('|')
            url = parts.shift().trim()
            rest = parts.join('|')
        }

        const parts = rest.split('|').map(v => v.trim())
        const [top, bottom] = parts.length > 1 ? [parts[1] || '', parts[0]] : ['', parts[0] || '']
        const hasDirectMedia = /image|video/.test(m.type || '')
        if (!url && !m.quoted && !hasDirectMedia) {
            return m.reply(
                `⌗ *Meme Maker*\n\n` +
                `Timpa gambar/video/stiker dengan teks meme (atas/bawah).\n\n` +
                `› Kirim/reply gambar atau video: *${prefix + cmd} teks bawah|teks atas*\n` +
                `› Pakai url: *${prefix + cmd} https://url-gambar.jpg|teks bawah|teks atas*\n\n` +
                `> *${prefix + cmd}*`
            )
        }
        if (!top && !bottom) return m.reply(`Isi minimal salah satu teks (atas/bawah).\nContoh: *${prefix + cmd} teks bawah|teks atas*`)

        await m.react('⏳')

        try {
            await ensureFont()

            const sharp = (await import('sharp')).default
            let imageBuffer

            if (url) {
                const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
                imageBuffer = Buffer.from(res.data)
            } else {
                const buf = await m.download()
                if (!buf || !/image|video/.test(buf.mimetype || '')) return m.reply('Gambar/video yang di-reply tidak valid.')
                imageBuffer = /^video\//.test(buf.mimetype || '') ? await convertVideoToWebp(buf) : buf
            }

            const probe = sharp(imageBuffer, { animated: true })
            const meta = await probe.metadata()
            const pages = meta.pages || 1

            if (pages > 1) {
                const frameHeight = meta.pageHeight || Math.round(meta.height / pages)
                const scale = Math.min(1, ANIMATED_MAX_DIMENSION / Math.max(meta.width, frameHeight))
                const width = Math.round(meta.width * scale)
                const height = Math.round(frameHeight * scale)

                const overlayBuffer = await renderOverlay(width, height, top, bottom)
                const composites = Array.from({ length: pages }, (_, i) => ({ input: overlayBuffer, top: i * height, left: 0 }))

                const composed = await sharp(imageBuffer, { animated: true })
                    .resize(width, height)
                    .composite(composites)
                    .webp({ quality: 80, pageHeight: height, loop: 0 })
                    .toBuffer()

                await sock.sendSticker(m.from, composed, m)
            } else {
                let width = meta.width
                let height = meta.height
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
                    width = Math.round(width * scale)
                    height = Math.round(height * scale)
                }

                const resized = await sharp(imageBuffer).resize(width, height).png().toBuffer()
                const overlayBuffer = await renderOverlay(width, height, top, bottom)
                const composed = await sharp(resized).composite([{ input: overlayBuffer, top: 0, left: 0 }]).webp({ quality: 90 }).toBuffer()

                await sock.sendSticker(m.from, composed, m)
            }

            await m.react('✅')
        } catch (e) {
            console.error('Meme Error:', e)
            await m.react('❌')
            m.reply(`❌ Gagal: ${e.message}`)
            throw e
        }
    }
}
