import { getOwo } from './owo.js'

export const CLASSES = {
    petarung: { name: 'Petarung', hp: 130, atk: 13, def: 9, desc: 'Tahan banting, cocok untuk pemain yang suka gaya bertarung langsung. HP besar, damage stabil.' },
    penyihir: { name: 'Penyihir', hp: 90, atk: 18, def: 4, desc: 'Damage paling sakit sejak awal permainan, tapi HP tipis dan mudah kalah kalau lengah.' },
    pembunuh: { name: 'Pembunuh', hp: 105, atk: 15, def: 6, desc: 'Serba seimbang, sesekali mengeluarkan serangan kritikal besar.' }
}

export const ITEMS = {
    pedang_karat: { name: 'Pedang Karat', type: 'weapon', atk: 4, price: 3000 },
    pedang_baja: { name: 'Pedang Baja', type: 'weapon', atk: 10, price: 9000 },
    pedang_naga: { name: 'Pedang Naga', type: 'weapon', atk: 22, price: 25000 },
    tongkat_kayu: { name: 'Tongkat Kayu', type: 'weapon', atk: 6, price: 3000 },
    tongkat_kristal: { name: 'Tongkat Kristal', type: 'weapon', atk: 16, price: 12000 },
    perisai_kayu: { name: 'Perisai Kayu', type: 'armor', def: 3, price: 3000 },
    zirah_besi: { name: 'Zirah Besi', type: 'armor', def: 8, price: 9000 },
    zirah_naga: { name: 'Zirah Naga', type: 'armor', def: 18, price: 25000 },
    ramuan_kecil: { name: 'Ramuan Kecil', type: 'potion', heal: 40, price: 3000 },
    ramuan_besar: { name: 'Ramuan Besar', type: 'potion', heal: 100, price: 6000 },

    besi_tua: { name: 'Besi Tua', type: 'material', price: 0 },
    kristal_sihir: { name: 'Kristal Sihir', type: 'material', price: 0 },
    inti_iblis: { name: 'Inti Iblis', type: 'material', price: 0 },

    pedang_legenda: { name: 'Pedang Legenda', type: 'weapon', atk: 34, price: 0, craft: { money: 30000, mats: { kristal_sihir: 4, inti_iblis: 2 } } },
    tongkat_arcane: { name: 'Tongkat Arcane', type: 'weapon', atk: 30, price: 0, craft: { money: 28000, mats: { kristal_sihir: 4, inti_iblis: 2 } } },
    zirah_titan: { name: 'Zirah Titan', type: 'armor', def: 30, price: 0, craft: { money: 30000, mats: { kristal_sihir: 4, inti_iblis: 2 } } },
    ramuan_dewa: { name: 'Ramuan Dewa', type: 'potion', heal: 9999, price: 0, craft: { money: 6000, mats: { kristal_sihir: 1 } } },

    pecahan_abyss: { name: 'Pecahan Abyss', type: 'material', price: 0 },

    pedang_abyssal: { name: 'Pedang Abyssal', type: 'weapon', atk: 52, price: 0, craft: { money: 60000, mats: { pecahan_abyss: 6, inti_iblis: 4 } } },
    tongkat_kegelapan: { name: 'Tongkat Kegelapan', type: 'weapon', atk: 46, price: 0, craft: { money: 55000, mats: { pecahan_abyss: 6, inti_iblis: 4 } } },
    zirah_abyssal: { name: 'Zirah Abyssal', type: 'armor', def: 46, price: 0, craft: { money: 60000, mats: { pecahan_abyss: 6, inti_iblis: 4 } } }
}

export const RANKS = [
    { id: 'perunggu', name: 'Perunggu', minLevel: 1, statPercent: 0 },
    { id: 'perak', name: 'Perak', minLevel: 10, statPercent: 3 },
    { id: 'emas', name: 'Emas', minLevel: 20, statPercent: 6 },
    { id: 'platina', name: 'Platina', minLevel: 30, statPercent: 10 },
    { id: 'master', name: 'Master', minLevel: 40, statPercent: 15 },
    { id: 'grandmaster', name: 'Grandmaster', minLevel: 55, statPercent: 21 },
    { id: 'legenda', name: 'Legenda', minLevel: 70, statPercent: 28 },
    { id: 'dewa_perang', name: 'Dewa Perang', minLevel: 100, statPercent: 40 }
]

export function getRank(level) {
    let current = RANKS[0]
    for (const rank of RANKS) {
        if (level >= rank.minLevel) current = rank
    }
    return current
}

export function nextRank(level) {
    return RANKS.find(rank => rank.minLevel > level) || null
}

export const ABYSS_UNLOCK_LEVEL = 25
export const ABYSS_COOLDOWN = 5 * 60 * 1000

export const CHESTS = {
    perunggu: { name: 'Peti Perunggu', price: 3000 },
    perak: { name: 'Peti Perak', price: 9000 },
    emas: { name: 'Peti Emas', price: 20000 }
}

export const CHEST_COOLDOWN = 45 * 1000

