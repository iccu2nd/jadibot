import axios from 'axios'
import * as cheerio from 'cheerio'
import { PDFDocument } from 'pdf-lib'
import https from 'https'

const BASE='https://3hentai.net'
const HEADERS={
    'User-Agent':'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language':'en-US,en;q=0.5',
    Referer:BASE
}

const agent=new https.Agent({
    keepAlive:true,
    maxSockets:50
})

const client=axios.create({
    headers:HEADERS,
    timeout:20000,
    httpsAgent:agent
})

class ThreeHentai{
    async search(query,page=1){
        const {data}=await client.get(
            `${BASE}/search?q=${encodeURIComponent(query)}&page=${page}`
        )

        const $=cheerio.load(data)
        const results=[]

        $('.doujin').each((_,el)=>{
            const link=$(el).find('a.cover').attr('href')
            const title=$(el).find('.title').text().trim()

            if(link){
                results.push({
                    title:title||'-',
                    url:link.startsWith('http')?link:BASE+link
                })
            }
        })

        return results
    }

    async getDetail(url){
        const id=url.match(/\/d\/(\d+)/)?.[1]
        if(!id) throw new Error('ID tidak valid')

        const {data}=await client.get(`${BASE}/d/${id}`)
        const $=cheerio.load(data)

        const title=$('h1').text().trim()
        const cover=
            $('noscript img').first().attr('src')||
            $('img.lazy').first().attr('data-src')

        if(!$('#thumbnail-gallery').length){
            throw new Error('Gallery tidak ditemukan')
        }

        const info={}

        $('.tag-container').each((_,el)=>{
            const text=$(el).text().trim()
            const sep=text.indexOf(':')

            if(sep>-1){
                const key=text.substring(0,sep).trim().toLowerCase()
                info[key]=[]

                $(el).find('a').each((_,a)=>{
                    info[key].push($(a).text().trim())
                })
            }
        })

        const pages=[]

        $('#thumbnail-gallery .single-thumb').each((_,el)=>{
            const href=$(el).find('a').attr('href')
            const img=
                $(el).find('noscript img').attr('src')||
                $(el).find('img').attr('src')

            if(href&&img){
                const page=
                    parseInt(href.match(/\/(\d+)$/)?.[1])||
                    pages.length+1

                pages.push({
                    page,
                    thumbnail:img,
                    fullImage:img.replace(
                        /t\.(jpg|jpeg|png|webp)$/i,
                        '.$1'
                    )
                })
            }
        })

        if(!pages.length){
            const text=$('.tag-container')
                .filter((_,el)=>$(el).text().includes('Pages:'))
                .text()

            const total=parseInt(
                text.match(/(\d+)/)?.[1]||0
            )

            const match=cover?.match(
                /https?:\/\/s\d+\.3hentai\.net\/d\d+\//
            )

            if(match&&total){
                for(let i=1;i<=total;i++){
                    pages.push({
                        page:i,
                        thumbnail:`${match[0]}${i}t.jpg`,
                        fullImage:`${match[0]}${i}.jpg`
                    })
                }
            }
        }

        if(!pages.length){
            throw new Error('Halaman gallery tidak ditemukan')
        }

        return {
            id,
            title,
            cover,
            tags:info.tags||[],
            totalPages:pages.length,
            pages
        }
    }
}

const states=new Map()

async function downloadAll(pages){
    const results=new Array(pages.length)

    await Promise.all(
        pages.map(async(p,i)=>{
            try{
                const {data}=await client.get(p.fullImage,{
                    responseType:'arraybuffer',
                    timeout:30000
                })

                results[i]=Buffer.from(data)
            }catch{
                results[i]=null
            }
        })
    )

    return results.filter(Boolean)
}

async function createPDF(images){
    const pdf=await PDFDocument.create()

    for(const buffer of images){
        const image=
            buffer[0]===0x89
                ?await pdf.embedPng(buffer)
                :await pdf.embedJpg(buffer)

        const page=pdf.addPage([
            image.width,
            image.height
        ])

        page.drawImage(image,{
            x:0,
            y:0,
            width:image.width,
            height:image.height
        })
    }

    return pdf.save()
}

