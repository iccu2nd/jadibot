import { getChatData } from './database.js'

export const DAILY_COOLDOWN = 24 * 60 * 60 * 1000
export const DAILY_BASE = 250
export const DAILY_STREAK_STEP = 25
export const DAILY_STREAK_CAP = 20
export const TRANSFER_TAX = 0.03
export const TRANSFER_TAX_MIN_FREE = 50

export const COOKIE_PRICE = 3000
export const COOKIE_BUFF_MS = 60 * 60 * 1000
export const COOKIE_BUFF_MULT = 0.5
export const COOKIE_MAX_STACK_MS = 3 * 60 * 60 * 1000

export const PRAY_COOLDOWN = 60 * 60 * 1000
export const PRAY_MIN = 20
export const PRAY_MAX = 80

export const freshOwo = () => ({
    cowoncy: 500,
    bank: 0,
    lastDaily: 0,
    dailyStreak: 0,
    totalEarned: 0,
    totalGambled: 0,
    lastHuntAnimal: 0,
    zoo: {},
    catchItems: {},
    essence: 0,
    levels: {},
    exp: {},
    team: [],
    weapon: null,
    lastPve: 0,
    lastPvp: 0,
    quests: null,
    spouse: null,
    marriedAt: 0,
    gems: {},
    gemBonus: { atk: 0, def: 0, exp: 0, catch: 0, earn: 0 },
    lootboxes: {},
    cookies: 0,
    cookieBuffUntil: 0,
    lastPray: 0,
    lastCurse: 0,
    prayers: 0,
    curses: 0,
    lastLootbox: 0,
    lastFusion: 0,
    teamSlots: 0
})

export const getOwo = jid => {
    const user = global.db.data.users[jid] ??= {}
    if (!user.owo) user.owo = freshOwo()
    const owo = user.owo
    owo.cowoncy ??= 0
    owo.bank ??= 0
    owo.lastDaily ??= 0
    owo.dailyStreak ??= 0
    owo.totalEarned ??= 0
    owo.totalGambled ??= 0
    owo.lastHuntAnimal ??= 0
    owo.zoo ??= {}
    owo.catchItems ??= {}
    owo.essence ??= 0
    owo.levels ??= {}
    owo.exp ??= {}
    owo.team ??= []
    owo.weapon ??= null
    owo.lastPve ??= 0
    owo.lastPvp ??= 0
    owo.quests ??= null
    owo.spouse ??= null
    owo.marriedAt ??= 0
    owo.gems ??= {}
    owo.gemBonus ??= { atk: 0, def: 0, exp: 0, catch: 0, earn: 0 }
    owo.gemBonus.atk ??= 0
    owo.gemBonus.def ??= 0
    owo.gemBonus.exp ??= 0
    owo.gemBonus.catch ??= 0
    owo.gemBonus.earn ??= 0
    owo.lootboxes ??= {}
    owo.cookies ??= 0
    owo.cookieBuffUntil ??= 0
    owo.lastPray ??= 0
    owo.lastCurse ??= 0
    owo.prayers ??= 0
    owo.curses ??= 0
    owo.lastFusion ??= 0
    owo.teamSlots ??= 0
    return owo
}

export function earnMultiplier(jid) {
    const owo = getOwo(jid)
    const gemMult = owo.gemBonus?.earn || 0
    const cookieMult = Date.now() < (owo.cookieBuffUntil || 0) ? COOKIE_BUFF_MULT : 0
    return 1 + gemMult + cookieMult
}

export const isCookieBuffActive = owo => Date.now() < (owo.cookieBuffUntil || 0)

export const hasOwo = jid => !!global.db.data.users[jid]?.owo

export const fmtCowoncy = n => `${(n || 0).toLocaleString('id-ID')} 🦴`

export const cooldownLeft = (last, cd) => Math.max(0, cd - (Date.now() - (last || 0)))

export function fmtMs(ms) {
    const s = Math.ceil(ms / 1000)
    if (s < 60) return `${s} detik`
    const m = Math.floor(s / 60)
    const rs = s % 60
    if (m < 60) return rs > 0 ? `${m} menit ${rs} detik` : `${m} menit`
    const h = Math.floor(m / 60)
    const rm = m % 60
    return rm > 0 ? `${h} jam ${rm} menit` : `${h} jam`
}

export const addCowoncy = (jid, amount) => {
    const owo = getOwo(jid)
    owo.cowoncy += amount
    if (amount > 0) owo.totalEarned += amount
    return owo.cowoncy
}

export const hasCowoncy = (jid, amount) => getOwo(jid).cowoncy >= amount

export const takeCowoncy = (jid, amount) => {
    const owo = getOwo(jid)
    if (owo.cowoncy < amount) return false
    owo.cowoncy -= amount
    return true
}

export function dailyReward(owo, jid) {
    const left = cooldownLeft(owo.lastDaily, DAILY_COOLDOWN)
    if (left > 0) return { claimed: false, left }

    const graceWindow = DAILY_COOLDOWN * 2
    const withinStreak = owo.lastDaily && (Date.now() - owo.lastDaily) <= graceWindow
    owo.dailyStreak = withinStreak ? Math.min(DAILY_STREAK_CAP, owo.dailyStreak + 1) : 1
    owo.lastDaily = Date.now()

    const base = DAILY_BASE + (owo.dailyStreak - 1) * DAILY_STREAK_STEP
    const reward = Math.floor(base * (jid ? earnMultiplier(jid) : 1))
    owo.cowoncy += reward
    owo.totalEarned += reward

    return { claimed: true, reward, streak: owo.dailyStreak }
}