function randBetween(min, max) { return min + Math.floor(Math.random() * (max - min + 1)) }

const CHEST_TABLES = {
    perunggu: [
        { weight: 45, jackpot: false, apply: rpg => { const g = randBetween(80, 200); rpg.money += g; return `${fmtMoney(g)} money` } },
        { weight: 25, jackpot: false, apply: rpg => { const e = randBetween(40, 100); const lv = addExp(rpg, e); return `⭐ ${e} exp${lv.length ? `, naik ke level ${rpg.level}` : ''}` } },
        { weight: 20, jackpot: false, apply: rpg => { const q = randBetween(2, 4); addItem(rpg, 'besi_tua', q); return `📦 Besi Tua x${q}` } },
        { weight: 8, jackpot: false, apply: rpg => { addItem(rpg, 'kristal_sihir', 1); return `📦 Kristal Sihir x1` } },
        { weight: 2, jackpot: true, apply: rpg => { const g = randBetween(500, 800); rpg.money += g; return `💎 JACKPOT! ${fmtMoney(g)} money` } }
    ],
    perak: [
        { weight: 35, jackpot: false, apply: rpg => { const g = randBetween(250, 500); rpg.money += g; return `${fmtMoney(g)} money` } },
        { weight: 25, jackpot: false, apply: rpg => { const e = randBetween(120, 240); const lv = addExp(rpg, e); return `⭐ ${e} exp${lv.length ? `, naik ke level ${rpg.level}` : ''}` } },
        { weight: 20, jackpot: false, apply: rpg => { const q = randBetween(2, 4); addItem(rpg, 'kristal_sihir', q); return `📦 Kristal Sihir x${q}` } },
        { weight: 12, jackpot: false, apply: rpg => { addItem(rpg, 'inti_iblis', 1); return `📦 Inti Iblis x1` } },
        { weight: 5, jackpot: true, apply: rpg => { const g = randBetween(1200, 2000); rpg.money += g; return `💎 JACKPOT! ${fmtMoney(g)} money` } },
        { weight: 3, jackpot: false, apply: rpg => { addItem(rpg, 'pecahan_abyss', 1); return `🌑 Pecahan Abyss x1` } }
    ],
    emas: [
        { weight: 30, jackpot: false, apply: rpg => { const g = randBetween(600, 1200); rpg.money += g; return `${fmtMoney(g)} money` } },
        { weight: 20, jackpot: false, apply: rpg => { const e = randBetween(300, 600); const lv = addExp(rpg, e); return `⭐ ${e} exp${lv.length ? `, naik ke level ${rpg.level}` : ''}` } },
        { weight: 20, jackpot: false, apply: rpg => { const q = randBetween(2, 3); addItem(rpg, 'inti_iblis', q); return `📦 Inti Iblis x${q}` } },
        { weight: 19, jackpot: false, apply: rpg => { const q = randBetween(1, 2); addItem(rpg, 'pecahan_abyss', q); return `🌑 Pecahan Abyss x${q}` } },
        { weight: 8, jackpot: true, apply: rpg => { const g = randBetween(3000, 5000); rpg.money += g; return `💎💎 MEGA JACKPOT! ${fmtMoney(g)} money` } },
        { weight: 3, jackpot: true, apply: rpg => { addItem(rpg, 'pecahan_abyss', 4); return `💎 JACKPOT MATERIAL! Pecahan Abyss x4` } }
    ]
}

function weightedPick(table) {
    const total = table.reduce((s, e) => s + e.weight, 0)
    let r = Math.random() * total
    for (const entry of table) {
        if (r < entry.weight) return entry
        r -= entry.weight
    }
    return table[table.length - 1]
}

export function openChest(rpg, tier) {
    const entry = weightedPick(CHEST_TABLES[tier])
    const detail = entry.apply(rpg)
    return { jackpot: entry.jackpot, detail }
}

export const DAILY_CYCLE = 7

export const PETS = {
    serigala: { name: 'Serigala Kecil', atk: 3, def: 1, price: 3000 },
    elang: { name: 'Elang Pemburu', atk: 5, def: 0, price: 5000 },
    kura_kura: { name: 'Kura-kura Baja', atk: 1, def: 5, price: 5000 },
    naga_kecil: { name: 'Naga Kecil', atk: 8, def: 4, price: 15000 }
}
export const PET_MAX_LEVEL = 10
export const PET_FEED_COOLDOWN = 10 * 60 * 1000

