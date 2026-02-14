/*
 * AIRBOT Configuration Blueprint
 * Fungsi: Manage settings, API keys, prefix, database, templates
 * Creator: WiznAlgo
 */

import fs from 'fs'
import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'

export default {
   // === API KEYS & PROVIDER MANAGEMENT ===
   APIs: {
      // [Blueprint] Provider barcode API (contoh: sickw)
      sickw: {
         baseURL: 'https://sickw.com/api.php',
         Key: "APIKEY_LU_DISINI" // [Blueprint] Isi API key saat production
      }
      // [Blueprint] Tambah provider lain sesuai kebutuhan
   },

   // === BOT CORE OPTIONS ===
   options: {
      public: true,              // [Blueprint] true = public, false = owner only
      antiCall: true,            // [Blueprint] Auto reject incoming calls
      database: "database.json", // [Blueprint] Type DB: JSON atau Mongo
      
      // [Blueprint] DAFTAR OWNER (User admin/VIP)
      // Format: String nomor WA atau LID
      owner: [
          "13340554342579",      // [Blueprint] Owner 1 (LID)
          "194128394625218"      // [Blueprint] Owner 2 (LID)
      ],
      
      sessionName: "session",    // [Blueprint] Folder session Baileys
      prefix: /^[./!#]/,         // [Blueprint] Regex untuk command prefix
      pairingNumber: ""          // [Blueprint] Nomor untuk pairing code (isi saat setup)
   },

   // === STICKER METADATA (EXIF CONFIGURATION) ===
   Exif: {
      packId: "https://airbot.id",
      packName: `AirBot Service`,
      packPublish: "Scan & Barcode Solution",
      packEmail: "admin@airbot.id",
      packWebsite: "https://airbot.id",
      androidApp: "https://play.google.com/store/apps/details?id=com.whatsapp",
      iOSApp: "https://apps.apple.com/app/whatsapp-messenger/id310633997",
      emojis: [],
      isAvatar: 0,
   },

   // === MESSAGE TEMPLATES (Default responses) ===
   msg: {
      owner: "⚠️ Maaf, fitur ini KHUSUS OWNER!",
      group: "⚠️ Fitur ini hanya bisa dipakai di Grup!",
      private: "⚠️ Fitur ini hanya bisa dipakai di Chat Pribadi!",
      botAdmin: "⚠️ Bot harus jadi Admin Grup dulu!",
      admin: "⚠️ Kamu harus jadi Admin Grup dulu!",
      wait: "⏳ Sedang memproses... Mohon tunggu sebentar.",
      done: "✅ Selesai!",
      error: "❌ Terjadi kesalahan sistem. Coba lagi nanti.",
   }
}

// === HOT RELOAD CONFIG ===
// [Blueprint] Jika file config diubah, auto-reload tanpa restart
const file = fileURLToPath(import.meta.url)
watchFile(file, () => {
   unwatchFile(file)
   console.log(`Update Config: '${file}'`)
   import(`${file}?update=${Date.now()}`)
})