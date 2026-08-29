import { getOwo, fmtCowoncy, MAX_TEAM_SIZE } from '../lib/owo.js'

const TOPICS = {
    mulai: {
        title: 'MULAI MAIN',
        body: prefix =>
            `1. ${prefix}owodaily — klaim saldo harian. Makin sering klaim berturut-turut (streak), makin besar bonusnya.\n\n` +
            `2. ${prefix}huntanimal lalu ${prefix}catch — cari hewan liar, tangkap sebelum kabur. Bisa pakai tangan kosong atau item tangkap agar peluangnya lebih besar.\n\n` +
            `3. ${prefix}owosell — jual hewan/hasil tangkapan yang tidak terpakai untuk cowoncy atau essence.\n\n` +
            `4. ${prefix}owoweapon — tukar essence + cowoncy jadi senjata untuk menaikkan ATK/DEF tim battle Anda.\n\n` +
            `5. ${prefix}owoteam — susun 3 hewan terbaikmu jadi satu tim untuk dipakai battle.\n\n` +
            `Ketik ${prefix}owoprofile kapan saja untuk cek status lengkap Anda.`
    },
    hewan: {
        title: 'KOLEKSI HEWAN',
        body: prefix =>
            `${prefix}huntanimal — cari hewan liar, muncul acak dari rarity Common sampai Legendary.\n\n` +
            `${prefix}catch <item> — tangkap hewan yang lagi muncul. Tanpa item pakai tangan kosong (peluang paling kecil), makin bagus itemnya makin besar peluang berhasilnya. Beli item tangkap di ${prefix}owoshop.\n\n` +
            `${prefix}owodex — lihat semua hewan yang bisa ditangkap beserta peluang tangkap dasarnya.\n\n` +
            `${prefix}owozoo — lihat koleksi hewan Anda (atau mention orang lain untuk lihat koleksinya).\n\n` +
            `${prefix}owogiveanimal @orang <nama hewan> [jumlah] — berikan hewan dari kandangmu ke pemain lain, gratis tanpa potongan.\n\n` +
            `Ada satu hewan rahasia paling langka di atas Legendary, namanya baru kelihatan kalau Anda berhasil menangkapnya sendiri. Peluang munculnya sangat kecil, jadi jangan berkecil hati kalau belum dapat — terus saja rajin ${prefix}huntanimal.`
    },
    tarung: {
        title: 'BERTARUNG',
        body: prefix =>
            `Siapkan tim dulu lewat ${prefix}owoteam sebelum bertarung, isi sampai ${MAX_TEAM_SIZE} hewan terbaikmu.\n\n` +
            `${prefix}owopve — lawan boss AI, menang dapat cowoncy dan essence. Aman dicoba berkali-kali, tidak ada resiko dicuri pemain lain.\n\n` +
            `${prefix}owopvp @orang — lawan pemain lain langsung. Kalau menang, bisa curi sedikit saldo dari lawan.\n\n` +
            `Tips: simpan saldo besar di ${prefix}owobank agar aman dari curian PvP, karena yang bisa dicuri hanya saldo yang dipegang di tangan (cowoncy), bukan yang di bank.`
    },
    ekonomi: {
        title: 'EKONOMI & TRANSFER',
        body: prefix =>
            `${prefix}owobank — simpan/tarik saldo dari bank, aman dari steal PvP.\n\n` +
            `${prefix}owotransfer @orang <jumlah> — kirim cowoncy ke pemain lain, kena pajak kecil kalau jumlahnya besar.\n\n` +
            `${prefix}owogiveanimal @orang <nama hewan> [jumlah] — berikan hewan ke pemain lain, gratis tanpa pajak.\n\n` +
            `${prefix}owoshop / ${prefix}owobuy — beli item tangkap, perlengkapan, atau bahan lain pakai cowoncy.\n\n` +
            `${prefix}owolootbox — buka kotak berhadiah acak: cowoncy, essence, item tangkap, atau gem.\n\n` +
            `${prefix}owoquest — misi harian, selesaikan untuk dapat reward cowoncy/essence tambahan.\n\n` +
            `${prefix}owoflip dan ${prefix}owoslots — judi-judian pakai cowoncy, hati-hati boncos, jangan taruhan lebih dari yang Anda rela kehilangan.`
    },
    sosial: {
        title: 'SOSIAL & LAIN-LAIN',
        body: prefix =>
            `${prefix}owocookie — beli buff sementara untuk menambah earning dari daily/battle.\n\n` +
            `${prefix}owopray / ${prefix}owocurse — doa atau kutuk harian, dapat cowoncy kecil-kecilan.\n\n` +
            `${prefix}owomarry @orang — nikah sesama pemain, ada bonus sosial. ${prefix}owodivorce kalau ingin cerai.\n\n` +
            `${prefix}owogem — pasang gem permanen hasil lootbox untuk bonus stat tetap (ATK, DEF, EXP, catch, atau earn).\n\n` +
            `Aksi seru: hug, kiss, pat, punch, slap, poke @orang — untuk interaksi sosial pakai GIF.\n\n` +
            `${prefix}owotop — lihat ranking pemain terkaya/terkuat.`
    }
}

const TOPIC_ALIASES = {
    mulai: 'mulai', awal: 'mulai', start: 'mulai',
    hewan: 'hewan', zoo: 'hewan', tangkap: 'hewan',
    tarung: 'tarung', bertarung: 'tarung', battle: 'tarung', combat: 'tarung',
    ekonomi: 'ekonomi', emas: 'ekonomi', judi: 'ekonomi', transfer: 'ekonomi',
    sosial: 'sosial', social: 'sosial', lain: 'sosial'
}

export default {
    cmd: ['owo', 'owotutorial', 'owoguide', 'owohelp'],
    category: 'owo',
    run: async (m, { text, prefix }) => {
        const owo = getOwo(m.sender)
        const query = text.trim().toLowerCase()
        const topicKey = TOPIC_ALIASES[query]

        if (topicKey) {
            const topic = TOPICS[topicKey]
            let out = `🦴 *PANDUAN OWO — ${topic.title}*\n\n`
            out += topic.body(prefix)
            out += `\n\nKetik ${prefix}owo untuk lihat daftar topik lain.`
            return m.reply(out)
        }

        let out = `🦴 *PANDUAN LENGKAP OWO*\n\n`
        out += `Saldo Anda sekarang: ${fmtCowoncy(owo.cowoncy)}\n\n`
        out += `Panduan ini dibagi per topik agar tidak kepanjangan. Ketik salah satu:\n\n`
        out += `${prefix}owo mulai — langkah awal untuk pemula\n`
        out += `${prefix}owo hewan — cara berburu, tangkap, dan berikan hewan\n`
        out += `${prefix}owo tarung — battle PvE dan PvP\n`
        out += `${prefix}owo ekonomi — bank, transfer, shop, lootbox, judi\n`
        out += `${prefix}owo sosial — nikah, gem, aksi sosial, dan leaderboard\n\n`
        out += `Ketik ${prefix}owoprofile kapan saja untuk lihat status lengkap Anda.`

        return m.reply(out)
    }
}
