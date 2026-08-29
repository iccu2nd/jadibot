import axios from 'axios'

const BASE_URL = 'https://am.rafaelxd.my.id'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const GROUP_ID = '120363424104004132@g.us'
const OWNER_NUMBERS = ['6282322962313']

const HEADERS = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': `${BASE_URL}/dashboard/activation`,
    'Origin': BASE_URL,
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache'
}

let globalCookie = ''
let totalActivated = 0

async function getSession() {
    const res = await axios.get(`${BASE_URL}/`, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
        validateStatus: () => true
    })
    const setCookie = res.headers['set-cookie']
    if (setCookie) {
        const arr = Array.isArray(setCookie) ? setCookie : [setCookie]
        globalCookie = arr.map(c => c.split(';')[0]).join('; ')
    }
}

async function request(method, path, body = null) {
    if (!globalCookie) await getSession()
    const headers = { ...HEADERS }
    if (globalCookie) headers['Cookie'] = globalCookie
    const res = await axios({
        method,
        url: `${BASE_URL}${path}`,
        data: body,
        headers,
        timeout: 30000,
        validateStatus: () => true
    })
    if (res.headers['set-cookie']) {
        const arr = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : [res.headers['set-cookie']]
        const newCookies = arr.map(c => c.split(';')[0]).join('; ')
        globalCookie = newCookies
    }
    return res.data
}

async function sendMagicLink(email) {
    return request('POST', '/api/send', { email, website: '' })
}

async function verifyAndApplyPremium(email, rawLink) {
    const verifyResult = await request('POST', '/api/verify', { email, rawLink })
    if (!verifyResult.success) throw new Error(verifyResult.error || 'Verifikasi gagal')
    if (!verifyResult.idToken) throw new Error('idToken tidak ditemukan')

    const premiumResult = await request('POST', '/api/premium', {
        email,
        idToken: verifyResult.idToken
    })
    if (!premiumResult.success) throw new Error(premiumResult.error || 'Gagal apply premium')

    totalActivated++
    return premiumResult
}

function isOwner(sender) {
    const number = sender.replace(/[^0-9]/g, '')
    return OWNER_NUMBERS.some(owner => number.includes(owner))
}

const sessions = new Map()

export default {
    cmd: ['am2'],
    category: 'tools',
    run: async (m, { sock, text }) => {
        const chatId = m.chat
        const userId = m.sender
        const owner = isOwner(userId)

        if (chatId !== GROUP_ID && !owner) {
            return m.reply('Fitur ini hanya bisa digunakan di grup resmi atau oleh owner.')
        }

        const args = text?.trim().split(/\s+/) || []
        const cmd = args[0]?.toLowerCase()

        if (!text) {
            return m.reply(
                '*Alight Motion Premium v2*\n\n' +
                '*.am2 email@domain.com* - Kirim magic link\n' +
                '*.am2 <magic_link>* - Verifikasi & aktivasi (5 menit)\n' +
                '*.am2 stats* - Lihat total aktivasi'
            )
        }

        if (cmd === 'stats') {
            return m.reply(`*Statistik Aktivasi*\n\nTotal akun berhasil: *${totalActivated}*`)
        }

        if (text.includes('alight-creative.firebaseapp.com') || text.includes('oobCode')) {
            const link = text.trim()
            const session = sessions.get(userId)

            if (!session) {
                return m.reply('Session expired atau tidak ditemukan.\nGunakan *.am2 email@domain.com* untuk memulai.')
            }

            if (Date.now() - session.timestamp > 360000) {
                sessions.delete(userId)
                return m.reply('Session expired (3 menit).\nGunakan *.am2 email@domain.com* untuk memulai ulang.')
            }

            await m.reply('Memverifikasi & mengaktivasi premium...')
            try {
                const result = await verifyAndApplyPremium(session.email, link)
                sessions.delete(userId)
                return m.reply(
                    `*Premium Berhasil!*\n\n` +
                    `Email: ${result.email || session.email}\n` +
                    `Status: ${result.premiumStatus || 'ACTIVE'}\n` +
                    `Features: ${result.featuresUnlocked || '13'} Unlocked\n\n` +
                    `*Total: ${totalActivated} akun*`
                )
            } catch (e) {
                m.reply(`Error: ${e.message}`)
                throw e
            }
        }

        if (cmd === 'verify') {
            const session = sessions.get(userId)
            if (!session) return m.reply('Session expired. Gunakan *.am2 email@domain.com* terlebih dahulu.')
            if (Date.now() - session.timestamp > 180000) {
                sessions.delete(userId)
                return m.reply('Session expired (3 menit). Gunakan *.am2 email@domain.com* untuk memulai ulang.')
            }
            const link = args.slice(1).join(' ')
            if (!link || !link.includes('alight-creative.firebaseapp.com')) {
                return m.reply('Masukkan magic link yang valid!')
            }

            await m.reply('Memverifikasi & mengaktivasi premium...')
            try {
                const result = await verifyAndApplyPremium(session.email, link)
                sessions.delete(userId)
                return m.reply(
                    `*Premium Berhasil!*\n\n` +
                    `Email: ${result.email || session.email}\n` +
                    `Status: ${result.premiumStatus || 'ACTIVE'}\n` +
                    `Features: ${result.featuresUnlocked || '13'} Unlocked\n\n` +
                    `*Total: ${totalActivated} akun*`
                )
            } catch (e) {
                m.reply(`Error: ${e.message}`)
                throw e
            }
        }

        if (cmd.includes('@')) {
            const email = cmd
            await m.reply(`Mengirim magic link ke ${email}...`)
            try {
                const result = await sendMagicLink(email)
                if (!result.success) throw new Error(result.error || result.message || 'Gagal mengirim')

                sessions.set(userId, { email, timestamp: Date.now() })

                return m.reply(
                    `*Magic Link Terkirim!*\n\n` +
                    `Cek inbox/spam email ${email}\n` +
                    `Cari email dari Alight Creative\n` +
                    `Tahan tombol "Sign in" -> Copy link\n\n` +
                    `Lalu kirim langsung:\n` +
                    `*.am2 https://alight-creative.firebaseapp.com/...*\n\n` +
                    `*Expired dalam 5 menit!*`
                )
            } catch (e) {
                m.reply(`Error: ${e.message}`)
                throw e
            }
        }

        return m.reply('Perintah tidak dikenal.')
    }
}
