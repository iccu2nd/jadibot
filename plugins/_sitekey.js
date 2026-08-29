import axios from 'axios'
import * as cheerio from 'cheerio'

async function extractSitekey(url) {
    console.log(`Mulai scan: ${url}`)

    try {
        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        })

        const $ = cheerio.load(html)
        const sitekeys = new Set()

        $('script').each((_, el) => {
            const content = $(el).html() || ''

            const matches = content.match(
                /0x[A-Za-z0-9_-]{20,}/g
            )

            if (matches) {
                matches.forEach(key =>
                    sitekeys.add(key)
                )
            }
        })

        $('div.cf-turnstile, [data-sitekey]').each((_, el) => {

            const key = $(el).attr('data-sitekey')

            if (key && key.startsWith('0x')) {
                sitekeys.add(key)
            }

        })

        if (sitekeys.size) {
            return {
                method: 'HTML/DOM',
                keys: [...sitekeys]
            }
        }

        const jsFiles = [
            ...$('script')
                .map((_, el) => $(el).attr('src'))
                .get()
        ]
        .filter(src =>
            src &&
            src.includes('.js')
        )

        const preloadJs = [
            ...$('link[rel="preload"], link[rel="modulepreload"]')
                .map((_, el) => $(el).attr('href'))
                .get()
        ]
        .filter(src =>
            src &&
            src.includes('.js')
        )

        const allJs = [
            ...new Set([
                ...jsFiles,
                ...preloadJs
            ])
        ].slice(0, 15)

        for (const js of allJs) {

            try {

                const jsUrl =
                    js.startsWith('http')
                    ? js
                    : new URL(js, url).href

                const { data } = await axios.get(jsUrl, {
                    headers: {
                        'User-Agent':
                        'Mozilla/5.0'
                    },
                    timeout: 5000
                })

                const matches =
                    data.match(
                        /0x[A-Za-z0-9_-]{20,}/g
                    )

                if (matches) {
                    matches.forEach(key =>
                        sitekeys.add(key)
                    )
                }

            } catch {
                continue
            }

        }

        if (sitekeys.size) {

            return {
                method: 'External JS Scan',
                keys: [...sitekeys]
            }

        }

        return {
            method: 'None',
            keys: []
        }

    } catch (err) {

        console.error(err.message)

        return {
            method: 'Error',
            keys: []
        }
    }
}

export default {

    cmd: ['getsitekey', 'sitekey'],

    category: 'tools',

    description:
    'Mendeteksi sitekey dari website',

    run: async (
        m,
        {
            text
        }
    ) => {

        if (!text) {
            return m.reply(
                `Masukkan URL website\n\n` +
                `Contoh:\n` +
                `.getsitekey https://example.com`
            )
        }

        const url = text.trim()

        if (
            !url.startsWith('http://') &&
            !url.startsWith('https://')
        ) {

            return m.reply(
                'URL tidak valid'
            )

        }

        await m.reply(
            'Sedang melakukan scan...'
        )

        const result =
            await extractSitekey(url)

        if (!result.keys.length) {

            return m.reply(
                `Sitekey tidak ditemukan\n\n` +
                `Method: ${result.method}`
            )

        }

        let output =
        `Sitekey ditemukan\n\n`

        output +=
        `Website:\n${url}\n\n`

        output +=
        `Method:\n${result.method}\n\n`

        output +=
        `Keys:\n`

        result.keys.forEach(
            (key, i) => {
                output +=
                `${i + 1}. ${key}\n`
            }
        )

        return m.reply(output)

    }
}
