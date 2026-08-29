import { ITEMS, getRpg, hasStarted, totalAtk, totalDef, addExp, addItem, fmtMoney, fmtMs, cooldownLeft, ABYSS_UNLOCK_LEVEL, ABYSS_COOLDOWN, checkNewTitles, titleNotifText, consumeActiveSkill, resolveSkillMod, skillUsedText } from '../lib/rpg.js'

const WAVE_NAMES = [
    'Bayangan Yang Merintih', 'Penjaga Gerbang Hitam', 'Iblis Rantai',
    'Momok Abyss', 'Pemakan Cahaya', 'Ksatria Terkutuk Abadi',
    'Hantu Berdarah', 'Penunggu Jurang'
]

function rollAbyssMaterial() {
    if (Math.random() < 0.25) return 'pecahan_abyss'
    if (Math.random() < 0.35) return 'inti_iblis'
    if (Math.random() < 0.5) return 'kristal_sihir'
    return null
}
export default {
    cmd: ['abyss', 'jurang'],
    category: 'rpg',
    run: async (m, { sock, prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        if (rpg.level < ABYSS_UNLOCK_LEVEL) {
            return m.reply(
                `*ABYSS*\nZona ini baru terbuka di level ${ABYSS_UNLOCK_LEVEL}. Level Anda sekarang: ${rpg.level}.\n\n` +
                `Abyss jauh lebih berbahaya dari ${prefix}dungeon biasa, tapi material dan hadiahnya juga jauh lebih besar, termasuk perlengkapan tertinggi di game. Terus naik level lewat ${prefix}hunt dan ${prefix}dungeon untuk membuka aksesnya.`
            )
        }
        const left = cooldownLeft(rpg.lastAbyss, ABYSS_COOLDOWN)
        if (left > 0) {
            return m.reply(`Anda masih pemulihan setelah dari abyss. Tunggu ${fmtMs(left)} lagi.`)
        }
        if (rpg.hp <= 0) {
            return m.reply(`HP Anda sedang habis, tidak bisa masuk abyss. Ketik ${prefix}heal untuk memulihkan diri dulu.`)
        }
        rpg.lastAbyss = Date.now()
        const skill = consumeActiveSkill(rpg)
        const mod = resolveSkillMod(skill)
        if (mod.healPercent) rpg.hp = Math.min(rpg.maxHp, rpg.hp + Math.floor(rpg.maxHp * mod.healPercent))
        const floor = rpg.abyssFloor || 1
        const isGuardianFloor = floor % 5 === 0
        const totalWaves = isGuardianFloor ? 4 : 3
        const playerAtk = Math.floor(totalAtk(rpg) * mod.atkMult)
        const playerDef = Math.floor(totalDef(rpg) * mod.defMult)
        const header = `*ABYSS - LANTAI ${floor}*${isGuardianFloor ? ' (LANTAI PENJAGA)' : ''}\n\n${skillUsedText(skill)}`

        let log = []
        let cleared = 0
        for (let wave = 1; wave <= totalWaves; wave++) {
            if (rpg.hp <= 0) break
            const isGuardianWave = isGuardianFloor && wave === totalWaves
            const mult = 1 + (wave - 1) * 0.18
            const enemyName = isGuardianWave ? `Penjaga Abyss Lantai ${floor}` : WAVE_NAMES[Math.floor(Math.random() * WAVE_NAMES.length)]
            let enemyHp = Math.floor((isGuardianWave ? (300 + floor * 40) : (90 + floor * 35)) * mult)
            const enemyAtk = Math.floor((isGuardianWave ? (20 + floor * 7) : (14 + floor * 6)) * mult)
            let round = 0
            while (enemyHp > 0 && rpg.hp > 0 && round < 20) {
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

        const win = cleared === totalWaves
        let text = header + log.join('\n') + '\n\n'
        if (win) {
            const moneyBase = 80 + floor * 30 + Math.floor(Math.random() * 30)
            const expBase = 60 + floor * 25 + Math.floor(Math.random() * 20)
            const money = isGuardianFloor ? Math.floor(moneyBase * 1.8) : moneyBase
            const exp = isGuardianFloor ? Math.floor(expBase * 1.8) : expBase
            rpg.money += money
            const levelUps = addExp(rpg, exp)
            rpg.abyssFloor = floor + 1
            text += `*Abyss berhasil ditembus!*\n`
            text += `Emas didapat : ${fmtMoney(money)}\n`
            text += `EXP didapat : ${exp}\n`
            const material = rollAbyssMaterial()
            if (material) {
                addItem(rpg, material, 1)
                text += `Material ditemukan : ${ITEMS[material].name} x1\n`
            }
            if (isGuardianFloor) {
                addItem(rpg, 'pecahan_abyss', 1)
                text += `Penjaga tumbang, bonus tambahan : ${ITEMS.pecahan_abyss.name} x1\n`
            }
            text += `HP tersisa : ${rpg.hp}/${rpg.maxHp}\n`
            if (levelUps.length) {
                text += `\n`
                for (const lv of levelUps) {
                    text += `Level naik jadi ${lv.level}. HP maks +${lv.gainHp}, serang +${lv.gainAtk}, bertahan +${lv.gainDef}.\n`
                }
            }
            text += `\nPosisi Anda sekarang di lantai abyss ${rpg.abyssFloor}${(rpg.abyssFloor) % 5 === 0 ? ', lantai berikutnya ada penjaga abyss' : ''}.\nKetik ${prefix}abyss lagi untuk lanjut, atau ${prefix}heal dulu kalau HP menipis.\nMaterial abyss bisa ditukar jadi perlengkapan tertinggi di game lewat ${prefix}craft.`
            const gained = checkNewTitles(rpg)
            text += titleNotifText(gained, prefix)
        } else {
            const lostMoney = Math.min(rpg.money, Math.floor(rpg.money * 0.15))
            rpg.money -= lostMoney
            const newFloor = Math.max(1, floor - 2)
            rpg.abyssFloor = newFloor
            text += `*Terdesak di abyss* lantai ${floor}. Anda mundur dan kehilangan ${fmtMoney(lostMoney)} money.\n\n`
            text += `Posisi turun ke lantai abyss ${newFloor}\n`
            text += `HP tersisa : ${rpg.hp}/${rpg.maxHp}\n\n`
            text += `Pulihkan diri dulu dengan ${prefix}heal sebelum coba lagi. Abyss jauh lebih berbahaya dari dungeon biasa, pastikan gear Anda sudah maksimal.`
        }
        return m.reply(text)
    }
}