async function sendResult(m,sock,detail,state,prefix){
    let body=`*${detail.title}*\n\n`
    body+=`ID: ${detail.id}\n`
    body+=`Pages: ${detail.totalPages}\n`

    if(detail.tags.length){
        body+=`Tags: ${detail.tags.slice(0,5).join(', ')}\n`
    }

    let image=null

    try{
        const {data}=await client.get(detail.cover,{
            responseType:'arraybuffer',
            timeout:15000
        })

        image=Buffer.from(data)
    }catch{}

    const buttons=[
        {
            type:'reply',
            label:'Baca PDF',
            id:`${prefix}h3 baca ${detail.id}`
        },
        {
            type:'reply',
            label:'Next',
            id:`${prefix}h3 next`
        }
    ]

    return sock.sendInteractiveButton(
        m.from,
        {
            body,
            footer:`${state.index+1}/${state.results.length}`,
            ...(image?{image}:{}),
            buttons
        },
        { quoted:m }
    )
}

export default{
    cmd:['3hentai','h3','hentai3'],
    category:'downloader',

    run:async(m,{sock,text,prefix})=>{
        const userId=m.sender

        const state=states.get(userId)||{
            step:'idle',
            query:'',
            results:[],
            index:0
        }

        const args=text?.trim()
            ?text.trim().split(/\s+/)
            :[]

        const sub=args[0]?.toLowerCase()

        try{
            if(!text?.trim()){
                return m.reply(
                    `Masukkan query!\n\nContoh: ${prefix}h3 arknights`
                )
            }

            if(sub==='next'){
                if(
                    state.step!=='results'||
                    !state.results.length
                ){
                    return m.reply(
                        `Tidak ada sesi pencarian.\nGunakan ${prefix}h3 <query>`
                    )
                }

                state.index=
                    (state.index+1)%state.results.length

                states.set(userId,state)

                await m.react('⏳')

                const detail=
                    await new ThreeHentai().getDetail(
                        state.results[state.index].url
                    )

                await m.react('✅')

                return sendResult(
                    m,
                    sock,
                    detail,
                    state,
                    prefix
                )
            }

            if(['baca','read','pdf'].includes(sub)){
                const id=args[1]

                if(!id){
                    return m.reply('ID tidak valid.')
                }

                await m.react('⏳')

                const detail=
                    await new ThreeHentai().getDetail(
                        `${BASE}/d/${id}`
                    )

                await m.reply(
                    `Mengunduh ${detail.pages.length} halaman...`
                )

                const start=Date.now()

                const images=
                    await downloadAll(detail.pages)

                if(!images.length){
                    await m.react('❌')
                    return m.reply(
                        'Semua gambar gagal diunduh.'
                    )
                }

                const time=
                    ((Date.now()-start)/1000).toFixed(1)

                await m.reply(
                    `${images.length}/${detail.pages.length} halaman selesai dalam ${time} detik.\nMembuat PDF...`
                )

                const pdf=
                    await createPDF(images)

                await sock.sendMessage(
                    m.chat,
                    {
                        document:Buffer.from(pdf),
                        fileName:`${detail.id}.pdf`,
                        mimetype:'application/pdf',
                        caption:
                            `${detail.title}\n`+
                            `${images.length} halaman`
                    },
                    { quoted:m }
                )

                await m.react('✅')
                return
            }

            await m.react('⏳')

            const query=text.trim()

            const h3=new ThreeHentai()
            const results=await h3.search(query)

            if(!results.length){
                await m.react('❌')
                return m.reply('Tidak ada hasil ditemukan.')
            }

            const newState={
                step:'results',
                query,
                results,
                index:0
            }

            states.set(userId,newState)

            const detail=
                await h3.getDetail(results[0].url)

            await m.react('✅')

            return sendResult(
                m,
                sock,
                detail,
                newState,
                prefix
            )

        }catch(e){
            console.error('[3HENTAI]',e)
            await m.react('❌')
            return m.reply(`Error: ${e.message}`)
        }
    }
}