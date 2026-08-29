import { getContact } from '../lib/database.js'

export default {
    cmd: ['owner', 'creator', 'admin'],
    category: 'main',
    run: async (m, { sock, config }) => {
        const allOwners = config.ownerNumber || []
        if (!allOwners.length) return m.reply('Owner belum diatur.')

        const contacts = await Promise.all(allOwners.map(async (num) => {
            const contact = getContact(num + '@s.whatsapp.net')
            const name = contact?.pushname && contact.pushname !== 'null' ? contact.pushname : num
            return { displayName: name, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD` }
        }))

        await sock.sendMessage(m.from, { contacts: { displayName: contacts.length > 1 ? 'Owner Bot' : contacts[0].displayName, contacts } }, { quoted: m })
    }
}