export function calcTransferTax(amount) {
    if (amount <= TRANSFER_TAX_MIN_FREE) return 0
    return Math.floor(amount * TRANSFER_TAX)
}

export const RARITIES = {
    common: { label: 'Common', order: 1, weight: 45, catchBase: 0.70, sellPrice: 12, essence: 1 },
    uncommon: { label: 'Uncommon', order: 2, weight: 28, catchBase: 0.55, sellPrice: 40, essence: 2 },
    rare: { label: 'Rare', order: 3, weight: 15, catchBase: 0.40, sellPrice: 150, essence: 5 },
    epic: { label: 'Epic', order: 4, weight: 8, catchBase: 0.25, sellPrice: 525, essence: 12 },
    mythical: { label: 'Mythical', order: 5, weight: 3, catchBase: 0.12, sellPrice: 1575, essence: 30 },
    legendary: { label: 'Legendary', order: 6, weight: 1, catchBase: 0.05, sellPrice: 5000, essence: 80 },
    rahasia: { label: 'Secret', order: 7, weight: 0.02, catchBase: 0.03, sellPrice: 50000, essence: 400 }
}

export const ANIMALS = [
    { id: 'ayam', name: 'Ayam Kampung', emoji: '🐔', rarity: 'common', hp: 18, atk: 3, def: 2 },
    { id: 'kucing', name: 'Kucing Liar', emoji: '🐈', rarity: 'common', hp: 20, atk: 4, def: 2 },
    { id: 'tikus', name: 'Tikus Sawah', emoji: '🐀', rarity: 'common', hp: 15, atk: 3, def: 1 },
    { id: 'bebek', name: 'Bebek', emoji: '🦆', rarity: 'common', hp: 17, atk: 3, def: 2 },
    { id: 'anjing', name: 'Anjing Kampung', emoji: '🐕', rarity: 'common', hp: 22, atk: 4, def: 2 },
    { id: 'kambing', name: 'Kambing', emoji: '🐐', rarity: 'common', hp: 24, atk: 4, def: 3 },
    { id: 'kelinci', name: 'Kelinci', emoji: '🐇', rarity: 'common', hp: 14, atk: 2, def: 2 },
    { id: 'merpati', name: 'Burung Merpati', emoji: '🐦', rarity: 'common', hp: 12, atk: 2, def: 1 },
    { id: 'katak', name: 'Katak Sawah', emoji: '🐸', rarity: 'common', hp: 13, atk: 2, def: 1 },
    { id: 'siput', name: 'Siput Kebun', emoji: '🐌', rarity: 'common', hp: 10, atk: 1, def: 3 },
    { id: 'tupai', name: 'Tupai Kebun', emoji: '🐿️', rarity: 'common', hp: 16, atk: 3, def: 2 },
    { id: 'sapi', name: 'Sapi Perah', emoji: '🐄', rarity: 'common', hp: 26, atk: 3, def: 4 },
    { id: 'kupukupu', name: 'Kupu-Kupu', emoji: '🦋', rarity: 'common', hp: 9, atk: 1, def: 1 },

    { id: 'rubah', name: 'Rubah Merah', emoji: '🦊', rarity: 'uncommon', hp: 32, atk: 7, def: 4 },
    { id: 'rusa', name: 'Rusa Hutan', emoji: '🦌', rarity: 'uncommon', hp: 35, atk: 6, def: 5 },
    { id: 'landak', name: 'Landak', emoji: '🦔', rarity: 'uncommon', hp: 28, atk: 6, def: 6 },
    { id: 'monyet', name: 'Monyet Ekor Panjang', emoji: '🐒', rarity: 'uncommon', hp: 30, atk: 8, def: 3 },
    { id: 'musang', name: 'Musang Malam', emoji: '🦡', rarity: 'uncommon', hp: 29, atk: 7, def: 4 },
    { id: 'kelelawar', name: 'Kelelawar Gua', emoji: '🦇', rarity: 'uncommon', hp: 26, atk: 8, def: 3 },
    { id: 'ular', name: 'Ular Sawah', emoji: '🐍', rarity: 'uncommon', hp: 27, atk: 9, def: 3 },
    { id: 'kanguru', name: 'Kanguru Liar', emoji: '🦘', rarity: 'uncommon', hp: 34, atk: 7, def: 5 },
    { id: 'luwak', name: 'Luwak Kopi', emoji: '🐾', rarity: 'uncommon', hp: 31, atk: 7, def: 4 },
    { id: 'trenggiling', name: 'Trenggiling', emoji: '🦫', rarity: 'uncommon', hp: 33, atk: 5, def: 8 },

    { id: 'elang', name: 'Elang Jawa', emoji: '🦅', rarity: 'rare', hp: 55, atk: 14, def: 8 },
    { id: 'harimau', name: 'Harimau Sumatera', emoji: '🐅', rarity: 'rare', hp: 65, atk: 16, def: 9 },
    { id: 'beruang', name: 'Beruang Madu', emoji: '🐻', rarity: 'rare', hp: 70, atk: 13, def: 11 },
    { id: 'buaya', name: 'Buaya Muara', emoji: '🐊', rarity: 'rare', hp: 60, atk: 15, def: 12 },
    { id: 'serigala', name: 'Serigala Hutan', emoji: '🐺', rarity: 'rare', hp: 58, atk: 17, def: 8 },
    { id: 'singa', name: 'Singa Padang', emoji: '🦁', rarity: 'rare', hp: 68, atk: 18, def: 10 },
    { id: 'hiu', name: 'Hiu Karang', emoji: '🦈', rarity: 'rare', hp: 72, atk: 15, def: 10 },
    { id: 'gorila', name: 'Gorila Perkasa', emoji: '🦍', rarity: 'rare', hp: 75, atk: 14, def: 13 },
    { id: 'macantutul', name: 'Macan Tutul', emoji: '🐆', rarity: 'rare', hp: 62, atk: 17, def: 9 },

    { id: 'komodo', name: 'Komodo', emoji: '🦎', rarity: 'epic', hp: 100, atk: 22, def: 16 },
    { id: 'orangutan', name: 'Orangutan', emoji: '🦧', rarity: 'epic', hp: 95, atk: 20, def: 17 },
    { id: 'gajah', name: 'Gajah Sumatera', emoji: '🐘', rarity: 'epic', hp: 130, atk: 18, def: 22 },
    { id: 'badak', name: 'Badak Jawa', emoji: '🦏', rarity: 'epic', hp: 120, atk: 21, def: 24 },
    { id: 'banteng', name: 'Banteng Jawa', emoji: '🐂', rarity: 'epic', hp: 110, atk: 24, def: 19 },
    { id: 'walrus', name: 'Anjing Laut Raksasa', emoji: '🦭', rarity: 'epic', hp: 115, atk: 19, def: 21 },
    { id: 'kudanil', name: 'Kuda Nil', emoji: '🦛', rarity: 'epic', hp: 140, atk: 20, def: 25 },
    { id: 'yak', name: 'Yak Pegunungan', emoji: '🐃', rarity: 'epic', hp: 125, atk: 22, def: 20 },
    { id: 'beruangkutub', name: 'Beruang Kutub', emoji: '🐻‍❄️', rarity: 'epic', hp: 135, atk: 19, def: 23 },

    { id: 'unicorn', name: 'Unicorn Hutan', emoji: '🦄', rarity: 'mythical', hp: 180, atk: 32, def: 28 },
    { id: 'phoenix', name: 'Phoenix Api Abadi', emoji: '🔥', rarity: 'mythical', hp: 170, atk: 38, def: 22 },
    { id: 'griffin', name: 'Griffin Penjaga Gunung', emoji: '🦁', rarity: 'mythical', hp: 200, atk: 34, def: 30 },
    { id: 'kraken', name: 'Kraken Laut Dalam', emoji: '🐙', rarity: 'mythical', hp: 220, atk: 30, def: 34 },
    { id: 'sphinx', name: 'Sphinx Gurun', emoji: '🦁', rarity: 'mythical', hp: 190, atk: 36, def: 26 },

    { id: 'naga', name: 'Naga Legendaris', emoji: '🐲', rarity: 'legendary', hp: 400, atk: 60, def: 50 },
    { id: 'garuda', name: 'Garuda Emas', emoji: '🪽', rarity: 'legendary', hp: 380, atk: 65, def: 45 },
    { id: 'leviathan', name: 'Leviathan', emoji: '🐋', rarity: 'legendary', hp: 450, atk: 55, def: 58 },
    { id: 'qilin', name: 'Qilin Suci', emoji: '🐴', rarity: 'legendary', hp: 420, atk: 58, def: 55 },
    { id: 'behemoth', name: 'Behemoth', emoji: '🐘', rarity: 'legendary', hp: 460, atk: 62, def: 48 },

    { id: 'roh_semesta', name: 'Roh Semesta', emoji: '🌌', rarity: 'rahasia', hp: 600, atk: 90, def: 75 },
    { id: 'sang_pengamat', name: 'Sang Pengamat', emoji: '🔭', rarity: 'rahasia', hp: 777, atk: 111, def: 99 },
    { id: 'sang_penjaga_waktu', name: 'Sang Penjaga Waktu', emoji: '⏳', rarity: 'rahasia', hp: 690, atk: 100, def: 88 }
]

