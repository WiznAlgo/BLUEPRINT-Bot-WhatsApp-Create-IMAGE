/*
 * AIRBOT SYSTEM - Main Connection & Event Handler
 * Fungsi: Baileys setup, connection handler, session management
 * Creator: WiznAlgo
 * 
 * FITUR BLUEPRINT:
 * - Koneksi WhatsApp via Baileys
 * - Pairing code support
 * - Auto-reconnect & session persistence
 * - Message filtering & serialization
 */

import config from "./config.js" 
import { Client, Serialize } from "./lib/serialize.js" 
import baileys from "@whiskeysockets/baileys"
const { useMultiFileAuthState, DisconnectReason, makeInMemoryStore, makeCacheableSignalKeyStore } = baileys
import { Boom } from "@hapi/boom"
import Pino from "pino"
import chalk from "chalk"
import fs from "fs"

// [Blueprint] Logger silent mode - biar console tidak penuh
const store = makeInMemoryStore({ logger: Pino({ level: "silent" }).child({ level: "silent" }) })

async function start() {
   // === BLOK 1: ERROR HANDLER ===
   // [Blueprint] Tangkap unhandledRejection agar tidak crash
   process.on("unhandledRejection", (err) => console.log('Silently handling error:', err.message))

   // === BLOK 2: AUTH STATE ===
   // [Blueprint] Load session credentials dari folder
   const { state, saveCreds } = await useMultiFileAuthState(`./${config.options.sessionName}`)

   // === BLOK 3: INITIALIZE BAILEYS CLIENT ===
   // [Blueprint] Setup Baileys dengan config:
   const hisoka = baileys.default({
      logger: Pino({ level: "silent" }),
      printQRInTerminal: !config.options.pairingNumber,
      auth: {
         creds: state.creds,
         keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "silent" })),
      },
      browser: ['AirBot', 'Chrome', '20.0.04'],
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      defaultQueryTimeoutMs: 0,
   })

   // [Blueprint] Bind store & extend client dengan custom methods
   store.bind(hisoka.ev)
   await Client({ hisoka, store })

   // === BLOK 4: PAIRING CODE ===
   // [Blueprint] Jika pairingNumber ada di config & belum registered:
   if (config.options.pairingNumber && !hisoka.authState.creds.registered) {
      console.log(chalk.yellow("⏳ Menunggu Pairing Code..."))
      setTimeout(async () => {
         let phoneNumber = config.options.pairingNumber.replace(/[^0-9]/g, '')
         try {
            // [Blueprint] Request pairing code dari nomor
            let code = await hisoka.requestPairingCode(phoneNumber)
            code = code?.match(/.{1,4}/g)?.join("-") || code
            console.log(chalk.black(chalk.bgGreen(` KODE PAIRING ANDA : `)), chalk.black(chalk.bgWhite(` ${code} `)))
         } catch (err) {
            console.log(chalk.bgRed(" ❌ Gagal minta Pairing Code. Cek nomor di config.js! "))
         }
      }, 3000)
   }

   // === BLOK 5: CONNECTION HANDLER ===
   // [Blueprint] Listen connection update events
   hisoka.ev.on("connection.update", async (update) => {
      const { lastDisconnect, connection } = update
      if (connection === "close") {
         let reason = new Boom(lastDisconnect?.error)?.output.statusCode
         
         // [Blueprint] Logika disconnect:
         if (reason === DisconnectReason.loggedOut) {
             // User logout dari HP -> hapus session
             console.log(chalk.red(`❌ PERANGKAT DI-LOGOUT. Menghapus sesi...`))
             try {
                 fs.rmSync(`./${config.options.sessionName}`, { recursive: true, force: true })
                 console.log(chalk.green(`✅ Sesi dihapus. Silakan scan ulang.`))
             } catch (err) { console.error("Gagal hapus session:", err) }
             process.exit()
         } 
         else if (reason === DisconnectReason.badSession) {
             // Bad MAC/session corrupted -> restart
             console.log(chalk.red(`⚠️ SESI BURUK (Bad MAC). Restarting...`))
             start() 
         } 
         else {
            // Connection lost/timeout/etc -> restart
            start()
         }

      } else if (connection === "open") {
         console.log(chalk.green("✅ AIRBOT BERHASIL TERHUBUNG! 🚀"))
         
         // [Blueprint] FITUR LAPOR OWNER (AUTO DETECT LID/WA)
         try {
             let rawOwner = config.options.owner[0].toString()
             let cleanNum = rawOwner.replace(/[^0-9]/g, '')
             
             let targetJid = ""
             // [Blueprint] Deteksi: jika >= 14 digit = LID, else = WA biasa
             if (cleanNum.length >= 14) {
                 targetJid = cleanNum + "@lid"
             } else {
                 targetJid = cleanNum + "@s.whatsapp.net"
             }

             // Kirim notif ke owner
             await hisoka.sendMessage(targetJid, { text: "✅ *AIRBOT ONLINE*\n\nSiap menerima perintah, Bos!" })
         } catch (e) {
             console.log("⚠️ Gagal lapor owner.")
         }
      }
   })

   // === BLOK 6: SAVE CREDENTIALS ===
   // [Blueprint] Simpan perubahan credentials
   hisoka.ev.on("creds.update", saveCreds)

   // === BLOK 7: MESSAGE HANDLER ===
   // [Blueprint] Listen incoming messages
   hisoka.ev.on("messages.upsert", async (message) => {
      if (!message.messages) return
      const msgRaw = message.messages[0]

      // [Blueprint] Filter: jangan baca status WA orang lain
      if (msgRaw.key.remoteJid === "status@broadcast") return
      
      try {
          // Serialize message
          const m = await Serialize(hisoka, msgRaw)
          if (!m) return 

          // [Blueprint] Dynamic import message handler
          const eventFile = await import(`./event/message.js?v=${Date.now()}`)
          await eventFile.default(hisoka, m, message)
          
      } catch (e) {
          // Silently handle error
      }
   })

   return hisoka
}

start()