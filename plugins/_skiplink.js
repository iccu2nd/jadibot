import axios from 'axios'
import * as bycfPkg from "bycf"

const bycf = bycfPkg.shannz || bycfPkg.shz || bycfPkg.default || bycfPkg

const IZEN = "https://izen.lol/api/bypass"
const SITEKEY = "0x4AAAAAADNEi_2N24gpQqY0"

async function bypassIzenLol(url) {
    try {
        const token = await bycf.turnstileMin("https://izen.lol", SITEKEY)
        if (!token) throw new Error("Gagal solve captcha turnstile")

        const response = await axios.post(
            IZEN,
            { url, captchaToken: token },
            {
                headers: {
                    "Content-Type": "application/json",
                    Referer: "https://izen.lol/",
                    Origin: "https://izen.lol",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    Accept: "application/json",
                    "Cache-Control": "no-cache",
                },
                timeout: 120000,
                validateStatus: () => true,
            }
        )

        if (response.status !== 200 || !response.data) {
            throw new Error(response.data?.message || "Gagal bypass link")
        }

        return {
            success: true,
            statusCode: response.status,
            data: response.data
        }
    } catch (error) {
        throw new Error(error.response?.data?.message || error.message)
    }
}

export default {
    cmd: ['bypass', 'skiplink', 'unlock'],
    category: 'tools',
    run: async (m, { sock, text, config }) => {
        if (!text) {
            return m.reply(
                `⌗ *Bypass Link\n\n` +
                `Masukkan URL yang ingin di-bypass!\n\n` +
                `*Contoh:*\n` +
                `.bypass https://sfl.gl/abc123\n` +
                `.bypass https://link-target.com\n\n`
            )
        }

        const targetUrl = text.trim()

        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            return m.reply('❌ URL tidak valid! Harus diawali http:// atau https://')
        }

        await m.reply('⌛ Memproses bypass...')

        try {
            const result = await bypassIzenLol(targetUrl)

            let responseText = `⌗ *Bypass Berhasil!*\n\n`
            responseText += `*Status:* ${result.statusCode}\n`
            responseText += `*Original:* ${targetUrl}\n\n`

            if (result.data.result) {
                if (typeof result.data.result === 'string') {
                    responseText += `*Direct Link:*\n${result.data.result}\n`
                } else if (typeof result.data.result === 'object') {
                    responseText += `*Result:*\n${JSON.stringify(result.data.result, null, 2)}\n`
                }
            }

            if (result.data.url) {
                responseText += `*URL:* ${result.data.url}\n`
            }

            if (result.data.destination) {
                responseText += `*Destination:* ${result.data.destination}\n`
            }

            if (result.data.message) {
                responseText += `*Message:* ${result.data.message}\n`
            }

            responseText += `\n> *${config.botName}*`

            return m.reply(responseText)

        } catch (e) {
            console.error(e)
            m.reply(
                `❌ *Gagal Bypass!*\n\n` +
                `*Error:* ${e.message}\n\n` +
                `Pastikan:\n` +
                `• URL valid dan aktif\n` +
                `• Coba lagi nanti`
            )
            throw e
        }
    }
}