export const ANIMALS_BY_ID = Object.fromEntries(ANIMALS.map(a => [a.id, a]))
export const RARITY_ORDER = Object.keys(RARITIES).sort((a, b) => RARITIES[a].order - RARITIES[b].order)

export const CATCH_ITEMS = {
    tangan: { name: 'Tangan Kosong', price: 0, bonus: 0, consumable: false },
    jaring: { name: 'Jaring Sederhana', price: 3000, bonus: 0.15, consumable: true },
    bola: { name: 'Bola Tangkap', price: 8000, bonus: 0.30, consumable: true },
    cincin: { name: 'Cincin Emas', price: 20000, bonus: 0.50, consumable: true }
}

export const HUNT_ANIMAL_COOLDOWN = 10 * 1000
export const CATCH_WINDOW = 45 * 1000

export const pendingSpawns = new Map()

export const OWOBOOST_TIERS = ['rare', 'epic', 'mythical', 'legendary', 'rahasia']
export const OWOBOOST_ALLOWED = [1, 2, 4, 8]

export function getOwoBoostStatus(groupJid) {
    if (!groupJid || !groupJid.endsWith('@g.us')) {
        return { active: false, multiplier: 1, expiresAt: 0 }
    }

    const chat = getChatData(groupJid)
    chat.owoBoost ??= 1
    chat.owoBoostExpiry ??= 0

    const rawMultiplier = OWOBOOST_ALLOWED.includes(chat.owoBoost) ? chat.owoBoost : 1
    const expiresAt = chat.owoBoostExpiry || 0
    const stillValid = expiresAt === 0 || Date.now() < expiresAt
    const active = rawMultiplier > 1 && stillValid

    if (rawMultiplier > 1 && !stillValid) {
        chat.owoBoost = 1
        chat.owoBoostExpiry = 0
    }

    return { active, multiplier: active ? rawMultiplier : 1, expiresAt: active ? expiresAt : 0 }
}

