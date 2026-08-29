import { hasStarted, REBORN_MIN_LEVEL, ABYSS_UNLOCK_LEVEL, GUILD_CREATE_MIN_LEVEL } from '../lib/rpg.js'

const TOPICS = {
    mulai: {
        title: 'MULAI MAIN',
        body: prefix =>
            `1. ${prefix}start — untuk karakter, pilih salah satu class:\n` +
            `   • Petarung — HP besar, damage stabil, cocok untuk pemula\n` +
            `   • Penyihir — damage paling sakit, tapi HP tipis\n` +
            `   • Pembunuh — seimbang, sering keluar kritikal\n\n` +
            `2. ${prefix}hunt — buru monster kecil untuk emas & EXP pertama. Cooldown singkat, bisa diulang terus.\n\n` +
            `3. ${prefix}shop lalu ${prefix}buy <item> — beli senjata/zirah murah pertama.\n\n` +
            `4. ${prefix}equip <item> — pasang senjata/zirah yang sudah dibeli agar ATK/DEF naik.\n\n` +
            `5. ${prefix}quest — ambil misi harian & mingguan, sumber emas/EXP paling stabil tiap hari.\n\n` +
            `Kalau HP habis, jangan panik — ketik ${prefix}heal untuk pulihkan diri sebelum lanjut bertarung.`
    },
    tarung: {
        title: 'MODE BERTARUNG',
        body: prefix =>
            `${prefix}hunt — lawan monster kecil satu-satu, cocok dipakai berulang-ulang, resiko kecil.\n\n` +
            `${prefix}dungeon — jelajah lantai demi lantai, makin dalam makin besar hadiah & materialnya.\n\n` +
            `${prefix}abyss — mode lanjutan, baru kebuka di level ${ABYSS_UNLOCK_LEVEL}, resiko dan hadiahnya jauh lebih tinggi dari dungeon biasa.\n\n` +
            `${prefix}arena — lawan musuh AI yang disesuaikan levelmu, dapat poin arena + emas kalau menang, kalau kalah tidak rugi apa-apa.\n\n` +
            `${prefix}duel — adu kekuatan langsung lawan pemain lain.\n\n` +
            `${prefix}boss — raid rame-rame lawan boss dunia yang muncul di grup, hadiah dibagi sesuai damage yang Anda berikan.\n\n` +
            `Event Dunia — kadang muncul dadakan di grup, langsung ketik *ambil* untuk rebutan hadiahnya. Admin bisa atur nyala/matinya lewat ${prefix}worldevent.\n\n` +
            `Tips: pakai ${prefix}skill sebelum bertarung berat agar dapat bonus serang/bertahan sementara.`
    },
    gear: {
        title: 'PERLENGKAPAN & CRAFTING',
        body: prefix =>
            `${prefix}shop / ${prefix}buy <item> — beli senjata, zirah, dan bahan dasar pakai emas.\n\n` +
            `${prefix}equip <item> — pasang senjata/zirah dari tas.\n\n` +
            `${prefix}inventory — lihat isi tas Anda.\n\n` +
            `${prefix}craft — tukar material langka jadi perlengkapan tingkat legendaris/abyssal, lebih kuat dari yang dijual di shop.\n\n` +
            `${prefix}enchant — tingkatkan (refine) perlengkapan yang sudah dipasang agar makin kuat.\n\n` +
            `${prefix}sell — jual barang yang tidak terpakai untuk emas.\n\n` +
            `${prefix}market — jual/beli barang langsung ke sesama pemain, kena pajak kecil tiap transaksi.\n\n` +
            `${prefix}fish lalu ${prefix}cook — mancing ikan, terus masak jadi buff sementara sebelum bertarung.\n\n` +
            `${prefix}pet dan ${prefix}mount — punya peliharaan/tunggangan sendiri, bonus ATK/DEF-nya nempel terus selama dimiliki.`
    },
    ekonomi: {
        title: 'EMAS, JUDI & TRANSFER',
        body: prefix =>
            `${prefix}chest / ${prefix}peti — beli dan buka peti harta untuk emas/item acak. Makin mahal petinya, makin besar peluang jackpot.\n\n` +
            `${prefix}taruhan — kasino RPG, pasang taruhan pakai emas yang sama dengan RPG.\n\n` +
            `${prefix}give @orang <jumlah> — kirim emas ke pemain lain.\n` +
            `${prefix}give @orang <nama barang> <jumlah> — kirim barang dari tas ke pemain lain.\n\n` +
            `Catatan soal emas: jangan takut belanja atau buka peti. Emas yang ditimbun tidak ada gunanya kecuali dipakai untuk menaikkan kekuatan lewat gear, craft, atau prestige.`
    },
    progres: {
        title: 'PROGRES & FITUR SOSIAL',
        body: prefix =>
            `${prefix}skill — pelajari & pasang jurus khusus sesuai class Anda.\n\n` +
            `${prefix}title — lihat & pasang gelar yang sudah terbuka dari pencapaian tertentu.\n\n` +
            `${prefix}achievement — cek daftar pencapaian dan progresnya, ada hadiah emas/material tiap berhasil klaim.\n\n` +
            `${prefix}guild — gabung atau bikin klan (min level ${GUILD_CREATE_MIN_LEVEL}) untuk bonus stat permanen bersama teman satu klan.\n\n` +
            `${prefix}prestige — reborn setelah level ${REBORN_MIN_LEVEL}: level balik ke 1, tapi dapat bonus serang/bertahan permanen. Setiap kali prestige dikenakan biaya emas yang naik bertahap, jadi emas yang Anda kumpulkan sepanjang perjalanan benar-benar terpakai. Sepuluh prestige pertama menambah 5% per tingkat, setelah itu hanya 1% per tingkat agar tidak timpang sama pemain baru.\n\n` +
            `${prefix}leaderboard — lihat ranking pemain lain.`
    }
}

