import { fmtCowoncy, cooldownLeft, fmtMs, getOwo, earnMultiplier, getTeam, teamPower, animalStats, addAnimalExp, simulateBattle, BOSSES, PVE_COOLDOWN, progressQuest } from '../lib/owo.js'

const randRange = ([min, max]) => Math.floor(Math.random() * (max - min + 1)) + min
const LOG_WINDOW = 4

export default {
    cmd: ['owopve', 'owoboss'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const owo = getOwo(m.sender)
        const team = getTeam(m.sender)

        if (!team.length) return m.reply(`⚠️ Tim Anda masih kosong. Atur dulu pakai ${prefix}owoteam set <id1,id2,id3>.`)

        const bossId = text.trim().toLowerCase()
        if (!bossId) {
            let out = `👹 *OWO BOSS*\n\n`
            for (const b of BOSSES) {
                out += `${b.emoji} *${b.name}* (${b.id})\n  HP ${b.hp} | ATK ${b.atk} | DEF ${b.def}\n  Hadiah: ${b.goldMin}-${b.goldMax} 🦴, ${b.expMin}-${b.expMax} EXP\n\n`
            }
            const power = teamPower(m.sender)
            out += `📊 Kekuatan tim Anda: HP ${power.hp} | ATK ${power.atk} | DEF ${power.def}\n\n`
            out += `Lawan boss: ${prefix + cmd} <id>`
            return m.reply(out)
        }

        const boss = BOSSES.find(b => b.id === bossId)
        if (!boss) return m.reply(`⚠️ Boss tidak ditemukan. Ketik ${prefix + cmd} untuk lihat daftar.`)

        const left = cooldownLeft(owo.lastPve, PVE_COOLDOWN)
        if (left > 0) return m.reply(`⏳ Tim Anda masih istirahat. Tunggu ${fmtMs(left)} lagi.`)

        owo.lastPve = Date.now()

        const power = teamPower(m.sender)
        const result = simulateBattle(power, { hp: boss.hp, atk: boss.atk, def: boss.def })
        const won = result.winner === 'a'

        let out = `${boss.emoji} *LAWAN ${boss.name.toUpperCase()}*\n\n`
        out += result.log.slice(-LOG_WINDOW).join('\n') + '\n\n'
        out += `HP Anda tersisa: ${result.hpA} | HP boss tersisa: ${result.hpB}\n\n`

        if (won) {
            const baseGold = randRange([boss.goldMin, boss.goldMax])
            const gold = Math.floor(baseGold * earnMultiplier(m.sender))
            const exp = randRange([boss.expMin, boss.expMax])
            owo.cowoncy += gold
            owo.totalEarned += gold

            let levelUps = []
            for (const id of team) {
                const r = addAnimalExp(m.sender, id, Math.floor(exp / team.length))
                if (r.leveledUp) levelUps.push(`${id} naik ke Lv.${r.level}`)
            }

            out += `🎉 *MENANG!*\n+${fmtCowoncy(gold)}\n+${exp} EXP dibagi ke tim`
            if (levelUps.length) out += `\n\n⬆️ ${levelUps.join(', ')}`
            progressQuest(m.sender, 'winBattle')
        } else {
            out += `💀 *KALAH* Tim Anda kalah. Latihan dulu atau upgrade senjata.`
        }

        return m.reply(out)
    }
}
