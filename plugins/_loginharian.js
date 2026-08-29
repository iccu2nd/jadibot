import { getRpg, hasStarted, addExp, addItem, fmtMoney, openChest, DAILY_CYCLE } from '../lib/rpg.js'

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
const yesterdayStr = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

export default {
    cmd: ['sign', 'loginharian', 'login'],
    category: 'rpg',
    run: async (m, { prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const today = todayStr()
        if (rpg.lastDaily === today) {
            return m.reply(`Anda sudah sign in hari ini. Streak sekarang: ${rpg.dailyStreak} hari.\nKembali lagi besok agar streak-nya tidak putus.`)
        }
        rpg.dailyStreak = rpg.lastDaily === yesterdayStr() ? rpg.dailyStreak + 1 : 1
        rpg.lastDaily = today
        const dayInCycle = ((rpg.dailyStreak - 1) % DAILY_CYCLE) + 1
        const money = 50 + dayInCycle * 25
        const exp = 30 + dayInCycle * 12
        rpg.money += money
        const levelUps = addExp(rpg, exp)
        let text = `*SIGN IN HARIAN*\n\nHari ke-${dayInCycle}/${DAILY_CYCLE} di siklus ini, total streak ${rpg.dailyStreak} hari.\n\n`
        text += `- *Money didapat:* ${fmtMoney(money)}\n`
        text += `- *EXP didapat:* ${exp}\n`
        if (levelUps.length) text += `- *Level naik jadi:* ${levelUps[levelUps.length - 1].level}\n`
        if (dayInCycle === DAILY_CYCLE) {
            const result = openChest(rpg, 'emas')
            text += `\n*BONUS SIKLUS ${DAILY_CYCLE} HARI*\nKamu dapat Peti Emas gratis!\n${result.jackpot ? '(Jackpot!) ' : ''}${result.detail}\n`
        } else {
            addItem(rpg, 'besi_tua', 1)
            text += `- *Bonus material:* Besi Tua x1\n`
        }
        text += `\nJangan sampai lewat sehari tanpa sign in, nanti streak-nya putus dan balik ke hari 1. Sambil menunggu besok, coba ${prefix}chest untuk adu peruntungan.`
        return m.reply(text)
    }
}