export const TITLES = [
    { id: 'pemula', name: 'Pemula', desc: 'Diberikan begitu karakter dibuat.', check: rpg => !!rpg.class },
    { id: 'veteran', name: 'Veteran Medan Perang', desc: 'Meraih 20 kemenangan berburu/duel/arena.', check: rpg => (rpg.wins || 0) >= 20 },
    { id: 'penakluk_dungeon', name: 'Penakluk Dungeon', desc: 'Mencapai lantai dungeon ke-10.', check: rpg => (rpg.dungeonFloor || 1) >= 10 },
    { id: 'pembunuh_boss', name: 'Pembunuh Boss', desc: 'Ikut menumbangkan 5 boss dunia.', check: rpg => (rpg.bossKills || 0) >= 5 },
    { id: 'juara_arena', name: 'Juara Arena', desc: 'Mengumpulkan 500 poin arena.', check: rpg => (rpg.arenaPoints || 0) >= 500 },
    { id: 'legenda', name: 'Legenda yang Terlahir Kembali', desc: 'Melakukan reborn minimal sekali.', check: rpg => (rpg.prestige || 0) >= 1 },
    { id: 'penakluk_abyss', name: 'Penakluk Abyss', desc: 'Mencapai lantai abyss ke-15.', check: rpg => (rpg.abyssFloor || 1) >= 15 },
    { id: 'dewa_perang', name: 'Dewa Perang', desc: 'Mencapai pangkat Dewa Perang di level 100.', check: rpg => (rpg.level || 1) >= 100 }
]

export const SKILLS = [
    {
        id: 'pukulan_baja', name: 'Pukulan Baja', class: 'petarung', tier: 1,
        levelReq: 8, cost: { money: 3000, mats: { besi_tua: 5 } }, cooldown: 3 * 60 * 1000,
        desc: 'Pukulan telak yang selalu kritikal di awal pertarungan. Menambah 30% serang untuk satu pertarungan.',
        effect: { atkMult: 1.3, guaranteedCrit: true }
    },
    {
        id: 'benteng_hidup', name: 'Benteng Hidup', class: 'petarung', tier: 2,
        levelReq: 18, cost: { money: 9000, mats: { kristal_sihir: 3 } }, cooldown: 5 * 60 * 1000,
        desc: 'Mengeraskan otot dan kulit, bertahan naik drastis dan memulihkan sedikit HP sebelum bertarung.',
        effect: { defMult: 1.8, healPercent: 0.15 }
    },
    {
        id: 'amukan_titan', name: 'Amukan Titan', class: 'petarung', tier: 3,
        levelReq: 30, cost: { money: 25000, mats: { inti_iblis: 3, kristal_sihir: 5 } }, cooldown: 10 * 60 * 1000,
        extraReq: { bossKills: 3 },
        desc: 'Kekuatan puncak petarung, serang naik tajam dan menembus sebagian besar pertahanan musuh. Syarat tambahan: pernah ikut menumbangkan 3 boss.',
        effect: { atkMult: 1.8, ignoreDefPercent: 0.4 }
    },
    {
        id: 'bola_api', name: 'Bola Api', class: 'penyihir', tier: 1,
        levelReq: 8, cost: { money: 3000, mats: { besi_tua: 5 } }, cooldown: 3 * 60 * 1000,
        desc: 'Melontarkan bola api yang membakar musuh, menambah 40% serang untuk satu pertarungan.',
        effect: { atkMult: 1.4 }
    },
    {
        id: 'petir_menyambar', name: 'Petir Menyambar', class: 'penyihir', tier: 2,
        levelReq: 18, cost: { money: 9000, mats: { kristal_sihir: 3 } }, cooldown: 5 * 60 * 1000,
        desc: 'Petir dahsyat yang nyaris selalu mengenai titik lemah musuh. Serang naik 60% dan selalu kritikal.',
        effect: { atkMult: 1.6, guaranteedCrit: true }
    },
    {
        id: 'badai_es', name: 'Badai Es', class: 'penyihir', tier: 3,
        levelReq: 30, cost: { money: 25000, mats: { inti_iblis: 3, kristal_sihir: 5 } }, cooldown: 10 * 60 * 1000,
        extraReq: { dungeonFloor: 10 },
        desc: 'Badai sihir maha dahsyat, serang naik sangat tinggi tapi tubuh jadi rapuh selama pertarungan itu. Syarat tambahan: pernah mencapai lantai dungeon ke-10.',
        effect: { atkMult: 2.1, defMult: 0.75 }
    },
    {
        id: 'serangan_bayangan', name: 'Serangan Bayangan', class: 'pembunuh', tier: 1,
        levelReq: 8, cost: { money: 3000, mats: { besi_tua: 5 } }, cooldown: 3 * 60 * 1000,
        desc: 'Menyerang dari titik buta musuh, menambah 25% serang dan selalu kritikal di ronde pertama.',
        effect: { atkMult: 1.25, guaranteedCrit: true }
    },
    {
        id: 'racun_mematikan', name: 'Racun Mematikan', class: 'pembunuh', tier: 2,
        levelReq: 18, cost: { money: 9000, mats: { kristal_sihir: 3 } }, cooldown: 5 * 60 * 1000,
        desc: 'Melumuri senjata dengan racun, menguras HP musuh sekaligus memulihkan sebagian HP milik sendiri.',
        effect: { atkMult: 1.35, healPercent: 0.1 }
    },
    {
        id: 'pembunuh_senyap', name: 'Pembunuh Senyap', class: 'pembunuh', tier: 3,
        levelReq: 30, cost: { money: 25000, mats: { inti_iblis: 3, kristal_sihir: 5 } }, cooldown: 10 * 60 * 1000,
        extraReq: { arenaPoints: 300 },
        desc: 'Serangan mematikan tanpa suara, serang naik tajam, selalu kritikal, dan lebih lincah menghindar. Syarat tambahan: memiliki 300 poin arena.',
        effect: { atkMult: 1.7, guaranteedCrit: true, defMult: 1.25 }
    }
]

