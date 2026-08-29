import axios from 'axios'

const DOMAIN_TEST = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(:\d+)?([/?#].*)?$/i

async function screenshotWeb(url, options = {}) {
    const width = options.width || 1440
    const height = options.height || 1024
    const fullPage = options.fullPage !== false
    const darkMode = options.darkMode || false
    const format = options.format || 'png'

    const apiUrl = `https://image.thum.io/get/fullpage/${fullPage ? 'true' : 'false'}/width/${width}/height/${height}/${darkMode ? 'dark/true/' : ''}${url}`

    const response = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    })

    return {
        buffer: Buffer.from(response.data),
        format: format
    }
}

export default {
    cmd: ['ssweb', 'screenshot', 'ss'],
    category: 'tools',
    run: async (m, { sock, text }) => {
        if (!text) return m.reply('Masukkan URL website.\nContoh: .ssweb example.com')

        const args = text.trim().split(' ')
        let url = args[0]

        if (!/^https?:\/\//i.test(url)) {
            if (!DOMAIN_TEST.test(url)) return m.reply('URL tidak valid. Pastikan ada akhiran domain seperti .com atau .id')
            url = `https://${url}`
        }

        let options = {}
        if (args.includes('--dark')) options.darkMode = true
        if (args.includes('--mobile')) { options.width = 375; options.height = 812 }

        await m.reply('Sedang mengambil screenshot...')
        try {
            const { buffer } = await screenshotWeb(url, options)

            let caption = `Screenshot Web\nURL: ${url}`
            if (options.darkMode) caption += '\nMode: Dark'
            if (options.width === 375) caption += '\nMode: Mobile'

            await sock.sendMessage(m.chat, {
                image: buffer,
                caption
            }, { quoted: m })

        } catch (e) {
            m.reply(`Gagal mengambil screenshot: ${e.message}`)
            throw e
        }
    }
}
