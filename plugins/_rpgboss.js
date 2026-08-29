import {
    getRpg, hasStarted, totalAtk, totalDef, addExp, fmtMoney, fmtMs, cooldownLeft,
    BOSS_COOLDOWN, BOSS_FIGHT_TIMEOUT, displayName, checkNewTitles, titleNotifText,
    consumeActiveSkill, resolveSkillMod, skillUsedText, bar
} from '../lib/rpg.js'

const BOSS_POOL = [
    { id: 'troll', name: 'Raja Troll Saya', hp: 1600, atk: 20, def: 0, minLevel: 1, trait: 'regen', traitDesc: 'Regenerasi: pulih sedikit kalau diserang terlalu lemah.' },
    { id: 'hydra', name: 'Hydra Berkepala Tiga', hp: 2400, atk: 24, def: 4, minLevel: 1, trait: 'multistrike', traitDesc: 'Kepala Ganda: kadang membalas lebih dari satu kali.' },
    { id: 'naga', name: 'Naga Purba', hp: 3400, atk: 32, def: 7, minLevel: 15, trait: 'flame', traitDesc: 'Napas Api: sesekali memberi damage balasan besar.' },
    { id: 'iblis', name: 'Iblis Penguasa Neraka', hp: 4600, atk: 40, def: 9, minLevel: 25, trait: 'curse', traitDesc: 'Kutukan: serangan balasannya diperkuat kutukan gelap.' },
    { id: 'titan', name: 'Titan Abyss', hp: 6800, atk: 46, def: 20, minLevel: 40, trait: 'armored', traitDesc: 'Kulit Baja: sangat tahan terhadap damage yang masuk.' },
    { id: 'raja_gelap', name: 'Penguasa Kegelapan Abadi', hp: 10000, atk: 58, def: 14, minLevel: 60, trait: 'enrage', traitDesc: 'Murka: makin kuat setiap kali HP-nya menipis.' }
]

function pickBossTemplate(level) {
    const eligible = BOSS_POOL.filter(b => level >= b.minLevel)
    return eligible[Math.floor(Math.random() * eligible.length)]
}

function scaleBoss(template, spawnerRpg) {
    const power = totalAtk(spawnerRpg) + totalDef(spawnerRpg) + spawnerRpg.level * 2
    const scale = 1 + Math.min(1.6, power / 220)
    const hp = Math.floor(template.hp * scale)
    return {
        id: template.id,
        name: template.name,
        trait: template.trait,
        traitDesc: template.traitDesc,
        hp,
        maxHp: hp,
        atk: Math.floor(template.atk * scale),
        def: template.def,
        participants: {},
        spawnedAt: Date.now(),
        enraged: false
    }
}

function getBossState(chat) {
    chat.rpgBoss ??= { active: null, lastDefeatedAt: 0 }
    return chat.rpgBoss
}

function bossCounterAttack(boss, rpg) {
    let dmg = Math.max(1, Math.floor(boss.atk - totalDef(rpg) / 2 - Math.floor(Math.random() * 4)))
    let note = ''

    if (boss.trait === 'multistrike' && Math.random() < 0.3) {
        dmg = Math.floor(dmg * 1.8)
        note = 'Hydra menyerang balik dengan dua kepala sekaligus!'
    } else if (boss.trait === 'flame' && Math.random() < 0.18) {
        dmg = Math.floor(dmg * 2.1)
        note = 'Napas api Naga Purba membakar Anda telak!'
    } else if (boss.trait === 'curse') {
        dmg = Math.floor(dmg * 1.35)
        note = 'Kutukan Iblis memperbesar damage balasannya.'
    } else if (boss.trait === 'enrage' && boss.hp <= boss.maxHp * 0.3) {
        dmg = Math.floor(dmg * 1.5)
        note = `${boss.name} murka karena HP-nya menipis, serangannya makin sakit!`
    }
    return { dmg, note }
}

