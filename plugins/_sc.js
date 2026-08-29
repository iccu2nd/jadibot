import { plugins } from '../lib/plugins.js'

export default {
    cmd: ['script', 'sc', 'orderscript'],
    category: 'info',
    run: async (m, { sock, config }) => {
        const nomorOwner = '6282322962313'
        const pesan = (paket) => encodeURIComponent(`Halo, saya mau order script ${config.botName} paket ${paket}`)

        const body =
            `Source code WhatsApp Bot, ${plugins.size}+ fitur siap pakai.\n\n` +
            `- Reguler : Rp. 30.000 (no update)\n` +
            `- Update  : Rp. 40.000 (free update lifetime)`

        await sock.sendInteractiveButton(m.from, {
            body,
            footer: config.body,
            image: 'https://i.ibb.co/Q3X1wTM1/71115668f9a9.jpg',
            buttons: [
                { type: 'url', label: 'Order Reguler', url: `https://wa.me/${nomorOwner}?text=${pesan('Reguler')}` },
                { type: 'url', label: 'Order Free Update', url: `https://wa.me/${nomorOwner}?text=${pesan('Free Update')}` }
            ]
        }, { quoted: m })
    }
}