export function pickRarity(groupJid) {
    const { multiplier: boost } = getOwoBoostStatus(groupJid)

    const weights = {}
    let totalWeight = 0
    for (const key of Object.keys(RARITIES)) {
        const w = RARITIES[key].weight * (OWOBOOST_TIERS.includes(key) ? boost : 1)
        weights[key] = w
        totalWeight += w
    }

    let roll = Math.random() * totalWeight
    for (const key of Object.keys(RARITIES)) {
        roll -= weights[key]
        if (roll <= 0) return key
    }
    return 'common'
}

export function pickAnimal(rarityKey) {
    const pool = ANIMALS.filter(a => a.rarity === rarityKey)
    return pool[Math.floor(Math.random() * pool.length)]
}

export function rollCatch(rarityKey, itemKey, jid) {
    const rarity = RARITIES[rarityKey]
    const item = CATCH_ITEMS[itemKey] || CATCH_ITEMS.tangan
    const gemBonus = jid ? (getOwo(jid).gemBonus?.catch || 0) : 0
    const chance = Math.min(0.95, rarity.catchBase + item.bonus + gemBonus)
    return Math.random() < chance
}

export function addToZoo(jid, animalId, qty = 1) {
    const owo = getOwo(jid)
    owo.zoo[animalId] = (owo.zoo[animalId] || 0) + qty
    return owo.zoo[animalId]
}

export function removeFromZoo(jid, animalId, qty = 1) {
    const owo = getOwo(jid)
    if (!owo.zoo[animalId] || owo.zoo[animalId] < qty) return false
    owo.zoo[animalId] -= qty
    if (owo.zoo[animalId] <= 0) delete owo.zoo[animalId]
    return true
}

export function zooCount(jid, animalId) {
    return getOwo(jid).zoo[animalId] || 0
}

export function totalZooCount(jid) {
    return Object.values(getOwo(jid).zoo).reduce((a, b) => a + b, 0)
}

export function addCatchItem(jid, itemKey, qty = 1) {
    const owo = getOwo(jid)
    owo.catchItems[itemKey] = (owo.catchItems[itemKey] || 0) + qty
    return owo.catchItems[itemKey]
}

export function useCatchItem(jid, itemKey) {
    if (itemKey === 'tangan') return true
    const owo = getOwo(jid)
    if (!owo.catchItems[itemKey] || owo.catchItems[itemKey] < 1) return false
    owo.catchItems[itemKey] -= 1
    if (owo.catchItems[itemKey] <= 0) delete owo.catchItems[itemKey]
    return true
}

export function findAnimalByQuery(query) {
    const raw = query.trim().toLowerCase()
    const normalized = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    const idQuery = normalized.replace(/ /g, '_')
    return ANIMALS.find(a => a.id === raw || a.id === idQuery) || ANIMALS.find(a => a.name.toLowerCase().includes(normalized))
}

export const FUSION_REQUIREMENTS = {
    common: 10,
    uncommon: 8,
    rare: 6,
    epic: 5,
    mythical: 4
}

export const FUSION_SUCCESS_RATE = {
    common: 0.85,
    uncommon: 0.75,
    rare: 0.65,
    epic: 0.55,
    mythical: 0.45
}

export const FUSION_COOLDOWN = 5 * 60 * 1000
export const FUSION_CONFIRM_WINDOW = 30 * 1000
export const pendingFusions = new Map()

export function nextRarityKey(rarityKey) {
    const order = RARITIES[rarityKey]?.order
    if (!order) return null
    const nextEntry = Object.entries(RARITIES).find(([, r]) => r.order === order + 1)
    return nextEntry ? nextEntry[0] : null
}

export const MAX_TEAM_SIZE = 3
export const MAX_TEAM_EXTRA_SLOTS = 2
export const TEAM_SLOT_BASE_PRICE = 15000
export const TEAM_SLOT_PRICE_MULTIPLIER = 2

export function teamSlotLimit(jid) {
    const owo = getOwo(jid)
    return MAX_TEAM_SIZE + (owo.teamSlots || 0)
}

export function nextTeamSlotPrice(jid) {
    const owo = getOwo(jid)
    const owned = owo.teamSlots || 0
    if (owned >= MAX_TEAM_EXTRA_SLOTS) return null
    return Math.round(TEAM_SLOT_BASE_PRICE * Math.pow(TEAM_SLOT_PRICE_MULTIPLIER, owned))
}

export function buyTeamSlot(jid) {
    const owo = getOwo(jid)
    const price = nextTeamSlotPrice(jid)
    if (price === null) return { ok: false, reason: 'max' }
    if (owo.cowoncy < price) return { ok: false, reason: 'cowoncy', price }
    owo.cowoncy -= price
    owo.teamSlots = (owo.teamSlots || 0) + 1
    return { ok: true, price, total: owo.teamSlots }
}

export const WEAPONS = {
    kayu: { name: 'Pedang Kayu', essence: 5, price: 3000, atk: 5, def: 0 },
    besi: { name: 'Pedang Besi', essence: 20, price: 9000, atk: 15, def: 5 },
    perisai: { name: 'Perisai Baja', essence: 30, price: 12000, atk: 5, def: 25 },
    naga: { name: 'Pedang Naga', essence: 100, price: 40000, atk: 45, def: 20 },
    legendaris: { name: 'Senjata Legendaris', essence: 250, price: 90000, atk: 80, def: 50 }
}

