import { proto, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'
import { getDb } from './mongo.js'

const COLLECTION = 'auth_state'

/**
 * Sama seperti useMultiFileAuthState, tapi tiap "file" disimpan sebagai satu
 * dokumen Mongo ({_id: `${sessionId}:${key}`}) bukan file di disk.
 * sessionId: 'main' untuk bot utama, `jadibot:<nomor>` untuk tiap sesi jadibot.
 *
 * PENTING soal performa: Baileys manggil keys.get()/keys.set() dengan BANYAK
 * id sekaligus di setiap pesan masuk/keluar (session key, sender-key-memory,
 * pre-key, dll). Kalau tiap id itu jadi 1 findOne/updateOne terpisah ke Mongo,
 * satu pesan bisa memicu belasan round-trip network satu-satu — ini yang bikin
 * bot kerasa lambat, apalagi kalau cluster Mongo-nya jauh (bukan di region yang
 * sama dengan server). Makanya di bawah ini get() pakai satu query $in, dan
 * set() pakai satu bulkWrite, jadi sebanyak apa pun id-nya cuma 1 round-trip.
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
                    if (!ids.length) return data

                    const docIds = ids.map((id) => `${sessionId}:${type}-${id}`)
                    const docs = await col.find({ _id: { $in: docIds } }).toArray()
                    const byId = new Map(docs.map((d) => [d._id, d]))

                    for (const id of ids) {
                        const doc = byId.get(`${sessionId}:${type}-${id}`)
                        let value = null
                        if (doc) {
                            try { value = JSON.parse(doc.value, BufferJSON.reviver) } catch { value = null }
                        }
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value)
                        }
                        data[id] = value
                    }
                    return data
                },
                set: async (data) => {
                    const ops = []
                    for (const type in data) {
                        for (const id in data[type]) {
                            const value = data[type][id]
                            const _id = `${sessionId}:${type}-${id}`
                            if (value) {
                                ops.push({
                                    updateOne: {
                                        filter: { _id },
                                        update: { $set: { sessionId, key: `${type}-${id}`, value: JSON.stringify(value, BufferJSON.replacer) } },
                                        upsert: true
                                    }
                                })
                            } else {
                                ops.push({ deleteOne: { filter: { _id } } })
                            }
                        }
                    }
                    if (ops.length) await col.bulkWrite(ops, { ordered: false })
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
