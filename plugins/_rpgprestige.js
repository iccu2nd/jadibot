import { CLASSES, getRpg, hasStarted, expNeeded, REBORN_MIN_LEVEL, prestigeCost, prestigeBonusPercent, fmtMoney, checkNewTitles, titleNotifText } from '../lib/rpg.js'

export default {
    cmd: ['prestige', 'reborn', 'lahirkembali'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const confirm = text.trim().toLowerCase()
        const cost = prestigeCost(rpg.prestige)

        if (rpg.level < REBORN_MIN_LEVEL) {
            return m.reply(
                `*PRESTIGE*\nFitur ini baru bisa dipakai setelah karakter mencapai level ${REBORN_MIN_LEVEL}.\n` +
                `Level Anda sekarang: ${rpg.level}.\n\n` +
                `Prestige mengembalikan level ke 1 dan statistik dasar ke awal, dengan imbalan bonus serang/bertahan permanen. Emas, perlengkapan, dan gelar tetap tersimpan, tapi setiap kali prestige dikenakan biaya emas agar hasil kerja keras tidak menumpuk tanpa arah.`
            )
        }

        if (rpg.money < cost) {
            return m.reply(
                `*PRESTIGE*\nBiaya untuk prestige saat ini: ${fmtMoney(cost)} money.\n` +
                `Emas Anda: ${fmtMoney(rpg.money)}.\n\n` +
                `Kumpulkan emas lebih banyak dulu sebelum melakukan prestige.`
            )
        }

        if (confirm !== 'ya') {
            const currentPercent = prestigeBonusPercent(rpg.prestige)
            const nextPercent = prestigeBonusPercent(rpg.prestige + 1)
            return m.reply(
                `*KONFIRMASI PRESTIGE*\n` +
                `Anda akan lahir kembali dari level ${rpg.level} menjadi level 1.\n\n` +
                `• Level dan EXP direset ke awal\n` +
                `• Statistik dasar kembali ke titik awal class\n` +
                `• Emas, perlengkapan, hewan peliharaan, dan gelar tetap tersimpan\n` +
                `• Biaya prestige: ${fmtMoney(cost)} money\n` +
                `• Bonus permanen serang & bertahan naik dari +${currentPercent}% menjadi +${nextPercent}%\n\n` +
                `Catatan: sepuluh prestige pertama menambah 5% per tingkat. Setelah itu kenaikannya diperkecil menjadi 1% per tingkat, supaya kekuatan pemain lama tidak melesat jauh dari pemain baru.\n\n` +
                `Yakin ingin lanjut? Ketik ${prefix + cmd} ya untuk konfirmasi.`
            )
        }

        rpg.money -= cost
        const c = CLASSES[rpg.class]
        rpg.prestige = (rpg.prestige || 0) + 1
        rpg.level = 1
        rpg.exp = 0
        rpg.maxHp = c.hp
        rpg.hp = c.hp
        rpg.atk = c.atk
        rpg.def = c.def

        let out = `*PRESTIGE BERHASIL*\nKamu terlahir kembali sebagai ${c.name} tingkat prestige ke-${rpg.prestige}.\n\n`
        out += `• Biaya yang dibayarkan: ${fmtMoney(cost)} money\n`
        out += `• Level kembali ke 1, EXP yang dibutuhkan untuk naik level berikutnya: ${expNeeded(1)}\n`
        out += `• Bonus permanen serang & bertahan sekarang +${prestigeBonusPercent(rpg.prestige)}%\n`
        out += `• Emas, perlengkapan, hewan peliharaan, dan gelar tidak hilang\n\n`
        out += `Lanjutkan petualangan lewat ${prefix}hunt atau ${prefix}dungeon untuk naik level lebih cepat dari sebelumnya.`
        const gained = checkNewTitles(rpg)
        out += titleNotifText(gained, prefix)
        return m.reply(out)
    }
}