export const BOSSES = [
    { id: 'goblin', name: 'Raja Goblin', emoji: '👺', hp: 300, atk: 25, def: 10, goldMin: 200, goldMax: 400, expMin: 40, expMax: 70 },
    { id: 'ogre', name: 'Ogre Raksasa', emoji: '👹', hp: 550, atk: 38, def: 18, goldMin: 400, goldMax: 700, expMin: 70, expMax: 110 },
    { id: 'naga_hitam', name: 'Naga Hitam', emoji: '🐉', hp: 900, atk: 55, def: 30, goldMin: 800, goldMax: 1400, expMin: 120, expMax: 180 },
    { id: 'titan', name: 'Titan Purba', emoji: '🗿', hp: 1500, atk: 75, def: 45, goldMin: 1500, goldMax: 2500, expMin: 200, expMax: 320 }
]

export const PVE_COOLDOWN = 5 * 60 * 1000
export const PVP_COOLDOWN = 5 * 60 * 1000
export const PVP_STEAL_RATE = 0.10
export const PVP_STEAL_CAP = 500

export const DUEL_ROUND_MS = 7000
export const DUEL_FAST_ROUND_MS = 3000
export const DUEL_MAX_ROUNDS = 10
export const pendingDuels = new Map()

export function renderHpBar(hp, maxHp, size = 10) {
    const ratio = maxHp > 0 ? Math.max(0, hp) / maxHp : 0
    const filled = Math.max(0, Math.min(size, Math.round(ratio * size)))
    return '🟩'.repeat(filled) + '⬜'.repeat(size - filled)
}

export function buildFighter(jid, name) {
    const power = teamPower(jid)
    const ultOptions = getSecretAnimalsInTeam(jid)
    return {
        jid,
        name,
        maxHp: power.hp,
        hp: power.hp,
        atk: power.atk,
        def: power.def,
        atkBoostThisRound: 0,
        ultOptions,
        ult: { animalId: ultOptions[0] || null, available: ultOptions.length > 0, used: false },
        ultIntent: false
    }
}

export function chooseUltimate(fighter, animalQuery) {
    if (!fighter.ultOptions.length) return false
    if (!animalQuery) return true
    const found = fighter.ultOptions.find(id => id === animalQuery || ANIMALS_BY_ID[id]?.name.toLowerCase().includes(animalQuery.toLowerCase()))
    if (!found) return false
    fighter.ult.animalId = found
    return true
}

function applyUltimate(fighter, opponent) {
    if (!fighter.ultIntent || !fighter.ult.available || fighter.ult.used) return null
    const skill = SECRET_SKILLS[fighter.ult.animalId]
    if (!skill) return null

    fighter.ult.used = true
    fighter.ultIntent = false

    if (skill.type === 'truedamage') {
        const dmg = Math.max(1, Math.round(opponent.maxHp * skill.value))
        opponent.hp = Math.max(0, opponent.hp - dmg)
        return { fighter, skill, text: `${skill.emoji} *${fighter.name}* melepas ultimate *${skill.name}*!\n➜ Damage murni tembus DEF: ${dmg}` }
    }
    if (skill.type === 'atkboost') {
        fighter.atkBoostThisRound = skill.value
        return { fighter, skill, text: `${skill.emoji} *${fighter.name}* melepas ultimate *${skill.name}*!\n➜ ATK meroket, serangan ronde ini dijamin telak!` }
    }
    if (skill.type === 'heal') {
        const heal = Math.round(fighter.maxHp * skill.value)
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + heal)
        return { fighter, skill, text: `${skill.emoji} *${fighter.name}* melepas ultimate *${skill.name}*!\n➜ Pulih +${heal} HP!` }
    }
    return null
}

function duelHit(attacker, defender) {
    const atk = Math.round(attacker.atk * (1 + (attacker.atkBoostThisRound || 0)))
    return Math.max(1, atk - Math.floor(defender.def / 2) - Math.floor(Math.random() * 3))
}

export function resolveDuelRound(fA, fB) {
    const lines = []

    const ultA = applyUltimate(fA, fB)
    if (ultA) lines.push(ultA.text)
    const ultB = applyUltimate(fB, fA)
    if (ultB) lines.push(ultB.text)

    if (fB.hp > 0) {
        const dmgToB = duelHit(fA, fB)
        fB.hp = Math.max(0, fB.hp - dmgToB)
        lines.push(`⚔️ ${fA.name} menyerang ${fB.name}: -${dmgToB} HP`)
    }
    if (fA.hp > 0 && fB.hp > 0) {
        const dmgToA = duelHit(fB, fA)
        fA.hp = Math.max(0, fA.hp - dmgToA)
        lines.push(`⚔️ ${fB.name} menyerang ${fA.name}: -${dmgToA} HP`)
    }

    fA.atkBoostThisRound = 0
    fB.atkBoostThisRound = 0

    return lines
}

export const getLevel = (jid, animalId) => getOwo(jid).levels[animalId] || 1

export const expForLevel = level => Math.floor(50 * Math.pow(level, 1.5))

export function addAnimalExp(jid, animalId, exp) {
    const owo = getOwo(jid)
    const mult = 1 + (owo.gemBonus?.exp || 0)
    const finalExp = Math.round(exp * mult)
    owo.exp[animalId] = (owo.exp[animalId] || 0) + finalExp
    let level = owo.levels[animalId] || 1
    let leveledUp = false
    while (owo.exp[animalId] >= expForLevel(level)) {
        owo.exp[animalId] -= expForLevel(level)
        level++
        leveledUp = true
    }
    owo.levels[animalId] = level
    return { level, leveledUp, expGained: finalExp }
}

