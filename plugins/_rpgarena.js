import { getRpg, hasStarted, totalAtk, totalDef, addExp, fmtMoney, fmtMs, cooldownLeft, ARENA_COOLDOWN, displayName, checkNewTitles, titleNotifText, consumeActiveSkill, resolveSkillMod, skillUsedText, bar } from '../lib/rpg.js'

const RIVAL_NAMES = ['Petarung Bayangan', 'Ksatria Arena', 'Pendekar Kelana', 'Prajurit Terlatih', 'Juara Musim Lalu']
const LOG_WINDOW = 4
const MEDALS = ['🥇', '🥈', '🥉']

function makeRival(level) {
    const scale = 1 + Math.random() * 0.25
    return {
        name: RIVAL_NAMES[Math.floor(Math.random() * RIVAL_NAMES.length)],
        hp: Math.floor((60 + level * 14) * scale),
        atk: Math.floor((8 + level * 2.4) * scale),
        def: Math.floor((3 + level * 1.2) * scale)
    }
}

export default {
    cmd: ['arena'],
    category: 'rpg',
    run: async (m, { sock, text, prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const sub = text.trim().toLowerCase()

        if (sub === 'top' || sub === 'peringkat') {
            const entries = Object.entries(global.db.data.users || {})
                .filter(([, u]) => u.rpg?.class)
                .map(([jid, u]) => [jid, u.rpg])
                .sort((a, b) => (b[1].arenaPoints || 0) - (a[1].arenaPoints || 0))
            if (!entries.length) return m.reply(`Belum ada data arena. Jadilah yang pertama bertarung lewat ${prefix}arena.`)
            const top = entries.slice(0, 10)
            let out = `*PERINGKAT ARENA*\n\n`
            out += top.map(([jid, r], i) => `${MEDALS[i] || `${i + 1}.`} ${displayName(jid, r)} - ${r.arenaPoints || 0} poin`).join('\n')
            return m.reply(out)
        }

        if (rpg.hp <= 0) {
            return m.reply(`HP Anda sedang habis, tidak bisa bertarung di arena. Ketik ${prefix}heal untuk memulihkan diri dulu.`)
        }
        const left = cooldownLeft(rpg.lastArena, ARENA_COOLDOWN)
        if (left > 0) {
            return m.reply(`Anda masih menunggu giliran berikutnya di arena. Tunggu ${fmtMs(left)} lagi, atau ketik ${prefix}arena top untuk melihat peringkat.`)
        }
        rpg.lastArena = Date.now()
        const skill = consumeActiveSkill(rpg)
        const mod = resolveSkillMod(skill)
        if (mod.healPercent) rpg.hp = Math.min(rpg.maxHp, rpg.hp + Math.floor(rpg.maxHp * mod.healPercent))
        const rival = makeRival(rpg.level)
        const playerAtk = Math.floor(totalAtk(rpg) * mod.atkMult)
        const playerDef = Math.floor(totalDef(rpg) * mod.defMult)
        const rivalDef = Math.floor(rival.def * (1 - mod.ignoreDefPercent))
        let rivalHp = rival.hp
        let playerHpSim = rpg.hp
        let round = 0
        let log = []
        while (rivalHp > 0 && playerHpSim > 0 && round < 15) {
            round++
            const crit = (mod.guaranteedCrit && round === 1) || Math.random() < 0.12
            let dmgToRival = Math.max(1, playerAtk - Math.floor(rivalDef / 2) - Math.floor(Math.random() * 3))
            if (crit) dmgToRival = Math.floor(dmgToRival * 1.5)
            rivalHp -= dmgToRival
            if (rivalHp <= 0) { log.push(`Ronde ${round}: Anda memberikan ${dmgToRival} damage${crit ? ' (kritikal)' : ''}, ${rival.name} tumbang.`); break }
            const dmgToPlayer = Math.max(1, rival.atk - Math.floor(playerDef / 2) - Math.floor(Math.random() * 2))
            playerHpSim -= dmgToPlayer
            log.push(`Ronde ${round}: Anda memberikan ${dmgToRival} damage${crit ? ' (kritikal)' : ''}, ${rival.name} membalas ${dmgToPlayer} damage.`)
        }
        const win = rivalHp <= 0
        rpg.hp = Math.max(1, playerHpSim)

        const header = `*ARENA*\n${skillUsedText(skill)}Anda melawan ${rival.name}.\n\n`
        const shown = log.slice(-LOG_WINDOW).map(line => `• ${line}`)

        let out = header + shown.join('\n') + '\n\n'
        if (win) {
            const points = 15 + Math.floor(rpg.level / 2)
            const money = 25 + Math.floor(20 * Math.sqrt(rpg.level))
            const exp = 15 + rpg.level * 2
            rpg.arenaPoints = (rpg.arenaPoints || 0) + points
            rpg.arenaWins = (rpg.arenaWins || 0) + 1
            rpg.wins++
            rpg.money += money
            const levelUps = addExp(rpg, exp)
            out += `*Menang!*\n`
            out += `Poin arena : +${points} (total ${rpg.arenaPoints})\n`
            out += `Emas didapat : ${fmtMoney(money)}\n`
            out += `EXP didapat : ${exp}\n`
            out += `HP tersisa : [${bar(rpg.hp, rpg.maxHp)}] ${rpg.hp}/${rpg.maxHp}\n`
            if (levelUps.length) out += `Level naik jadi ${levelUps[levelUps.length - 1].level}\n`
            const gained = checkNewTitles(rpg)
            out += titleNotifText(gained, prefix)
        } else {
            rpg.arenaLosses = (rpg.arenaLosses || 0) + 1
            rpg.losses++
            out += `*Kalah* melawan ${rival.name}, tapi tidak ada poin atau emas yang hilang di arena.\n`
            out += `HP tersisa: [${bar(rpg.hp, rpg.maxHp)}] ${rpg.hp}/${rpg.maxHp}. Latihan lagi setelah cooldown selesai.`
        }
        return m.reply(out)
    }
}
