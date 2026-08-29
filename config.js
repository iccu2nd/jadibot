export default {
    botName: 'rezora bot',
    author: 'WhatsApp Bot Assistant',
    title: '© rejora md',
    body: 'powered by rezora ツ',
    packname: 'Rezora Bot  •  linktr.ee/rezora',
    thumbnail: 'https://u.pone.rs/krevxvcd.jpeg',

    readMore: String.fromCharCode(8206).repeat(4001),

    ownerNumber: ['6282322962313'],

    sourceUrl: 'https://codery.my.id',
    idch: '120363424427516649@newsletter',
    groupId: '120363424104004132@g.us',
    groupUrl: 'https://chat.whatsapp.com/JqClorftqjTDnovWSGdpab',
    channelUrl: 'https://whatsapp.com/channel/0029VbC7SGt65yDCUxYwUS3U/949',

    usePairingCode: true,

    // MongoDB: satu-satunya tempat penyimpanan sekarang — auth session (bot utama
    // maupun tiap sesi jadibot), db users/chats/dll, dan data sesi jadibot.
    // Isi lewat env var MONGODB_URI (disarankan, jangan hardcode password di sini),
    // atau isi langsung ke mongoUri di bawah kalau cuma buat testing lokal.
    // mongoDbName sengaja dipisah dari project lain (mis. iccuapis) walau cluster sama,
    // biar nama collection nggak numbuk.
    mongoUri: process.env.MONGODB_URI || '',
    mongoDbName: 'jdbt-rezora',

    // Dashboard web jadibot (server.js)
    dashboardPort: 3000,
    dashboardAdminKey: 'ganti-key-admin-ini', // dipakai buat endpoint /api/admin/*, GANTI sebelum publish

    generateHighQualityLinkPreview: false,
    consoleLog: true,

    text: {
        didyoumean: (prefix, cmd, suggestions) => `Perintah *${prefix}${cmd}* tidak ditemukan.\n\nMungkin maksud kamu:\n${suggestions.map(s => `- ${prefix}${s}`).join('\n')}`,
        blockedCmd: cmd => `Fitur *${cmd}* sedang dinonaktifkan sementara oleh owner.`,
        notRegistered: '*Kamu belum terverifikasi di database!*\n\nPencet tombol di bawah buat verifikasi nama WhatsApp kamu.',
        connected: botName => `${botName} Terhubung`
    }
}
