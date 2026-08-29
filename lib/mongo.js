import { MongoClient } from 'mongodb'
import config from '../config.js'

let client = null
let dbPromise = null

/**
 * Ambil koneksi database Mongo (singleton, connect sekali dipakai berkali-kali).
 * Nama database sengaja dipisah dari project lain (mis. iccuapis) walau cluster-nya sama,
 * biar nama collection nggak numbuk. Diatur lewat config.mongoDbName.
 */
export function getDb() {
    if (!dbPromise) {
        const uri = process.env.MONGODB_URI || config.mongoUri
        if (!uri) {
            throw new Error('MONGODB_URI belum diset. Isi env var MONGODB_URI atau config.mongoUri dengan connection string MongoDB Atlas kamu.')
        }
        client = new MongoClient(uri)
        dbPromise = client.connect().then(() => client.db(config.mongoDbName || 'rezora'))
    }
    return dbPromise
}

export async function closeMongo() {
    if (client) await client.close()
    client = null
    dbPromise = null
}
