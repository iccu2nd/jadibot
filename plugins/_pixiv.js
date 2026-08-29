import axios from 'axios'

const API = 'https://api.lolicon.app/setu/v2'

let _cache = null
let _cacheTime = 0
const PREFETCH_SIZE = 5
const CACHE_TTL = 60000

const prefetch = async (r18) => {
    const body = { r18, num: PREFETCH_SIZE, excludeAI: true, size: ['original', 'regular'] }
    const res = await axios.post(API, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
    })
    return res.data?.data || []
}

const getItem = async (r18) => {
    const now = Date.now()
    if (_cache?.r18 === r18 && _cache.items.length && now - _cacheTime < CACHE_TTL) {
        const item = _cache.items.shift()
        if (_cache.items.length < 2) prefetch(r18).then(items => { _cache = { r18, items }; _cacheTime = Date.now() }).catch(() => {})
        return item
    }
    const items = await prefetch(r18)
    const item = items.shift()
    _cache = { r18, items }
    _cacheTime = Date.now()
    return item
}

export default {
    cmd: ['pixiv', 'setu'],
    category: 'nsfw',
    run: async (m, { sock, text }) => {
        if (!text) {
            return sock.sendInteractiveButton(m.from, {
                title: 'Pixiv',
                body: 'Pilih mode gambar:',
                footer: '',
                buttons: [
                    {
                        type: 'list', label: '🖼️ Pilih Mode',
                        sections: [{
                            title: 'Mode',
                            rows: [
                                { title: '🔞 R18', description: 'Gambar dewasa', id: '.pixiv r18' },
                                { title: '✅ SFW', description: 'Gambar aman', id: '.pixiv sfw' },
                            ]
                        }]
                    }
                ]
            }, { quoted: m })
        }

        await m.react('⏳')

        try {
            const args = text.trim().split(/\s+/)
            const modeArg = args[0]?.toLowerCase()

            let r18 = 1
            let rest = args

            if (modeArg === 'sfw') { r18 = 0; rest = args.slice(1) }
            else if (modeArg === 'r18') { r18 = 1; rest = args.slice(1) }

            const keyword = /^\d+$/.test(rest[0]) ? rest.slice(1).join(' ') : rest.join(' ')
            const hasKeyword = keyword.trim().length > 0

            let item

            if (hasKeyword) {
                const body = { r18, num: 1, excludeAI: true, size: ['original', 'regular'], keyword }
                const res = await axios.post(API, body, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                })
                item = res.data?.data?.[0]
            } else {
                item = await getItem(r18)
            }

            if (!item) {
                await m.react('❌')
                return m.reply(`Tidak ada hasil${keyword ? ` untuk "${keyword}"` : ''}`)
            }

            const url = item.urls?.original || item.urls?.regular
            const tags = item.tags.filter(t => !['R-18', 'R-18G'].includes(t)).slice(0, 5).join(', ')

            await sock.sendInteractiveButton(m.from, {
                image: url,
                title: item.title,
                body: `👤 ${item.author}\n🔖 ${tags}`,
                footer: `pixiv.net/artworks/${item.pid}`,
                buttons: [
                    { type: 'reply', label: '🔁 Acak Lagi', id: r18 === 0 ? '.pixiv sfw' : '.pixiv r18' },
                    { type: 'url', label: '🌐 Buka Pixiv', url: `https://pixiv.net/artworks/${item.pid}` }
                ]
            }, { quoted: m })

            await m.react('✅')
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply(`❌ Gagal: ${e.message}`)
            throw e
        }
    }
}
