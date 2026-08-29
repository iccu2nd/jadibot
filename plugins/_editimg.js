import axios from 'axios'
import FormData from 'form-data'
import { pone } from '../lib/uploader.js'

const CONFIG = {
    baseUrl: 'https://api-v2.imgupscaler.ai',
    referer: 'https://magiceraser.org/',
    origin: 'https://magiceraser.org',
    userAgent:
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
}

const api = axios.create({
    baseURL: CONFIG.baseUrl,
    timeout: 60000,
    validateStatus: () => true
})

function generateSerial() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

function getHeaders(extra = {}) {
    return {
        'User-Agent': CONFIG.userAgent,
        Origin: CONFIG.origin,
        Referer: CONFIG.referer,
        'Product-Code': 'magiceraser',
        'Product-Serial': generateSerial(),
        'Router-Key': 'photo_editor_me_v6',
        'Sec-Ch-Ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        ...extra
    }
}

async function createJob(imageUrl, prompt) {
    const form = new FormData()

    form.append('model_name', 'magiceraser_v6')
    form.append('prompt', prompt)
    form.append('original_image_url', imageUrl)
    form.append('aspect_ratio', 'default')
    form.append('output_format', 'jpg')
    form.append('mode', 'editor')
    form.append('megapixels', '1')

    const response = await api.post(
        '/api/runtime/jobs/create-job',
        form,
        {
            headers: getHeaders(form.getHeaders()),
            timeout: 60000
        }
    )

    if (response.status !== 200) {
        throw new Error(`Server Error ${response.status}`)
    }

    if (response.data?.code !== 100000) {
        throw new Error(
            response.data?.message?.en ||
            response.data?.message ||
            'Gagal membuat job edit AI'
        )
    }

    const jobId = response.data?.result?.job_id

    if (!jobId) {
        throw new Error('Job ID tidak ditemukan')
    }

    return jobId
}

async function waitForResult(jobId) {
    const maxAttempts = 40
    const interval = 3000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const response = await api.get(
            `/api/runtime/jobs/get-job/${jobId}`,
            {
                headers: getHeaders(),
                timeout: 30000
            }
        )

        const result = response.data?.result
        const status = result?.status

        if (status === 1 && result?.output_url) {
            return result.output_url
        }

        if (status === -1) {
            throw new Error('Proses edit AI gagal')
        }

        await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('Timeout menunggu hasil edit AI')
}

export default {
    cmd: ['editimg', 'editimage'],
    category: 'tools',

    run: async (m, { sock, text, prefix, cmd }) => {
        const prompt = text?.trim()

        if (!m.quoted) {
            return m.reply(
                `Reply gambar yang ingin diedit.\n\n` +
                `Contoh:\n` +
                `${prefix + cmd} hapus orang di belakang`
            )
        }

        const quotedType = m.quoted.type

        if (quotedType !== 'imageMessage') {
            return m.reply('Reply gambar, bukan pesan lain.')
        }

        if (!prompt) {
            return m.reply(
                `Masukkan perintah edit gambar.\n\n` +
                `Contoh:\n` +
                `${prefix + cmd} hapus orang di belakang`
            )
        }

        await m.react('⏳')

        try {
            const image = await m.download()

            if (!image || !image.length) {
                throw new Error('Gagal mengunduh gambar dari WhatsApp')
            }

            const imageUrl = await pone(
                image,
                `rezora-edit-${Date.now()}.jpg`
            )

            if (!imageUrl) {
                throw new Error('Gagal mendapatkan URL gambar')
            }

            const jobId = await createJob(imageUrl, prompt)
            const resultUrl = await waitForResult(jobId)

            await sock.sendMessage(
                m.from,
                {
                    image: {
                        url: resultUrl
                    },
                    caption:
                        `Prompt: ${prompt}`
                },
                {
                    quoted: m
                }
            )

            await m.react('✅')

        } catch (e) {
            console.error('[EDITAI]', e)

            await m.react('❌')

            await m.reply(
                `Gagal memproses gambar.\n\n` +
                `> ${e.message}`
            )
        }
    }
}