export function animalStats(jid, animalId) {
    const base = ANIMALS_BY_ID[animalId]
    if (!base) return null
    const level = getLevel(jid, animalId)
    const mult = 1 + (level - 1) * 0.12
    return {
        hp: Math.round(base.hp * mult),
        atk: Math.round(base.atk * mult),
        def: Math.round(base.def * mult),
        level
    }
}

export const getTeam = jid => getOwo(jid).team || []

export function setTeam(jid, ids) {
    const owo = getOwo(jid)
    owo.team = ids.slice(0, teamSlotLimit(jid))
    return owo.team
}

export function teamPower(jid) {
    const owo = getOwo(jid)
    const team = owo.team || []
    let hp = 0, atk = 0, def = 0
    for (const id of team) {
        const s = animalStats(jid, id)
        if (!s) continue
        hp += s.hp
        atk += s.atk
        def += s.def
    }
    const gemBonus = owo.gemBonus || {}
    atk = Math.round(atk * (1 + (gemBonus.atk || 0)))
    def = Math.round(def * (1 + (gemBonus.def || 0)))
    const weapon = owo.weapon ? WEAPONS[owo.weapon] : null
    if (weapon) {
        atk += weapon.atk
        def += weapon.def
    }
    return { hp, atk, def }
}

export function simulateBattle(a, b, maxRounds = 20) {
    let hpA = a.hp, hpB = b.hp
    const log = []
    let round = 0
    while (hpA > 0 && hpB > 0 && round < maxRounds) {
        round++
        const dmgToB = Math.max(1, a.atk - Math.floor(b.def / 2) - Math.floor(Math.random() * 3))
        hpB -= dmgToB
        if (hpB <= 0) {
            log.push(`Ronde ${round}: Anda berikan ${dmgToB} damage, lawan tumbang.`)
            break
        }
        const dmgToA = Math.max(1, b.atk - Math.floor(a.def / 2) - Math.floor(Math.random() * 2))
        hpA -= dmgToA
        log.push(`Ronde ${round}: Anda kena ${dmgToA} dmg, lawan kena ${dmgToB} dmg.`)
        if (hpA <= 0) {
            log.push(`Ronde ${round}: Anda kalah lebih dahulu.`)
            break
        }
    }
    const winner = hpA > 0 && hpB <= 0 ? 'a' : hpB > 0 && hpA <= 0 ? 'b' : (hpA >= hpB ? 'a' : 'b')
    return { winner, hpA: Math.max(0, hpA), hpB: Math.max(0, hpB), log, rounds: round }
}

export const SECRET_SKILLS = {
    roh_semesta: {
        name: 'Ledakan Semesta',
        emoji: '🌌',
        type: 'truedamage',
        value: 0.35,
        desc: 'Damage murni 35% Max HP lawan, tembus DEF sepenuhnya.'
    },
    sang_pengamat: {
        name: 'Mata Pengamat',
        emoji: '🔭',
        type: 'atkboost',
        value: 1.0,
        desc: 'ATK meningkat 2x khusus di ronde ini, serangan dijamin telak.'
    },
    sang_penjaga_waktu: {
        name: 'Putar Waktu',
        emoji: '⏳',
        type: 'heal',
        value: 0.40,
        desc: 'Memutar waktu, memulihkan 40% Max HP seketika.'
    }
}

export function getSecretAnimalsInTeam(jid) {
    const team = getTeam(jid)
    return team.filter(id => SECRET_SKILLS[id])
}

export const GEM_CAP = 0.30

export const GEMS = {
    ruby: { name: 'Ruby Merah', emoji: '❤️‍🔥', effect: 'atk', amount: 0.03, desc: '+3% ATK tim (permanen)' },
    emerald: { name: 'Emerald Hijau', emoji: '💚', effect: 'def', amount: 0.03, desc: '+3% DEF tim (permanen)' },
    sapphire: { name: 'Sapphire Biru', emoji: '💙', effect: 'exp', amount: 0.05, desc: '+5% EXP pertarungan (permanen)' },
    topaz: { name: 'Topaz Kuning', emoji: '💛', effect: 'catch', amount: 0.03, desc: '+3% peluang tangkap hewan (permanen)' },
    diamond: { name: 'Diamond Putih', emoji: '🤍', effect: 'earn', amount: 0.04, desc: '+4% cowoncy dari daily & boss (permanen)' }
}

export const LOOTBOX_COOLDOWN = 30 * 1000

export const LOOTBOXES = {
    common: {
        name: 'Lootbox Biasa', emoji: '📦', price: 3000,
        pool: [
            { type: 'cowoncy', min: 50, max: 200, weight: 45 },
            { type: 'essence', min: 2, max: 6, weight: 25 },
            { type: 'catchItem', item: 'jaring', weight: 20 },
            { type: 'gem', gem: 'ruby', weight: 4 },
            { type: 'gem', gem: 'emerald', weight: 4 },
            { type: 'gem', gem: 'topaz', weight: 2 }
        ]
    },
    rare: {
        name: 'Lootbox Langka', emoji: '🎁', price: 9000,
        pool: [
            { type: 'cowoncy', min: 150, max: 500, weight: 35 },
            { type: 'essence', min: 6, max: 15, weight: 25 },
            { type: 'catchItem', item: 'bola', weight: 18 },
            { type: 'gem', gem: 'ruby', weight: 6 },
            { type: 'gem', gem: 'emerald', weight: 6 },
            { type: 'gem', gem: 'sapphire', weight: 5 },
            { type: 'gem', gem: 'topaz', weight: 4 },
            { type: 'gem', gem: 'diamond', weight: 1 }
        ]
    },
    epic: {
        name: 'Lootbox Epic', emoji: '🎉', price: 20000,
        pool: [
            { type: 'cowoncy', min: 400, max: 1200, weight: 30 },
            { type: 'essence', min: 15, max: 35, weight: 22 },
            { type: 'catchItem', item: 'cincin', weight: 12 },
            { type: 'gem', gem: 'ruby', weight: 9 },
            { type: 'gem', gem: 'emerald', weight: 9 },
            { type: 'gem', gem: 'sapphire', weight: 8 },
            { type: 'gem', gem: 'topaz', weight: 6 },
            { type: 'gem', gem: 'diamond', weight: 4 }
        ]
    }
}