export const skillsForClass = className => SKILLS.filter(s => s.class === className)
export const getSkill = id => SKILLS.find(s => s.id === id)

export function extraReqMet(rpg, skill) {
    if (!skill.extraReq) return true
    return Object.entries(skill.extraReq).every(([key, val]) => (rpg[key] || 0) >= val)
}

export function extraReqText(skill) {
    if (!skill.extraReq) return ''
    const labels = { bossKills: 'jumlah boss yang pernah ditumbangkan', dungeonFloor: 'lantai dungeon tertinggi', arenaPoints: 'poin arena' }
    return Object.entries(skill.extraReq).map(([key, val]) => `${labels[key] || key} minimal ${val}`).join(', ')
}

export const ACTIVE_SKILL_WINDOW = 5 * 60 * 1000

export function consumeActiveSkill(rpg) {
    if (!rpg.activeSkill) return null
    if (Date.now() > rpg.activeSkill.expiresAt) {
        rpg.activeSkill = null
        return null
    }
    const skill = getSkill(rpg.activeSkill.id)
    rpg.activeSkill = null
    return skill
}

export function resolveSkillMod(skill) {
    if (!skill) return { atkMult: 1, defMult: 1, healPercent: 0, guaranteedCrit: false, ignoreDefPercent: 0 }
    const e = skill.effect
    return {
        atkMult: e.atkMult || 1,
        defMult: e.defMult || 1,
        healPercent: e.healPercent || 0,
        guaranteedCrit: !!e.guaranteedCrit,
        ignoreDefPercent: e.ignoreDefPercent || 0
    }
}

export function skillUsedText(skill) {
    if (!skill) return ''
    return `✨ Skill aktif: *${skill.name}*.\n\n`
}

export const HUNT_COOLDOWN = 90 * 1000
export const DUEL_COOLDOWN = 3 * 60 * 1000
export const DUNGEON_COOLDOWN = 4 * 60 * 1000
export const REST_COOLDOWN = 5 * 60 * 1000
export const BOSS_COOLDOWN = 30 * 60 * 1000
export const BOSS_FIGHT_TIMEOUT = 15 * 60 * 1000
export const ARENA_COOLDOWN = 5 * 60 * 1000
export const CRAFT_COOLDOWN = 60 * 1000
export const ENCHANT_COOLDOWN = 60 * 1000
export const REBORN_MIN_LEVEL = 30
export const prestigeCost = prestigeCount => 4000 + (prestigeCount || 0) * 2000

export const PREMIUM_PRICE = 20000
export const PREMIUM_DURATION_DAYS = 3
export const PREMIUM_DURATION_MS = PREMIUM_DURATION_DAYS * 24 * 60 * 60 * 1000

export const CASINO_MIN_BET = 50
export const CASINO_BASE_MAX_BET = 300
export const CASINO_COOLDOWN = 45 * 1000

export const freshRpg = () => ({
    class: null, level: 1, exp: 0, hp: 100, maxHp: 100, atk: 10, def: 5,
    inventory: {}, equippedWeapon: null, equippedArmor: null,
    lastHunt: 0, lastDuel: 0, lastQuest: '', wins: 0, losses: 0,
    lastDungeon: 0, dungeonFloor: 1, lastHeal: 0,
    lastAbyss: 0, abyssFloor: 1,
    lastDaily: '', dailyStreak: 0, lastWeeklyQuest: '',
    refine: {}, lastEnchant: 0, lastCraft: 0,
    pet: null, petLevel: 1, lastFeed: 0,
    arenaPoints: 0, arenaWins: 0, arenaLosses: 0, lastArena: 0,
    bossKills: 0,
    prestige: 0,
    unlockedTitles: [], activeTitle: null,
    unlockedSkills: [], skillCooldowns: {}, activeSkill: null,
    lastFish: 0, fishCaught: 0,
    foodBuff: null,
    mount: null,
    guildId: null,
    claimedAchievements: [],
    lastCasino: 0,
    lastChest: 0
})

function bindMoney(jid, rpg) {
    const existing = Object.getOwnPropertyDescriptor(rpg, 'money')
    if (existing && typeof existing.get === 'function') return rpg

    const legacyMoney = typeof rpg.gold === 'number' && isFinite(rpg.gold) ? rpg.gold : 0
    delete rpg.gold
    delete rpg.money
    if (legacyMoney > 0) {
        const u = global.db.data.users[jid] ??= {}
        u.money = (u.money || 0) + legacyMoney
    }

    Object.defineProperty(rpg, 'money', {
        get() {
            return global.db.data.users[jid]?.money || 0
        },
        set(v) {
            const u = global.db.data.users[jid] ??= {}
            const n = Number(v)
            u.money = Math.max(0, Math.floor(isFinite(n) ? n : 0))
        },
        enumerable: false,
        configurable: true
    })
    return rpg
}

