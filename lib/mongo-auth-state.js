import { proto, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'
import { getDb } from './mongo.js'

const COLLECTION = 'auth_state'

/**
 * Sama seperti useMultiFileAuthState, tapi tiap "file" disimpan sebagai satu
 * dokumen Mongo ({_id: `${sessionId}:${key}`}) bukan file di disk.
 * sessionId: 'main' untuk bot utama, `jadibot:<nomor>` untuk tiap sesi jadibot.
 */
export async function useMongoAuthState(sessionId) {
    const db = await getDb()
    const col = db.collection(COLLECTION)

    async function readData(key) {
        const doc = await col.findOne({ _id: `${sessionId}:${key}` })
        if (!doc) return null
        try {
            return JSON.parse(doc.value, BufferJSON.reviver)
        } catch {
            return null
        }
    }

    async function writeData(key, data) {
        await col.updateOne(
            { _id: `${sessionId}:${key}` },
            { $set: { sessionId, key, value: JSON.stringify(data, BufferJSON.replacer) } },
            { upsert: true }
        )
    }

    async function removeData(key) {
        await col.deleteOne({ _id: `${sessionId}:${key}` })
    }

    const creds = (await readData('creds')) || initAuthCreds()

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {}
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}`)
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value)
                        }
                        data[id] = value
                    }))
                    return data
                },
                set: async (data) => {
                    const tasks = []
                    for (const type in data) {
                        for (const id in data[type]) {
                            const value = data[type][id]
                            const key = `${type}-${id}`
                            tasks.push(value ? writeData(key, value) : removeData(key))
                        }
                    }
                    await Promise.all(tasks)
                }
            }
        },
        saveCreds: () => writeData('creds', creds)
    }
}

/** Hapus semua dokumen auth (creds + signal keys) milik satu sessionId — dipanggil saat sesi logout/dihapus. */
export async function removeMongoAuthState(sessionId) {
    const db = await getDb()
    await db.collection(COLLECTION).deleteMany({ sessionId })
}