export function addLootbox(jid, tier, qty = 1) {
    const owo = getOwo(jid)
    owo.lootboxes[tier] = (owo.lootboxes[tier] || 0) + qty
    return owo.lootboxes[tier]
}

export function pickFromPool(pool) {
    const total = pool.reduce((sum, r) => sum + r.weight, 0)
    let roll = Math.random() * total
    for (const entry of pool) {
        roll -= entry.weight
        if (roll <= 0) return entry
    }
    return pool[pool.length - 1]
}

export function openLootbox(jid, tier) {
    const box = LOOTBOXES[tier]
    if (!box) return { ok: false, reason: 'notfound' }

    const owo = getOwo(jid)
    if (!owo.lootboxes[tier] || owo.lootboxes[tier] < 1) return { ok: false, reason: 'none' }
    owo.lootboxes[tier] -= 1
    if (owo.lootboxes[tier] <= 0) delete owo.lootboxes[tier]

    const picked = pickFromPool(box.pool)

    if (picked.type === 'cowoncy') {
        const amount = Math.floor(picked.min + Math.random() * (picked.max - picked.min + 1))
        addCowoncy(jid, amount)
        return { ok: true, type: 'cowoncy', amount }
    }

    if (picked.type === 'essence') {
        const amount = Math.floor(picked.min + Math.random() * (picked.max - picked.min + 1))
        owo.essence += amount
        return { ok: true, type: 'essence', amount }
    }

    if (picked.type === 'catchItem') {
        addCatchItem(jid, picked.item, 1)
        return { ok: true, type: 'catchItem', item: picked.item }
    }

    if (picked.type === 'gem') {
        owo.gems[picked.gem] = (owo.gems[picked.gem] || 0) + 1
        return { ok: true, type: 'gem', gem: picked.gem }
    }

    return { ok: false, reason: 'error' }
}

export const SLOT_TIERS = [
    { id: 'mega', weight: 1, mult: 15, label: '💎💎💎 MEGA JACKPOT', symbol: '💎', matches: 3 },
    { id: 'jackpot', weight: 3, mult: 6, label: '🎉 JACKPOT', symbol: null, matches: 3 },
    { id: 'big', weight: 6, mult: 2.5, label: '✨ MENANG BESAR', symbol: null, matches: 2 },
    { id: 'win', weight: 20, mult: 1.3, label: '🙂 MENANG', symbol: null, matches: 2 },
    { id: 'partial', weight: 20, mult: 0.5, label: '💨 HAMPIR', symbol: null, matches: 0 },
    { id: 'lose', weight: 50, mult: 0, label: '❌ KALAH', symbol: null, matches: 0 }
]

export function spinSlots(amount) {
    const tier = pickFromPool(SLOT_TIERS)
    const prize = Math.floor(amount * tier.mult)
    return { tier, prize }
}

export const GODMODE_COWONCY = 999999999

export function applyOwoGodmode(jid) {
    const owo = getOwo(jid)
    owo.cowoncy = GODMODE_COWONCY
    owo.bank = GODMODE_COWONCY
    owo.essence = 99999
    owo.weapon = Object.keys(WEAPONS).pop()
    for (const gemId of Object.keys(GEMS)) {
        const gem = GEMS[gemId]
        owo.gemBonus[gem.effect] = GEM_CAP
    }
    return owo
}

export function canApplyGem(jid, gemId) {
    const gem = GEMS[gemId]
    if (!gem) return false
    const owo = getOwo(jid)
    const current = owo.gemBonus?.[gem.effect] || 0
    return current < GEM_CAP
}

export function applyGem(jid, gemId) {
    const gem = GEMS[gemId]
    if (!gem) return { ok: false, reason: 'notfound' }

    const owo = getOwo(jid)
    if (!owo.gems[gemId] || owo.gems[gemId] < 1) return { ok: false, reason: 'none' }

    const current = owo.gemBonus[gem.effect] || 0
    if (current >= GEM_CAP) return { ok: false, reason: 'capped' }

    owo.gems[gemId] -= 1
    if (owo.gems[gemId] <= 0) delete owo.gems[gemId]

    const applied = Math.min(GEM_CAP - current, gem.amount)
    owo.gemBonus[gem.effect] = current + applied

    return { ok: true, gem, applied, total: owo.gemBonus[gem.effect] }
}