export const bindRpgCurrency = jid => {
    const rpg = global.db.data.users?.[jid]?.rpg
    if (rpg) bindMoney(jid, rpg)
    return rpg
}

export const getRpg = jid => {
    global.db.data.users[jid] ??= {}
    global.db.data.users[jid].rpg ??= freshRpg()
    const rpg = global.db.data.users[jid].rpg
    const fresh = freshRpg()
    for (const key of Object.keys(fresh)) {
        if (rpg[key] === undefined) rpg[key] = fresh[key]
    }
    bindMoney(jid, rpg)
    return rpg
}

export const hasStarted = jid => !!global.db.data.users?.[jid]?.rpg?.class

export const expNeeded = level => Math.floor(60 * Math.pow(level, 1.45)) + 40

function gearBonus(rpg, slot, stat) {
    const itemId = slot === 'weapon' ? rpg.equippedWeapon : rpg.equippedArmor
    if (!itemId || !ITEMS[itemId]) return 0
    const base = ITEMS[itemId][stat] || 0
    const refineLevel = rpg.refine?.[itemId] || 0
    const refineBonus = refineLevel * (stat === 'atk' ? 3 : 2)
    return base + refineBonus
}

function petBonus(rpg, stat) {
    if (!rpg.pet || !PETS[rpg.pet]) return 0
    const base = PETS[rpg.pet][stat] || 0
    const level = rpg.petLevel || 1
    return Math.floor(base * (1 + (level - 1) * 0.15))
}

function mountBonus(rpg, stat) {
    if (!rpg.mount || !MOUNTS[rpg.mount]) return 0
    return MOUNTS[rpg.mount][stat] || 0
}

function foodBonus(rpg, stat) {
    const buff = foodBuffActive(rpg)
    return buff ? (buff[stat] || 0) : 0
}

function guildBonusMult(rpg) {
    if (!rpg.guildId) return 1
    const guild = getGuild(rpg.guildId)
    if (!guild) return 1
    return 1 + guildStatPercent(guild) / 100
}

const prestigeMult = rpg => {
    const p = rpg.prestige || 0
    const full = Math.min(p, 10)
    const extra = Math.max(0, p - 10)
    return 1 + full * 0.05 + extra * 0.01
}
export const prestigeBonusPercent = prestigeCount => {
    const p = prestigeCount || 0
    const full = Math.min(p, 10)
    const extra = Math.max(0, p - 10)
    return Math.round((full * 5 + extra * 1) * 10) / 10
}
const rankMult = rpg => 1 + getRank(rpg.level || 1).statPercent / 100

export const totalAtk = rpg => Math.floor((rpg.atk + gearBonus(rpg, 'weapon', 'atk') + petBonus(rpg, 'atk') + mountBonus(rpg, 'atk') + foodBonus(rpg, 'atk')) * prestigeMult(rpg) * rankMult(rpg) * guildBonusMult(rpg))
export const totalDef = rpg => Math.floor((rpg.def + gearBonus(rpg, 'armor', 'def') + petBonus(rpg, 'def') + mountBonus(rpg, 'def') + foodBonus(rpg, 'def')) * prestigeMult(rpg) * rankMult(rpg) * guildBonusMult(rpg))

export function addExp(rpg, amount) {
    rpg.exp += amount
    const levelUps = []
    while (rpg.exp >= expNeeded(rpg.level)) {
        rpg.exp -= expNeeded(rpg.level)
        rpg.level++
        const gainHp = 12 + rpg.level
        const gainAtk = 2
        const gainDef = 1
        rpg.maxHp += gainHp
        rpg.hp = rpg.maxHp
        rpg.atk += gainAtk
        rpg.def += gainDef
        levelUps.push({ level: rpg.level, gainHp, gainAtk, gainDef })
    }
    return levelUps
}

export const addItem = (rpg, id, qty = 1) => { rpg.inventory[id] = (rpg.inventory[id] || 0) + qty }
export const removeItem = (rpg, id, qty = 1) => {
    if (!rpg.inventory[id] || rpg.inventory[id] < qty) return false
    rpg.inventory[id] -= qty
    if (rpg.inventory[id] <= 0) delete rpg.inventory[id]
    return true
}
export const hasItems = (rpg, mats = {}) => Object.entries(mats).every(([id, qty]) => (rpg.inventory[id] || 0) >= qty)

export const fmtMoney = n => (n || 0).toLocaleString('id-ID')
export const cooldownLeft = (last, cd) => Math.max(0, cd - (Date.now() - (last || 0)))
export function fmtMs(ms) {
    const s = Math.ceil(ms / 1000)
    if (s < 60) return `${s} detik`
    const m = Math.floor(s / 60), rest = s % 60
    return rest ? `${m} menit ${rest} detik` : `${m} menit`
}

