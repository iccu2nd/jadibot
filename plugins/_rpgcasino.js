import {
    getRpg, hasStarted, totalAtk, totalDef, fmtMoney, fmtMs, cooldownLeft,
    CASINO_MIN_BET, CASINO_BASE_MAX_BET, CASINO_COOLDOWN
} from '../lib/rpg.js'

const DEALER_NAMES = ['Bandar Bertopeng', 'Sang Penjudi Ulung', 'Raja Kartu Hitam', 'Bandar Kasino Keliling']

export default {
    cmd: ['taruhan', 'kasino', 'judirpg'],
    category: 'rpg',
    run: async (m, { sock, text, prefix, cmd }) => {
        const user = global.db.data.users[m.sender] ??= {}
        user.money ??= 0

        const started = hasStarted(m.sender)
        const rpg = started ? getRpg(m.sender) : null
        const level = rpg?.level || 0
        const power = rpg ? totalAtk(rpg) + totalDef(rpg) : 0
        const maxBet = CASINO_BASE_MAX_BET + level * 150

        const bet = parseInt(text)

        if (!bet || bet < CASINO_MIN_BET) {
            let info = `*ARENA TARUHAN*\n\n`
            info += `Arena ini memakai money yang sama dengan money RPG dan koin Anda, sehingga tidak akan bentrok dengan fitur lain.\n\n`
            info += `Money Anda saat ini: ${fmtMoney(user.money)} money.\n`
            info += `Batas taruhan Anda saat ini: ${fmtMoney(maxBet)} money.\n`
            info += started
                ? `Batas taruhan dan peluang menang Anda naik seiring level karakter RPG Anda (Level ${level}).\n`
                : `Mulai karakter RPG dengan ${prefix}start untuk menaikkan batas taruhan sekaligus peluang menang Anda.\n`
            info += `\nTaruhan minimal ${fmtMoney(CASINO_MIN_BET)} money.\nContoh: ${prefix + cmd} 100`
            return m.reply(info)
        }

        if (bet > maxBet) {
            return m.reply(`Taruhan Anda melebihi batas maksimum saat ini, yaitu ${fmtMoney(maxBet)} money. ${started ? 'Naikkan level karakter RPG Anda untuk menaikkan batas taruhan.' : `Mulai karakter RPG dengan ${prefix}start untuk menaikkan batas taruhan Anda.`}`)
        }
        if (user.money < bet) {
            return m.reply(`Money Anda tidak mencukupi untuk taruhan sebesar itu.\nMoney Anda saat ini: ${fmtMoney(user.money)} money.`)
        }

        if (started) {
            const left = cooldownLeft(rpg.lastCasino, CASINO_COOLDOWN)
            if (left > 0) {
                return m.reply(`Anda harus menunggu ${fmtMs(left)} lagi sebelum dapat bertaruh kembali di Arena Taruhan.`)
            }
            rpg.lastCasino = Date.now()
        }

        const dealer = DEALER_NAMES[Math.floor(Math.random() * DEALER_NAMES.length)]

        const bonus = started ? Math.min(23, level * 0.6 + power / 40) : 0
        const winChance = Math.min(65, 42 + bonus)
        const isWin = Math.random() * 100 < winChance
        const isJackpot = isWin && Math.random() < 0.12

        let out = `*ARENA TARUHAN*\n\n`
        out += `Anda berhadapan dengan ${dealer}.\n`
        out += `Taruhan Anda: ${fmtMoney(bet)} money.\n`
        out += `Peluang menang Anda: ${winChance.toFixed(1)}%${started ? ` (dipengaruhi Level ${level} karakter RPG Anda)` : ''}\n\n`

        if (isWin) {
            const multiplier = isJackpot ? 3 : 1.8
            const prize = Math.floor(bet * multiplier)
            const net = prize - bet
            user.money += net
            out += isJackpot
                ? `🎉 *JACKPOT!* Anda menaklukkan ${dealer} secara telak.\n`
                : `✅ Anda berhasil mengalahkan ${dealer}.\n`
            out += `Anda memperoleh tambahan ${fmtMoney(net)} money.\n`
        } else {
            user.money -= bet
            out += `❌ Anda kalah melawan ${dealer}.\n`
            out += `Anda kehilangan ${fmtMoney(bet)} money.\n`
        }

        out += `Money Anda sekarang: ${fmtMoney(user.money)} money.`
        if (!started) {
            out += `\n\nTingkatkan peluang menang dan batas taruhan Anda dengan memulai karakter RPG melalui ${prefix}start.`
        }

        return m.reply(out)
    }
}