export const QUEST_POOL = [
    { id: 'win3', desc: 'Menangkan 3 pertarungan (PvE/PvP)', statKey: 'winBattle', target: 3, reward: { cowoncy: 300 } },
    { id: 'slot5', desc: 'Main OwO Slots 5 kali', statKey: 'useSlots', target: 5, reward: { cowoncy: 150 } },
    { id: 'catchEpic1', desc: 'Tangkap 1 hewan Epic ke atas', statKey: 'catchEpicPlus', target: 1, reward: { cowoncy: 400, essence: 10 } },
    { id: 'hunt5', desc: 'Berburu hewan 5 kali', statKey: 'huntAnimal', target: 5, reward: { cowoncy: 100 } },
    { id: 'catch3', desc: 'Tangkap 3 hewan apapun', statKey: 'catchAny', target: 3, reward: { cowoncy: 200 } },
    { id: 'daily1', desc: 'Klaim daily reward', statKey: 'claimDaily', target: 1, reward: { cowoncy: 100 } },
    { id: 'transfer1', desc: 'Transfer cowoncy ke teman', statKey: 'transfer', target: 1, reward: { cowoncy: 80 } },
    { id: 'flip3', desc: 'Main coinflip 3 kali', statKey: 'coinflip', target: 3, reward: { cowoncy: 120 } },
    { id: 'lootbox1', desc: 'Buka 1 lootbox', statKey: 'openLootbox', target: 1, reward: { cowoncy: 100 } },
    { id: 'deposit1', desc: 'Deposit cowoncy ke bank', statKey: 'bankDeposit', target: 1, reward: { cowoncy: 80 } },
    { id: 'gemapply1', desc: 'Pakai 1 gem', statKey: 'applyGem', target: 1, reward: { cowoncy: 150 } }
]

const QUEST_COUNT = 3

const todayKey = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })

function generateQuests() {
    const pool = [...QUEST_POOL]
    const picked = []
    while (picked.length < QUEST_COUNT && pool.length) {
        const idx = Math.floor(Math.random() * pool.length)
        picked.push(pool.splice(idx, 1)[0])
    }
    return {
        date: todayKey(),
        list: picked.map(q => ({ id: q.id, progress: 0, claimed: false }))
    }
}

export function getQuests(jid) {
    const owo = getOwo(jid)
    if (!owo.quests || owo.quests.date !== todayKey()) owo.quests = generateQuests()
    return owo.quests
}

export function progressQuest(jid, statKey, amount = 1) {
    const quests = getQuests(jid)
    for (const entry of quests.list) {
        if (entry.claimed) continue
        const template = QUEST_POOL.find(q => q.id === entry.id)
        if (!template || template.statKey !== statKey) continue
        entry.progress = Math.min(template.target, entry.progress + amount)
    }
}

export function claimQuest(jid, questId) {
    const quests = getQuests(jid)
    const entry = quests.list.find(q => q.id === questId)
    if (!entry) return { ok: false, reason: 'notfound' }
    const template = QUEST_POOL.find(q => q.id === entry.id)
    if (entry.claimed) return { ok: false, reason: 'claimed' }
    if (entry.progress < template.target) return { ok: false, reason: 'incomplete' }

    entry.claimed = true
    const owo = getOwo(jid)
    if (template.reward.cowoncy) {
        owo.cowoncy += template.reward.cowoncy
        owo.totalEarned += template.reward.cowoncy
    }
    if (template.reward.essence) owo.essence += template.reward.essence

    return { ok: true, template }
}

export const questTemplate = id => QUEST_POOL.find(q => q.id === id)

export const ACTIONS = {
    hug: { verb: 'memeluk', selfVerb: 'memeluk diri sendiri', emoji: '🤗', endpoint: 'hug' },
    kiss: { verb: 'mencium', selfVerb: 'mencium kaca sambil membayangkan', emoji: '😘', endpoint: 'kiss' },
    pat: { verb: 'menepuk kepala', selfVerb: 'menepuk kepala sendiri', emoji: '🥰', endpoint: 'pat' },
    punch: { verb: 'meninju', selfVerb: 'memukul tembok', emoji: '👊', endpoint: 'punch' },
    slap: { verb: 'menampar', selfVerb: 'menampar diri sendiri', emoji: '🤚', endpoint: 'slap' },
    poke: { verb: 'mencolek', selfVerb: 'mencolek-colek udara', emoji: '👉', endpoint: 'poke' }
}

const NEKOS_API = 'https://nekos.best/api/v2/'
const NEKOS_USER_AGENT = 'RezoraBot/1.0 (https://github.com/rezora)'

export async function fetchActionGif(endpoint) {
    const res = await fetch(`${NEKOS_API}${endpoint}`, {
        headers: { 'User-Agent': NEKOS_USER_AGENT }
    })
    if (!res.ok) throw new Error('gagal ambil gif')
    const data = await res.json()
    const url = data.results?.[0]?.url
    if (!url) throw new Error('gif tidak ditemukan')
    return url
}

export async function fetchActionGifBuffer(endpoint) {
    const url = await fetchActionGif(endpoint)
    const res = await fetch(url, { headers: { 'User-Agent': NEKOS_USER_AGENT } })
    if (!res.ok) throw new Error('gagal download gif')
    return Buffer.from(await res.arrayBuffer())
}

export const RING_PRICE = 8000
export const PROPOSAL_WINDOW = 2 * 60 * 1000

export const pendingProposals = new Map()

export const isMarried = jid => !!getOwo(jid).spouse

export function marry(jidA, jidB) {
    const a = getOwo(jidA)
    const b = getOwo(jidB)
    a.spouse = jidB
    a.marriedAt = Date.now()
    b.spouse = jidA
    b.marriedAt = Date.now()
}

export function divorce(jid) {
    const owo = getOwo(jid)
    const spouse = owo.spouse
    owo.spouse = null
    owo.marriedAt = 0
    if (spouse) {
        const spouseOwo = getOwo(spouse)
        spouseOwo.spouse = null
        spouseOwo.marriedAt = 0
    }
    return spouse
}