const TOPIC_ALIASES = {
    mulai: 'mulai', awal: 'mulai', start: 'mulai',
    tarung: 'tarung', bertarung: 'tarung', combat: 'tarung',
    gear: 'gear', perlengkapan: 'gear', craft: 'gear', crafting: 'gear',
    ekonomi: 'ekonomi', emas: 'ekonomi', judi: 'ekonomi',
    progres: 'progres', progress: 'progres', sosial: 'progres', klan: 'progres', guild: 'progres'
}

export default {
    cmd: ['tutorial', 'guide', 'panduan'],
    category: 'rpg',
    run: async (m, { text, prefix }) => {
        const started = hasStarted(m.sender)
        const query = text.trim().toLowerCase()
        const topicKey = TOPIC_ALIASES[query]

        if (topicKey) {
            const topic = TOPICS[topicKey]
            let out = `*PANDUAN RPG — ${topic.title}*\n\n`
            out += topic.body(prefix)
            out += `\n\nKetik ${prefix}tutorial untuk lihat daftar topik lain.`
            return m.reply(out)
        }

        let out = `*PANDUAN LENGKAP RPG*\n\n`
        if (!started) {
            out += `Anda belum punya karakter. Mulai dengan ${prefix}start, lalu pilih salah satu class yang ditampilkan.\n\n`
        }
        out += `Panduan ini dibagi per topik agar tidak kepanjangan. Ketik salah satu:\n\n`
        out += `${prefix}tutorial mulai — langkah awal untuk pemula\n`
        out += `${prefix}tutorial tarung — semua mode bertarung (hunt, dungeon, abyss, boss, arena, duel)\n`
        out += `${prefix}tutorial gear — perlengkapan, crafting, enchant, pet & mount\n`
        out += `${prefix}tutorial ekonomi — peti, judi, dan transfer emas/barang\n`
        out += `${prefix}tutorial progres — skill, gelar, pencapaian, prestige, klan\n\n`
        out += `Ketik ${prefix}profile kapan saja untuk melihat status lengkap karaktermu.`

        return m.reply(out)
    }
}