export default {
    cmd: ['boss', 'raid'],
    category: 'rpg',
    run: async (m, { sock, prefix }) => {
        if (!m.isGroup) return m.reply(`Fitur boss hanya bisa dimainkan di grup, agar bisa dikerjakan bersama-sama.`)
        if (!hasStarted(m.sender)) return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)

        global.db.data.chats[m.from] ??= {}
        const state = getBossState(global.db.data.chats[m.from])
        const rpg = getRpg(m.sender)

        if (state.active && cooldownLeft(state.active.spawnedAt, BOSS_FIGHT_TIMEOUT) <= 0) {
            const escapedName = state.active.name
            state.active = null
            state.lastDefeatedAt = Date.now()
            return m.reply(`${escapedName} kabur karena raid berlangsung terlalu lama tanpa berhasil dikalahkan. Tidak ada hadiah untuk raid ini.\n\nBoss baru akan muncul lagi ${fmtMs(BOSS_COOLDOWN)} dari sekarang.`)
        }

        if (!state.active) {
            const left = cooldownLeft(state.lastDefeatedAt, BOSS_COOLDOWN)
            if (left > 0) return m.reply(`Boss di grup ini baru saja selesai. Boss baru akan muncul lagi dalam ${fmtMs(left)}.`)
            const template = pickBossTemplate(rpg.level)
            state.active = scaleBoss(template, rpg)
            const boss = state.active
            return m.reply(`*BOSS MUNCUL*\n${boss.name} muncul di grup ini dengan HP ${boss.hp}.\n` +
                `Karakter boss: ${boss.traitDesc}\n\n` +
                `Semua anggota yang sudah punya karakter boleh ikut menyerang dengan ${prefix}boss. Setiap serangan akan dibalas boss dan mengurangi HP karaktermu sendiri, boleh kalah kalau HP Anda habis. Kalau HP kritis, istirahat dulu dengan ${prefix}heal.\n` +
                `Boss ini juga bisa kabur kalau tidak selesai dalam ${fmtMs(BOSS_FIGHT_TIMEOUT)}.\n\n` +
                `Semakin banyak yang ikut menyerang, semakin cepat boss tumbang dan semua peserta dapat bagian hadiah sesuai kontribusi damage.`)
        }

        const boss = state.active

        if (rpg.hp <= 0) {
            return m.reply(`HP Anda sedang habis, Anda tidak bisa menyerang boss dalam kondisi ini. Pulihkan diri dulu dengan ${prefix}heal, baru kembali menyerang ${boss.name}.`)
        }

        const skill = consumeActiveSkill(rpg)
        const mod = resolveSkillMod(skill)

        let dmg = Math.max(1, Math.floor((totalAtk(rpg) * mod.atkMult) - boss.def / 2) - Math.floor(Math.random() * 3))
        if (mod.guaranteedCrit) dmg = Math.floor(dmg * 1.3)
        if (boss.trait === 'armored') dmg = Math.max(1, Math.floor(dmg * 0.75))

        boss.hp -= dmg
        boss.participants[m.sender] = (boss.participants[m.sender] || 0) + dmg

        let regenNote = ''
        if (boss.trait === 'regen' && boss.hp > 0 && dmg < boss.maxHp * 0.03) {
            const regen = Math.floor(boss.maxHp * 0.02)
            boss.hp = Math.min(boss.maxHp, boss.hp + regen)
            regenNote = `\n${boss.name} meregenerasi ${regen} HP karena serangan Anda terlalu lemah.`
        }

        if (boss.hp > 0) {
            const counter = bossCounterAttack(boss, rpg)
            rpg.hp = Math.max(0, rpg.hp - counter.dmg)
            const koNote = rpg.hp <= 0 ? `\n\n*Anda KO!* HP Anda habis diserang balik ${boss.name}. Pulihkan diri dengan ${prefix}heal sebelum menyerang lagi.` : ''
            return m.reply(`${skillUsedText(skill)}Anda memberikan ${dmg} damage ke ${boss.name}.\nHP boss: [${bar(Math.max(0, boss.hp), boss.maxHp)}] ${Math.max(0, boss.hp)}/${boss.maxHp}${regenNote}\n\n` +
                `${boss.name} membalas ${counter.dmg} damage ke Anda.${counter.note ? ` ${counter.note}` : ''}\nHP Anda: [${bar(Math.max(0, rpg.hp), rpg.maxHp)}] ${Math.max(0, rpg.hp)}/${rpg.maxHp}${koNote}`)
        }

        const totalDamage = Object.values(boss.participants).reduce((a, b) => a + b, 0)
        const bossName = boss.name
        const totalMoneyPool = boss.maxHp * 2
        const totalExpPool = Math.floor(boss.maxHp / 3)
        let rewardText = `*BOSS TUMBANG*\n${skillUsedText(skill)}${bossName} berhasil dikalahkan. Total damage ${totalDamage}.\n\nPembagian hadiah:\n`
        for (const [jid, dealt] of Object.entries(boss.participants)) {
            const share = dealt / totalDamage
            const moneyReward = Math.floor(totalMoneyPool * share)
            const expReward = Math.floor(totalExpPool * share)
            const pRpg = getRpg(jid)
            pRpg.money += moneyReward
            pRpg.bossKills = (pRpg.bossKills || 0) + 1
            const levelUps = addExp(pRpg, expReward)
            const name = displayName(jid, pRpg)
            rewardText += `• ${name}: ${dealt} damage, dapat ${fmtMoney(moneyReward)} money dan ${expReward} exp${levelUps.length ? `, naik ke level ${pRpg.level}` : ''}\n`
            const gained = checkNewTitles(pRpg)
            if (gained.length) rewardText += `  Gelar baru untuk ${name}: ${gained.map(t => t.name).join(', ')}\n`
        }
        const participantJids = Object.keys(boss.participants)
        state.active = null
        state.lastDefeatedAt = Date.now()
        rewardText += `\nBoss baru akan muncul lagi ${fmtMs(BOSS_COOLDOWN)} dari sekarang.`
        return m.reply(rewardText, { mentions: participantJids })
    }
}