export function displayName(jid, rpg, fallbackName) {
    const contact = global.db.data.contacts?.[jid]
    const base = (contact?.pushname && contact.pushname !== 'null') ? contact.pushname : (fallbackName || jid.split('@')[0])
    if (rpg?.activeTitle) {
        const title = TITLES.find(t => t.id === rpg.activeTitle)
        if (title) return `${base} [${title.name}]`
    }
    return base
}

export function checkNewTitles(rpg) {
    rpg.unlockedTitles ??= []
    const gained = []
    for (const title of TITLES) {
        if (!rpg.unlockedTitles.includes(title.id) && title.check(rpg)) {
            rpg.unlockedTitles.push(title.id)
            gained.push(title)
        }
    }
    return gained
}

export function titleNotifText(gained, prefix) {
    if (!gained.length) return ''
    let text = `\n\n🏅 *GELAR BARU TERBUKA*\n`
    text += gained.map(t => `• ${t.name}`).join('\n')
    text += `\n\nAtur gelar yang ingin ditampilkan lewat ${prefix}title pakai <nama gelar>.`
    return text
}

export const SELL_RATE = 0.4
export function sellPrice(item) {
    if (!item || item.price <= 0) return 0
    if (item.type === 'material' || item.type === 'fish' || item.type === 'junk') return item.price
    return Math.max(1, Math.floor(item.price * SELL_RATE))
}
export const isSellable = item => !!item && sellPrice(item) > 0

export const FISH_COOLDOWN = 40 * 1000

export const FISHES = {
    kaleng_bekas: { name: 'Kaleng Bekas', type: 'junk', price: 3 },
    ikan_teri: { name: 'Ikan Teri', type: 'fish', price: 12 },
    ikan_mas: { name: 'Ikan Mas', type: 'fish', price: 35 },
    ikan_tuna: { name: 'Ikan Tuna', type: 'fish', price: 80 },
    ikan_hiu: { name: 'Ikan Hiu', type: 'fish', price: 220 },
    ikan_purba: { name: 'Ikan Purba', type: 'fish', price: 700 }
}
Object.assign(ITEMS, FISHES)

const FISH_CATCH_TABLE = [
    { id: 'kaleng_bekas', weight: 22 },
    { id: 'ikan_teri', weight: 34 },
    { id: 'ikan_mas', weight: 24 },
    { id: 'ikan_tuna', weight: 12 },
    { id: 'ikan_hiu', weight: 6 },
    { id: 'ikan_purba', weight: 2 }
]

export function catchFish() {
    return weightedPick(FISH_CATCH_TABLE).id
}

export const FOOD_RECIPES = {
    sup_teri: { name: 'Sup Ikan Teri', need: { ikan_teri: 3 }, money: 600, atk: 4, def: 2, duration: 15 * 60 * 1000 },
    bakar_mas: { name: 'Ikan Mas Bakar', need: { ikan_mas: 3 }, money: 1500, atk: 9, def: 5, duration: 20 * 60 * 1000 },
    steak_tuna: { name: 'Steak Tuna', need: { ikan_tuna: 2 }, money: 3000, atk: 15, def: 8, duration: 25 * 60 * 1000 },
    sup_sirip_hiu: { name: 'Sup Sirip Hiu', need: { ikan_hiu: 2 }, money: 6000, atk: 24, def: 13, duration: 30 * 60 * 1000 },
    hidangan_purba: { name: 'Hidangan Ikan Purba', need: { ikan_purba: 1, kristal_sihir: 2 }, money: 12000, atk: 38, def: 22, duration: 45 * 60 * 1000 }
}

export function eatFood(rpg, id) {
    const recipe = FOOD_RECIPES[id]
    if (!recipe) return null
    rpg.foodBuff = { name: recipe.name, atk: recipe.atk, def: recipe.def, expiresAt: Date.now() + recipe.duration }
    return rpg.foodBuff
}

export function foodBuffActive(rpg) {
    if (!rpg.foodBuff) return null
    if (Date.now() > rpg.foodBuff.expiresAt) { rpg.foodBuff = null; return null }
    return rpg.foodBuff
}

export const MOUNTS = {
    kuda_poni: { name: 'Kuda Poni', atk: 2, def: 2, price: 3000, levelReq: 5 },
    serigala_perang: { name: 'Serigala Perang', atk: 5, def: 3, price: 9000, levelReq: 15 },
    griffin: { name: 'Griffin', atk: 8, def: 6, price: 20000, levelReq: 25 },
    naga_tunggangan: { name: 'Naga Tunggangan', atk: 14, def: 10, price: 40000, levelReq: 40 },
    phoenix_abadi: { name: 'Phoenix Abadi', atk: 20, def: 15, price: 80000, levelReq: 60 }
}

export const GUILD_CREATE_COST = 6000
export const GUILD_CREATE_MIN_LEVEL = 15
export const GUILD_MAX_MEMBERS = 25
export const GUILD_MONEY_PER_LEVEL = 2500
export const GUILD_MAX_BONUS_PERCENT = 25

