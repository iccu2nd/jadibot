import { ITEMS, getRpg, hasStarted, addItem, fmtMoney } from '../lib/rpg.js'

const WORLD_EVENT_CHANCE = 1 / 220
const WORLD_EVENT_COOLDOWN_MS = 25 * 60 * 1000
const WORLD_EVENT_DURATION_MS = 75 * 1000
const BONUS_MATERIAL_CHANCE = 0.35
const CLAIM_KEYWORDS = ['ambil', 'take', 'grab']

const BONUS_MATERIALS = ['besi_tua', 'kristal_sihir', 'inti_iblis']

const EVENT_FLAVORS = [
    {
        title: '🌟 PETI HARTA KARUN MUNCUL!',
        desc: 'Sebuah peti berkilau tiba-tiba muncul di tengah obrolan grup ini.',
        rewards: [{ min: 300, max: 600 }, { min: 150, max: 300 }, { min: 50, max: 150 }]
    },
    {
        title: '👹 MONSTER LIAR LEWAT!',
        desc: 'Seekor monster liar kabur lewat grup sambil menjatuhkan barang berharga.',
        rewards: [{ min: 250, max: 500 }, { min: 100, max: 250 }]
    },
    {
        title: '🧙 PEDAGANG MISTERIUS SINGGAH',
        desc: 'Pedagang aneh mampir sebentar dan membagi-bagikan uang ke siapapun yang gerak cepat.',
        rewards: [{ min: 200, max: 450 }, { min: 100, max: 200 }, { min: 50, max: 100 }]
    },
    {
        title: '🎁 HUJAN HADIAH DADAKAN',
        desc: 'Entah dari mana asalnya, hadiah tiba-tiba berjatuhan di grup ini.',
        rewards: [{ min: 150, max: 350 }, { min: 80, max: 180 }]
    }
]

const randRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

function endWorldEvent(sock, chat) {
    const event = sock.worldEvents?.[chat]
    if (!event) return
    clearTimeout(event.timer)
    delete sock.worldEvents[chat]

    if (!event.claimedBy.length) {
        sock.sendMessage(chat, { text: 'Event dunia berlalu begitu saja, tidak ada yang sempat mengambil hadiahnya.' }).catch(() => {})
    } else if (event.claimedBy.length < event.rewards.length) {
        sock.sendMessage(chat, { text: 'Event dunia berakhir, sisa hadiah hangus.' }).catch(() => {})
    }
}

async function maybeSpawnWorldEvent(sock, m) {
    const chat = m.chat
    const chatSettings = global.db.data.chats[chat]
    if (chatSettings?.worldEvent === false) return

    sock.worldEvents ??= {}
    if (sock.worldEvents[chat]?.active) return

    sock.worldEventLast ??= {}
    const last = sock.worldEventLast[chat] || 0
    if (Date.now() - last < WORLD_EVENT_COOLDOWN_MS) return
    if (Math.random() > WORLD_EVENT_CHANCE) return

    sock.worldEventLast[chat] = Date.now()

    const flavor = EVENT_FLAVORS[Math.floor(Math.random() * EVENT_FLAVORS.length)]
    const rewards = flavor.rewards.map(r => ({ money: randRange(r.min, r.max) }))

    const text = `${flavor.title}\n\n${flavor.desc}\n\nKetik *ambil* untuk rebutan hadiahnya! (${rewards.length} orang tercepat kebagian, bukan yang pertama saja)\nWaktu: ${Math.round(WORLD_EVENT_DURATION_MS / 1000)} detik`

    await sock.sendMessage(chat, { text }).catch(() => {})

    const timer = setTimeout(() => endWorldEvent(sock, chat), WORLD_EVENT_DURATION_MS)
    sock.worldEvents[chat] = { active: true, claimedBy: [], rewards, timer }
}

export default {
    cmd: ['worldevent', 'we'],
    category: 'rpg',

    run: async (m, { text, isAdmin }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya bisa diatur di dalam grup.')
        if (!isAdmin) return m.reply('Hanya admin grup yang bisa mengatur fitur ini.')

        const chat = global.db.data.chats[m.from]
        const action = text.toLowerCase().trim()

        if (action === 'off') {
            chat.worldEvent = false
            return m.reply('Event dunia dinonaktifkan di grup ini. Tidak akan ada event dadakan lagi sampai diaktifkan ulang.')
        }
        if (action === 'on') {
            chat.worldEvent = true
            return m.reply('Event dunia diaktifkan di grup ini. Event dadakan bisa muncul sewaktu-waktu di tengah obrolan.')
        }

        const status = chat.worldEvent === false ? 'OFF' : 'ON'
        return m.reply(`Status Event Dunia di grup ini: *[ ${status} ]*\n\nEvent dunia muncul acak di tengah obrolan grup, siapa cepat ketik *ambil* dapat hadiah money (kadang bonus material RPG juga).\n\nGunakan\n.worldevent on\n.worldevent off`)
    },

    onMessage: async (m, { sock }) => {
        if (!m || !m.message || m.key?.fromMe || !m.isGroup) return false

        const event = sock.worldEvents?.[m.chat]
        if (event?.active) {
            const guess = (m.body || '').trim().toLowerCase()
            if (!CLAIM_KEYWORDS.includes(guess)) return false
            if (event.claimedBy.includes(m.sender)) return false

            const tierIndex = event.claimedBy.length
            if (tierIndex >= event.rewards.length) return false

            event.claimedBy.push(m.sender)
            const reward = event.rewards[tierIndex]

            const user = global.db.data.users[m.sender] ??= {}
            user.money = (user.money || 0) + reward.money

            let bonusText = ''
            if (hasStarted(m.sender) && Math.random() < BONUS_MATERIAL_CHANCE) {
                const rpg = getRpg(m.sender)
                const matId = BONUS_MATERIALS[Math.floor(Math.random() * BONUS_MATERIALS.length)]
                addItem(rpg, matId, 1)
                bonusText = `\n+1 ${ITEMS[matId].name} (bonus RPG)`
            }

            const posisi = tierIndex + 1
            m.reply(`🎉 @${m.sender.split('@')[0]} berhasil ambil lebih dahulu! (posisi ke-${posisi})\n+${fmtMoney(reward.money)} money${bonusText}`)

            if (event.claimedBy.length >= event.rewards.length) endWorldEvent(sock, m.chat)
            return true
        }

        maybeSpawnWorldEvent(sock, m).catch(() => {})
        return false
    }
}
