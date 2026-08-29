import { ITEMS, getRpg, hasStarted, totalAtk, totalDef, addExp, addItem, fmtMoney, fmtMs, cooldownLeft, DUNGEON_COOLDOWN, checkNewTitles, titleNotifText, consumeActiveSkill, resolveSkillMod, skillUsedText } from '../lib/rpg.js'

const WAVE_NAMES = [
    'Goblin Penjaga Gerbang', 'Laba-laba Raksasa', 'Ksatria Bayangan',
    'Pemburu Kegelapan', 'Golem Batu', 'Penyihir Terkutuk',
    'Serigala Neraka', 'Momok Berkabut', 'Algojo Bertopeng', 'Roh Penunggu Lantai'
]

function rollMaterial(floor) {
    if (floor >= 12 && Math.random() < 0.18) return 'inti_iblis'
    if (floor >= 5 && Math.random() < 0.35) return 'kristal_sihir'
    if (Math.random() < 0.55) return 'besi_tua'
    return null
}
export default {
    cmd: ['dungeon', 'jelajah'],
    category: 'rpg',
    run: async (m, { sock, prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const left = cooldownLeft(rpg.lastDungeon, DUNGEON_COOLDOWN)
        if (left > 0) {
            return m.reply(`Anda masih pemulihan setelah menjelajah dungeon. Tunggu ${fmtMs(left)} lagi.`)
        }
        if (rpg.hp <= 0) {
            return m.reply(`HP Anda sedang habis, tidak bisa masuk dungeon. Ketik ${prefix}heal untuk memulihkan diri dulu.`)
        }
        rpg.lastDungeon = Date.now()
        const skill = consumeActiveSkill(rpg)
        const mod = resolveSkillMod(skill)
        if (mod.healPercent) rpg.hp = Math.min(rpg.maxHp, rpg.hp + Math.floor(rpg.maxHp * mod.healPercent))
        const floor = rpg.dungeonFloor || 1
        const playerAtk = Math.floor(totalAtk(rpg) * mod.atkMult)
        const playerDef = Math.floor(totalDef(rpg) * mod.defMult)
        const header = `*EKSPEDISI DUNGEON - LANTAI ${floor}*\n\n${skillUsedText(skill)}`

        let log = []
        let cleared = 0
        for (let wave = 1; wave <= 3; wave++) {
            if (rpg.hp <= 0) break
            const mult = 1 + (wave - 1) * 0.15
            const enemyName = WAVE_NAMES[Math.floor(Math.random() * WAVE_NAMES.length)]
            let enemyHp = Math.floor((40 + floor * 18) * mult)
            const enemyAtk = Math.floor((6 + floor * 3) * mult)
            let round = 0
            while (enemyHp > 0 && rpg.hp > 0 && round < 15) {
                round++
                const crit = (mod.guaranteedCrit && wave === 1 && round === 1) || Math.random() < 0.15
                let dmgToEnemy = Math.max(1, playerAtk - Math.floor(Math.random() * 3))
                if (crit) dmgToEnemy = Math.floor(dmgToEnemy * 1.8)
                enemyHp -= dmgToEnemy
                if (enemyHp <= 0) break
                const dmgToPlayer = Math.max(1, enemyAtk - Math.floor(playerDef / 2) - Math.floor(Math.random() * 2))
                rpg.hp = Math.max(0, rpg.hp - dmgToPlayer)
            }
            if (rpg.hp <= 0) {
                log.push(`• Gelombang ${wave}: kalah melawan ${enemyName}, HP terkuras habis.`)
                break
            }
            log.push(`• Gelombang ${wave}: berhasil mengalahkan ${enemyName}.`)
            cleared++
        }

        const win = cleared === 3
        let text = header + log.join('\n') + '\n\n'
        if (win) {
            const money = 30 + floor * 12 + Math.floor(Math.random() * 20)
            const exp = 25 + floor * 10 + Math.floor(Math.random() * 15)
            rpg.money += money
            const levelUps = addExp(rpg, exp)
            const material = rollMaterial(floor)
            rpg.dungeonFloor = floor + 1
            text += `*Ekspedisi berhasil!*\n`
            text += `Emas didapat : ${fmtMoney(money)}\n`
            text += `EXP didapat : ${exp}\n`
            if (material) {
                addItem(rpg, material, 1)
                text += `Material ditemukan : ${ITEMS[material].name} x1\n`
            }
            text += `HP tersisa : ${rpg.hp}/${rpg.maxHp}\n`
            if (levelUps.length) {
                text += `\n`
                for (const lv of levelUps) {
                    text += `Level naik jadi ${lv.level}. HP maks +${lv.gainHp}, serang +${lv.gainAtk}, bertahan +${lv.gainDef}.\n`
                }
            }
            text += `\nLantai berhasil dilewati, posisi Anda sekarang di lantai ${rpg.dungeonFloor}.\nKetik ${prefix}dungeon lagi untuk lanjut, atau ${prefix}heal dulu kalau HP menipis.\nJangan lupa cek ${prefix}craft, material yang Anda kumpulkan bisa ditukar jadi perlengkapan legendaris.`
            const gained = checkNewTitles(rpg)
            text += titleNotifText(gained, prefix)
        } else {
            const lostMoney = Math.min(rpg.money, Math.floor(rpg.money * 0.1))
            rpg.money -= lostMoney
            const newFloor = Math.max(1, floor - 1)
            rpg.dungeonFloor = newFloor
            text += `*Ekspedisi gagal* di lantai ${floor}. Anda terdesak mundur dan kehilangan ${fmtMoney(lostMoney)} money.\n\n`
            text += `Posisi turun ke lantai ${newFloor}\n`
            text += `HP tersisa : ${rpg.hp}/${rpg.maxHp}\n\n`
            text += `Pulihkan diri dulu dengan ${prefix}heal sebelum coba lagi.`
        }
        return m.reply(text)
    }
}