export function ensureGuildStore() {
    global.db.data.guilds ??= {}
    return global.db.data.guilds
}

export function getGuild(id) {
    if (!id) return null
    return ensureGuildStore()[id] || null
}

export function slugifyGuildName(name) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24)
}

export function findGuildByQuery(query) {
    const q = (query || '').trim()
    if (!q) return { error: 'Masukkan nama klannya.' }
    const bySlug = getGuild(slugifyGuildName(q))
    if (bySlug) return { guild: bySlug }
    const store = ensureGuildStore()
    const qLower = q.toLowerCase()
    const exact = Object.values(store).find(g => g.name.toLowerCase() === qLower)
    if (exact) return { guild: exact }
    const partial = Object.values(store).filter(g => g.name.toLowerCase().includes(qLower))
    if (partial.length === 1) return { guild: partial[0] }
    if (partial.length > 1) return { error: `Ada ${partial.length} klan dengan nama mirip: ${partial.map(g => g.name).join(', ')}. Ketik nama lengkapnya.` }
    return { error: 'Klan tidak ditemukan.' }
}

export function createGuild(name, ownerJid) {
    const store = ensureGuildStore()
    const id = slugifyGuildName(name)
    if (!id) return { error: 'Nama klan tidak valid.' }
    if (store[id]) return { error: 'Sudah ada klan dengan nama itu.' }
    store[id] = { id, name: name.trim().slice(0, 30), owner: ownerJid, members: [ownerJid], money: 0, createdAt: Date.now() }
    return { guild: store[id] }
}


export function guildLevel(guild) {
    return Math.floor((guild.money || 0) / GUILD_MONEY_PER_LEVEL) + 1
}

export function guildStatPercent(guild) {
    return Math.min(GUILD_MAX_BONUS_PERCENT, (guildLevel(guild) - 1) * 2)
}

export function guildMoneyToNextLevel(guild) {
    const level = guildLevel(guild)
    if (guildStatPercent(guild) >= GUILD_MAX_BONUS_PERCENT) return null
    return level * GUILD_MONEY_PER_LEVEL - (guild.money || 0)
}

export function topGuilds(limit = 10) {
    const store = ensureGuildStore()
    return Object.values(store)
        .sort((a, b) => (b.money || 0) - (a.money || 0) || b.members.length - a.members.length)
        .slice(0, limit)
}

export const WAR_COOLDOWN = 30 * 60 * 1000
export const WAR_STAKE_PERCENT = 0.1
export const WAR_MIN_STAKE = 50

export function guildPower(guild) {
    return guild.members.reduce((sum, jid) => {
        const rpg = getRpg(jid)
        return sum + totalAtk(rpg) + totalDef(rpg)
    }, 0)
}

export const ACHIEVEMENTS = [
    { id: 'level10', name: 'Pemula Tangguh', desc: 'Capai level 10.', check: rpg => (rpg.level || 1) >= 10, reward: { money: 200 } },
    { id: 'level25', name: 'Petualang Berpengalaman', desc: 'Capai level 25.', check: rpg => (rpg.level || 1) >= 25, reward: { money: 600 } },
    { id: 'level50', name: 'Master Sejati', desc: 'Capai level 50.', check: rpg => (rpg.level || 1) >= 50, reward: { money: 1500, mats: { kristal_sihir: 3 } } },
    { id: 'win50', name: 'Petarung Gigih', desc: 'Raih 50 kemenangan total.', check: rpg => (rpg.wins || 0) >= 50, reward: { money: 400 } },
    { id: 'win200', name: 'Sang Juara', desc: 'Raih 200 kemenangan total.', check: rpg => (rpg.wins || 0) >= 200, reward: { money: 1500, mats: { kristal_sihir: 5 } } },
    { id: 'money5000', name: 'Sultan Muda', desc: 'Kumpulkan 5.000 money emas sekaligus.', check: rpg => (rpg.money || 0) >= 5000, reward: { mats: { inti_iblis: 2 } } },
    { id: 'fisher', name: 'Nelayan Andal', desc: 'Tangkap 30 ikan.', check: rpg => (rpg.fishCaught || 0) >= 30, reward: { money: 250 } },
    { id: 'fisher_master', name: 'Raja Lautan', desc: 'Tangkap 100 ikan.', check: rpg => (rpg.fishCaught || 0) >= 100, reward: { money: 1000, mats: { pecahan_abyss: 1 } } },
    { id: 'guild_member', name: 'Anak Klan', desc: 'Gabung sebuah klan.', check: rpg => !!rpg.guildId, reward: { money: 150 } },
    { id: 'mount_owner', name: 'Penjelajah Bertunggangan', desc: 'Miliki tunggangan.', check: rpg => !!rpg.mount, reward: { money: 150 } },
    { id: 'reborn1', name: 'Kelahiran Baru', desc: 'Reborn minimal 1 kali.', check: rpg => (rpg.prestige || 0) >= 1, reward: { money: 1000 } },
    { id: 'dungeon20', name: 'Ahli Dungeon', desc: 'Capai lantai dungeon ke-20.', check: rpg => (rpg.dungeonFloor || 1) >= 20, reward: { mats: { inti_iblis: 3 } } }
]

