import { getOwoBoostStatus, fmtMs } from '../lib/owo.js'

export default {
    cmd: ['boostinfo', 'cekboost', 'boost'],
    category: 'owo',
    run: async (m, { prefix }) => {
        if (!m.isGroup) return m.reply('⚠️ Boost hanya berlaku per grup. Cek di dalam grup untuk lihat statusnya.')

        const { active, multiplier, expiresAt } = getOwoBoostStatus(m.from)

        let out = `*🚀 OwO Boost (grup ini)*\n\n`

        if (active) {
            out += `› Status : *${multiplier}x AKTIF* ✅\n`
            out += expiresAt
                ? `› Sisa waktu : ${fmtMs(expiresAt - Date.now())}\n`
                : `› Durasi : Permanen\n`
            out += `› Berlaku untuk : rare, epic, mythical, legendary, secret\n\n`
            out += `Segera gunakan ${prefix}huntanimal, peluang mendapatkan hewan langka sedang tinggi! 🌿`
        } else {
            out += `› Status : *OFF (1x, normal)* ❌\n\n`
            out += `Tidak ada boost yang lagi jalan sekarang.`
        }

        return m.reply(out)
    }
}
