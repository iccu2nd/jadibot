import { getRpg, hasStarted, totalAtk, totalDef, addExp, fmtMoney, fmtMs, cooldownLeft, HUNT_COOLDOWN, checkNewTitles, titleNotifText, consumeActiveSkill, resolveSkillMod, skillUsedText, getRank } from '../lib/rpg.js'

const MONSTERS = [
    { name: 'Tikus Got', tier: 1, hp: 20, atk: 4, money: [8, 20], exp: [10, 18] },
    { name: 'Anjing Liar', tier: 1, hp: 28, atk: 6, money: [10, 25], exp: [12, 22] },
    { name: 'Begal Jalanan', tier: 2, hp: 45, atk: 9, money: [20, 45], exp: [20, 35] },
    { name: 'Zombie Kelaparan', tier: 2, hp: 55, atk: 10, money: [25, 50], exp: [24, 40] },
    { name: 'Bandit Bersenjata', tier: 3, hp: 80, atk: 14, money: [40, 80], exp: [35, 55] },
    { name: 'Serigala Raksasa', tier: 3, hp: 95, atk: 16, money: [45, 90], exp: [40, 60] },
    { name: 'Orc Penjaga Hutan', tier: 4, hp: 140, atk: 20, money: [70, 130], exp: [60, 90] },
    { name: 'Ksatria Kegelapan', tier: 4, hp: 160, atk: 23, money: [80, 150], exp: [70, 100] },
    { name: 'Naga Muda', tier: 5, hp: 240, atk: 30, money: [130, 220], exp: [110, 160] },
    { name: 'Iblis Terkutuk', tier: 5, hp: 280, atk: 34, money: [150, 260], exp: [130, 190] }
]

const randRange = ([min, max]) => Math.floor(Math.random() * (max - min + 1)) + min
const pickMonster = level => {
    const tier = Math.min(5, Math.max(1, Math.ceil(level / 4)))
    const pool = MONSTERS.filter(mo => Math.abs(mo.tier - tier) <= 1)
    return pool[Math.floor(Math.random() * pool.length)]
}
const LOG_WINDOW = 4

export default {
    cmd: ['hunt', 'berburu'],
    category: 'rpg',
    run: async (m, { sock, prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const left = cooldownLeft(rpg.lastHunt, HUNT_COOLDOWN)
        if (left > 0) {
            return m.reply(`Anda masih lelah setelah berburu. Tunggu ${fmtMs(left)} lagi.`)
        }
        if (rpg.hp <= 0) {
            return m.reply(`HP Anda sedang habis, tidak bisa berburu. Ketik ${prefix}heal untuk memulihkan diri dulu.`)
        }
        rpg.lastHunt = Date.now()
        const skill = consumeActiveSkill(rpg)
        const mod = resolveSkillMod(skill)
        if (mod.healPercent) rpg.hp = Math.min(rpg.maxHp, rpg.hp + Math.floor(rpg.maxHp * mod.healPercent))
        const monster = pickMonster(rpg.level)
        let monsterHp = monster.hp
        const playerAtk = Math.floor(totalAtk(rpg) * mod.atkMult)
        const playerDef = Math.floor(totalDef(rpg) * mod.defMult)
        let log = []
        let round = 0
        while (monsterHp > 0 && rpg.hp > 0 && round < 20) {
            round++
            const crit = (mod.guaranteedCrit && round === 1) || Math.random() < 0.15
            let dmgToMonster = Math.max(1, playerAtk - Math.floor(Math.random() * 3))
            if (crit) dmgToMonster = Math.floor(dmgToMonster * 1.8)
            monsterHp -= dmgToMonster
            if (monsterHp <= 0) {
                log.push(`Ronde ${round}: Anda memberikan ${dmgToMonster} damage${crit ? ' (kritikal)' : ''}, ${monster.name} berhasil ditumbangkan.`)
                break
            }
            let dmgToPlayer = Math.max(1, monster.atk - Math.floor(playerDef / 2) - Math.floor(Math.random() * 2))
            rpg.hp = Math.max(0, rpg.hp - dmgToPlayer)
            log.push(`Ronde ${round}: Anda memberikan ${dmgToMonster} damage${crit ? ' (kritikal)' : ''}, ${monster.name} membalas ${dmgToPlayer} damage. HP Anda tersisa ${rpg.hp}.`)
        }
        const win = monsterHp <= 0 && rpg.hp > 0

        const header = `*BERBURU*\n${skillUsedText(skill)}Anda bertemu ${monster.name} di tengah jalan.\n\n`
        const shown = log.slice(-LOG_WINDOW).map(line => `• ${line}`)

        let text = header + shown.join('\n') + '\n\n'
        if (win) {
            const money = randRange(monster.money)
            const exp = randRange(monster.exp)
            rpg.money += money
            const rankBefore = getRank(rpg.level)
            const levelUps = addExp(rpg, exp)
            rpg.wins++
            text += `*Menang!*\n`
            text += `Emas didapat : ${fmtMoney(money)}\n`
            text += `EXP didapat : ${exp}\n`
            text += `HP sekarang : ${rpg.hp}/${rpg.maxHp}\n`
            if (levelUps.length) {
                for (const lv of levelUps) {
                    text += `\nLevel naik jadi ${lv.level}. HP maks +${lv.gainHp}, serang +${lv.gainAtk}, bertahan +${lv.gainDef}.`
                }
                text += `\nHP Anda dipulihkan penuh karena naik level.`
            }
            const rankAfter = getRank(rpg.level)
            const rankUp = rankAfter.id !== rankBefore.id
            if (rankUp) text += `\n\n🏅 *NAIK PANGKAT!* @${m.sender.split('@')[0]} sekarang berpangkat *${rankAfter.name}*.`
            const gained = checkNewTitles(rpg)
            text += titleNotifText(gained, prefix)
        } else {
            const lostMoney = Math.min(rpg.money, Math.floor(rpg.money * 0.15))
            rpg.money -= lostMoney
            rpg.losses++
            text += `*Kalah* melawan ${monster.name}. Anda terpaksa mundur dan kehilangan ${fmtMoney(lostMoney)} money.\n`
            text += `HP sekarang: ${rpg.hp}/${rpg.maxHp}. Istirahat dulu dengan ${prefix}heal sebelum berburu lagi.`
        }
        return m.reply(text, text.includes('NAIK PANGKAT') ? { mentions: [m.sender] } : undefined)
    }
}