export function claimableAchievements(rpg) {
    rpg.claimedAchievements ??= []
    return ACHIEVEMENTS.filter(a => !rpg.claimedAchievements.includes(a.id) && a.check(rpg))
}

export function claimAllAchievements(rpg) {
    const claimable = claimableAchievements(rpg)
    rpg.claimedAchievements ??= []
    for (const a of claimable) {
        rpg.claimedAchievements.push(a.id)
        if (a.reward.money) rpg.money += a.reward.money
        if (a.reward.mats) for (const [mid, qty] of Object.entries(a.reward.mats)) addItem(rpg, mid, qty)
    }
    return claimable
}

export const GODMODE_LEVEL = 100
export const GODMODE_MONEY = 999999999

export function applyGodmode(rpg) {
    rpg.level = GODMODE_LEVEL
    rpg.exp = 0
    rpg.money = GODMODE_MONEY
    rpg.maxHp = 99999
    rpg.hp = rpg.maxHp
    rpg.atk = 9999
    rpg.def = 9999
    rpg.prestige = Math.max(rpg.prestige || 0, 10)
    rpg.wins = Math.max(rpg.wins || 0, 999)
    rpg.bossKills = Math.max(rpg.bossKills || 0, 999)
    rpg.arenaPoints = Math.max(rpg.arenaPoints || 0, 999)
    rpg.dungeonFloor = Math.max(rpg.dungeonFloor || 1, 999)
    rpg.abyssFloor = Math.max(rpg.abyssFloor || 1, 999)
    rpg.fishCaught = Math.max(rpg.fishCaught || 0, 999)
    for (const [id, item] of Object.entries(ITEMS)) {
        if (item.type === 'material') addItem(rpg, id, 999)
    }
    rpg.equippedWeapon = 'pedang_abyssal'
    addItem(rpg, 'pedang_abyssal', 1)
    rpg.equippedArmor = 'zirah_abyssal'
    addItem(rpg, 'zirah_abyssal', 1)
    rpg.pet = 'naga_kecil'
    rpg.petLevel = PET_MAX_LEVEL
    rpg.mount = 'phoenix_abadi'
    rpg.unlockedSkills = skillsForClass(rpg.class).map(s => s.id)
    rpg.unlockedTitles = TITLES.map(t => t.id)
    rpg.activeTitle = 'dewa_perang'
    rpg.claimedAchievements = ACHIEVEMENTS.map(a => a.id)
    checkNewTitles(rpg)
    return rpg
}

export function bar(val, max, len = 12) {
    const filled = Math.min(len, Math.max(0, Math.round((val / max) * len)))
    return '█'.repeat(filled) + '░'.repeat(len - filled)
}

export const MARKET_LISTING_MS = 48 * 60 * 60 * 1000
export const MARKET_MAX_PER_PLAYER = 5
export const MARKET_TAX_PERCENT = 5
export const MARKET_MAX_PRICE_PER_UNIT = 200000

export function ensureMarketStore() {
    global.db.data.market ??= {}
    global.db.data.market.listings ??= {}
    if (typeof global.db.data.market.nextId !== 'number') global.db.data.market.nextId = 1
    return global.db.data.market
}

export function sweepExpiredMarket() {
    const store = ensureMarketStore()
    const now = Date.now()
    const expired = []
    for (const [id, listing] of Object.entries(store.listings)) {
        if (now > listing.expiresAt) {
            const sellerRpg = getRpg(listing.sellerJid)
            addItem(sellerRpg, listing.itemId, listing.qty)
            expired.push({ id, ...listing })
            delete store.listings[id]
        }
    }
    return expired
}

export function activeMarketListings() {
    sweepExpiredMarket()
    const store = ensureMarketStore()
    return Object.entries(store.listings)
        .map(([id, l]) => ({ id, ...l }))
        .sort((a, b) => a.pricePerUnit - b.pricePerUnit)
}

export function playerMarketListings(jid) {
    return activeMarketListings().filter(l => l.sellerJid === jid)
}

export function playerMarketListingCount(jid) {
    const store = ensureMarketStore()
    return Object.values(store.listings).filter(l => l.sellerJid === jid).length
}

export function createMarketListing(sellerJid, itemId, qty, pricePerUnit) {
    const store = ensureMarketStore()
    const id = 'M' + store.nextId++
    store.listings[id] = { sellerJid, itemId, qty, pricePerUnit, createdAt: Date.now(), expiresAt: Date.now() + MARKET_LISTING_MS }
    return { id, ...store.listings[id] }
}

export function getMarketListing(id) {
    sweepExpiredMarket()
    const store = ensureMarketStore()
    return store.listings[id] || null
}

export function removeMarketListing(id) {
    const store = ensureMarketStore()
    delete store.listings[id]
}
