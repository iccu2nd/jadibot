import { getRpg, hasStarted, totalAtk, totalDef, fmtMoney, fmtMs, cooldownLeft, DUEL_COOLDOWN, checkNewTitles, titleNotifText, consumeActiveSkill, resolveSkillMod, skillUsedText } from '../lib/rpg.js'

const LOG_WINDOW = 4

export default {
    cmd: ['duel', 'tarung'],
    category: 'rpg',
    run: async (m, { sock, text, prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const target = m.mentionedJid?.[0] || m.quoted?.sender
        if (!target) return m.reply(`Tag atau reply orang yang ingin Anda tantang, lalu sertakan jumlah taruhan.\nContoh: ${prefix}duel @orang 100`)
        if (target === m.sender) return m.reply(`Anda tidak bisa berduel melawan diri sendiri.`)
        if (!hasStarted(target)) return m.reply(`Orang itu belum punya karakter, ajak dia ketik ${prefix}start dulu.`)
        let betText = text
        if (m.mentionedJid?.length) {
            for (const jid of m.mentionedJid) {
                const num = jid.split('@')[0]
                betText = betText.split('@' + num).join(' ')
            }
        }
        const betMatch = betText.match(/\d+/g)
        const bet = betMatch ? parseInt(betMatch[betMatch.length - 1]) : NaN
        if (!bet || bet < 1) return m.reply(`Sertakan jumlah taruhannya. Contoh: ${prefix}duel @orang 100`)
        const attacker = getRpg(m.sender)
        const defender = getRpg(target)
        const left = cooldownLeft(attacker.lastDuel, DUEL_COOLDOWN)
        if (left > 0) return m.reply(`Anda masih dalam masa cooldown setelah duel. Tunggu ${fmtMs(left)} lagi.`)
        const targetLeft = cooldownLeft(defender.lastDuel, DUEL_COOLDOWN)
        if (targetLeft > 0) return m.reply(`Orang itu baru saja duel, berikan dia jeda dulu. Tunggu ${fmtMs(targetLeft)} lagi sebelum bisa menantangnya.`)
        if (attacker.money < bet) return m.reply(`Money Anda tidak cukup untuk taruhan segitu. Money Anda ${fmtMoney(attacker.money)}.`)
        if (defender.money < bet) return m.reply(`Money lawan tidak cukup untuk taruhan segitu, coba turunkan nominalnya.`)
        attacker.lastDuel = Date.now()
        defender.lastDuel = Date.now()
        const skill = consumeActiveSkill(attacker)
        const mod = resolveSkillMod(skill)
        if (mod.healPercent) attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.floor(attacker.maxHp * mod.healPercent))
        const aAtk = Math.floor(totalAtk(attacker) * mod.atkMult), aDef = Math.floor(totalDef(attacker) * mod.defMult)
        const dAtk = totalAtk(defender), dDefRaw = totalDef(defender)
        const dDef = Math.floor(dDefRaw * (1 - mod.ignoreDefPercent))
        const aScore = aAtk + aDef * 0.5
        const dScore = dAtk + dDef * 0.5
        const MIN_CHANCE = 0.18
        const MAX_CHANCE = 0.82
        const rawChance = aScore / (aScore + dScore)
        const attackerWinChance = Math.min(MAX_CHANCE, Math.max(MIN_CHANCE, rawChance))
        const attackerWins = (mod.guaranteedCrit ? Math.min(0.95, attackerWinChance + 0.15) : attackerWinChance) > Math.random()

        const aFactor = attackerWins ? 1.3 : 0.75
        const dFactor = attackerWins ? 0.75 : 1.3
        let aHp = attacker.hp > 0 ? attacker.hp : attacker.maxHp
        let dHp = defender.hp > 0 ? defender.hp : defender.maxHp
        let round = 0
        let log = []
        while (aHp > 0 && dHp > 0 && round < 15) {
            round++
            const crit = (mod.guaranteedCrit && round === 1) || Math.random() < 0.15
            let dmgToDefender = Math.max(1, Math.floor((aAtk - dDef / 2) * aFactor * (0.75 + Math.random() * 0.5)))
            if (crit) dmgToDefender = Math.floor(dmgToDefender * 1.5)
            dHp -= dmgToDefender
            if (dHp <= 0) { log.push(`Ronde ${round}: Anda memberikan ${dmgToDefender} damage${crit ? ' (kritikal)' : ''}, lawan tumbang.`); break }
            const dCrit = Math.random() < 0.15
            let dmgToAttacker = Math.max(1, Math.floor((dAtk - aDef / 2) * dFactor * (0.75 + Math.random() * 0.5)))
            if (dCrit) dmgToAttacker = Math.floor(dmgToAttacker * 1.5)
            aHp -= dmgToAttacker
            if (aHp <= 0) { log.push(`Ronde ${round}: Anda memberikan ${dmgToDefender} damage${crit ? ' (kritikal)' : ''}, lawan membalas ${dmgToAttacker} damage${dCrit ? ' (kritikal)' : ''}, Anda tumbang.`); break }
            log.push(`Ronde ${round}: Anda memberikan ${dmgToDefender} damage${crit ? ' (kritikal)' : ''}, lawan membalas ${dmgToAttacker} damage${dCrit ? ' (kritikal)' : ''}.`)
        }

        const header = `*DUEL*\n${skillUsedText(skill)}Taruhan ${fmtMoney(bet)} money melawan @${target.split('@')[0]}.\n\n`
        const shown = log.map(line => `• ${line}`).slice(-LOG_WINDOW)
        let out = header + shown.join('\n') + '\n\n'
        if (attackerWins) {
            attacker.money += bet
            defender.money -= bet
            attacker.wins++
            defender.losses++
            out += `*Menang*, Anda dapat ${fmtMoney(bet)} money dari lawan.`
            const gained = checkNewTitles(attacker)
            out += titleNotifText(gained, prefix)
        } else {
            attacker.money -= bet
            defender.money += bet
            attacker.losses++
            defender.wins++
            out += `*Kalah*, Anda kehilangan ${fmtMoney(bet)} money.`
        }
        return sock.sendMessage(m.from, { text: out, mentions: [target] }, { quoted: m })
    }
}
