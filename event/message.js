/*
 * AIRBOT - Main Message Handler Blueprint
 * Fungsi: Parse command, handle user request, manage saldo
 * Creator: WiznAlgo
 * 
 * FITUR BLUEPRINT:
 * - Menu & help display
 * - Scan barcode OCR
 * - Generate barcode iPhone (UI, NEW, OLD style)
 * - Generate barcode Android (Light/Dark mode)
 * - Filter IMEI 8-digit grouping
 * - Deposit & saldo management
 * - Admin panel (add/remove saldo, set VIP)
 */

import config from "../config.js"
import fs from "fs"
import chalk from "chalk"

// ============================================================
// DATABASE BLUEPRINT
// ============================================================

const dbPath = './database.json'

// [Blueprint] Inisialisasi database jika belum ada
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ 
        users: {}, 
        settings: {
            scan: 0,
            barcode_acak: 1000,
            filter8: 2000,
            barcode_custom: 10000,
            vip_barcode_acak: 1000, 
            vip_barcode_custom: 5000,
            android_acak: 1200,
            android_custom: 10000
        } 
    }, null, 2))
}

const historyPath = './history_saldo.json'

// [Blueprint] Inisialisasi history jika belum ada
if (!fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, JSON.stringify([], null, 2))
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// [Blueprint] getDb(): baca database JSON
const getDb = () => JSON.parse(fs.readFileSync(dbPath))

// [Blueprint] saveDb(data): simpan database JSON
const saveDb = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))

// [Blueprint] catatRiwayat(target, tipe, nominal, saldo, executor): log transaksi
const catatRiwayat = (target, tipe, nominal, saldoAkhir, pelakunya) => {
    try {
        let dataHistory = JSON.parse(fs.readFileSync(historyPath))
        
        let logBaru = {
            waktu: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
            target_user: target.split('@')[0],
            tipe_transaksi: tipe, 
            nominal: nominal,
            saldo_akhir: saldoAkhir,
            eksekutor: pelakunya.split('@')[0]
        }
        
        dataHistory.push(logBaru)
        fs.writeFileSync(historyPath, JSON.stringify(dataHistory, null, 2))
    } catch (e) {
        console.log("Gagal mencatat history:", e)
    }
}

// [Blueprint] sleep(ms): async delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// ============================================================
// MAIN MESSAGE HANDLER
// ============================================================

export default async function Message(hisoka, m, chatUpdate) {
    try {
        // === BLOK 1: VALIDASI PESAN ===
        // [Blueprint] Cek: message valid?, key ada?, sender ada?
        if (!m || !m.key || !m.sender) return 
        
        // [Blueprint] Jangan proses pesan dari bot sendiri (kecuali command dengan prefix)
        if (m.key.fromMe && !m.body.startsWith('.')) return

        // === BLOK 2: PARSING COMMAND ===
        // [Blueprint] Extract prefix dari regex config
        const prefix = config.options.prefix.test(m.body) ? m.body.match(config.options.prefix)[0] : '.'
        const isCmd = m.body.startsWith(prefix)
        
        // [Blueprint] Split command & arguments
        const command = isCmd ? m.body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase() : ""
        
        const text = m.text || ""
        const pushName = m.pushName || "User"
        
        // === BLOK 3: LOGIKA IDENTITAS ===
        // [Blueprint] Extract sender info & cek owner
        const sender = m.sender
        const senderNum = sender.split('@')[0]
        const isOwner = config.options.owner.some(own => senderNum.includes(own)) || m.key.fromMe

        // === BLOK 4: LOAD DATABASE ===
        // [Blueprint] Baca database, auto-register user
        const db = getDb()
        
        if (!db.users[sender]) {
            db.users[sender] = { saldo: 0, nama: pushName, vip: false }
            saveDb(db)
        }

        let HARGA = db.settings
        let userSaldo = db.users[sender].saldo

        // === BLOK 5: DEBUG LOG ===
        if (command) {
            console.log(chalk.cyan(`[CMD] ${command}`), chalk.yellow(`dari ${pushName} (${senderNum})`))
        }

        // === BLOK 6: COMMAND HANDLER ===
        switch (command) {

            // ========================================
            // COMMAND: menu, help
            // ========================================
            case 'menu':
            case 'help':
                // [Blueprint] Tampilkan menu lengkap
                {
                    let isVip = db.users[sender].vip || false
                    let statusUser = isVip ? "👑 VIP MEMBER" : "🆓 Free User"

                    let menu = `🤖 *AIRBOT SERVICE*
👤 User: ${pushName}
🏷️ Status: ${statusUser}
💰 Saldo: Rp ${userSaldo.toLocaleString()}

🤖 *Fitur non-create*
• ${prefix}scan (Reply Foto Barcode)
• ${prefix}filter8 (Memilah IMEI 8 digit awal)

🏷️ *CETAK BARCODE (UI Style)*
• ${prefix}ipputih imei1|imei2
• ${prefix}iphitam (Format sama dengan ipputih)
• ${prefix}ipputihnew (UI iPhone versi baru)
• ${prefix}ipputihold (Tanpa ZIP file - satu per satu)
• ${prefix}android (Generate Light & Dark mode)

💰 *HARGA LAYANAN*
- IPHONE: Acak Rp ${db.settings.barcode_acak} | Custom Rp ${db.settings.barcode_custom}
- ANDROID: Acak Rp ${db.settings.android_acak} | Custom Rp ${db.settings.android_custom}
- FILTER8: Rp ${db.settings.filter8}

💰 *DEPOSIT / TOPUP*
• ${prefix}deposit

ℹ️ *INFO*
• ${prefix}saldo
• ${prefix}admin`

                    if (isOwner) {
                        menu += `\n\n👑 *PANEL ADMIN*
💰 *KEUANGAN*
• ${prefix}addsaldo nomor|jumlah
• ${prefix}minsaldo nomor|jumlah
• ${prefix}addvip nomor|1`
                    }
                    m.reply(menu)
                }
                break

            // ========================================
            // COMMAND: deposit, topup
            // ========================================
            case 'deposit':
            case 'topup':
            case 'isisaldo':
                // [Blueprint] Fitur deposit dengan QRIS:
                // 1. Cek file qris.jpg ada
                // 2. Kirim gambar QRIS
                // 3. Caption berisi instruksi transfer
                {
                    try {
                        if (!fs.existsSync('./qris.jpg')) return m.reply("⚠️ *MAAF!* Admin belum upload foto QRIS (qris.jpg).")
                        
                        let qrisBuffer = fs.readFileSync('./qris.jpg')
                        await hisoka.sendMessage(m.from, { 
                            image: qrisBuffer, 
                            caption: `🏧 *METODE PEMBAYARAN*\n\n[Blueprint] Silakan scan QRIS di atas.\n\nSetelah transfer, kirim bukti ke Admin.\n\n[Blueprint] Support: BCA, BRI, DANA, GOPAY, OVO, SHOPEEPAY`
                        }, { quoted: m })
                    } catch (e) {
                        console.log(e)
                        m.reply("⚠️ Gagal mengirim QRIS.")
                    }
                }
                break

            // ========================================
            // COMMAND: addsaldo (Admin only)
            // ========================================
            case 'addsaldo':
            case 'tambahsaldo':
                // [Blueprint] Tambah saldo user manual (owner only)
                {
                    if (!isOwner) return m.reply("❌ Maaf, perintah ini hanya untuk Admin.")
                    
                    let targetUser = ""
                    let nominal = 0

                    // [Blueprint] Parse input: nomor|jumlah
                    if (text.includes("|")) {
                        let [nomor, jumlah] = text.split("|")
                        nomor = nomor.replace(/[^0-9]/g, '')
                        
                        // [Blueprint] Deteksi LID (>= 14 digit) vs nomor WA biasa
                        if (nomor.length >= 14) {
                            targetUser = nomor + '@lid'
                        } else {
                            if(nomor.startsWith('08')) nomor = '628' + nomor.slice(2)
                            targetUser = nomor + '@s.whatsapp.net'
                        }
                        
                        nominal = parseInt(jumlah)
                    } else {
                        return m.reply(`❌ *CARA PAKAI:*\n${prefix}addsaldo 628xxx|50000`)
                    }

                    if (!nominal) return m.reply("❌ Nominal salah/kosong.")

                    // [Blueprint] Update database
                    if (!db.users[targetUser]) db.users[targetUser] = { saldo: 0, nama: "User Topup" }
                    db.users[targetUser].saldo += nominal
                    saveDb(db)
                    
                    // [Blueprint] Catat history
                    catatRiwayat(targetUser, "DEPOSIT (+)", nominal, db.users[targetUser].saldo, sender)
                    
                    // [Blueprint] Laporan ke owner
                    let infoTarget = targetUser.split('@')[0]
                    m.reply(`✅ *SUKSES TAMBAH SALDO*\n\n👤 User: ${infoTarget}\n💵 Masuk: Rp ${nominal.toLocaleString()}\n💰 Total: Rp ${db.users[targetUser].saldo.toLocaleString()}`)

                    // [Blueprint] Notifikasi ke user
                    try {
                        await hisoka.sendMessage(targetUser, { 
                            text: `🎉 *DEPOSIT BERHASIL!*\n\nNominal: Rp ${nominal.toLocaleString()}\nTotal Saldo: Rp ${db.users[targetUser].saldo.toLocaleString()}`
                        })
                    } catch (e) {
                        m.reply("⚠️ Saldo masuk, tapi gagal kirim notif ke User.")
                    }
                }
                break

            // ========================================
            // COMMAND: minsaldo (Admin only)
            // ========================================
            case 'kurangsaldo':
            case 'removesaldo':
            case 'minsaldo':
                // [Blueprint] Kurangi saldo user (owner only)
                {
                    if (!isOwner) return m.reply("❌ Maaf, perintah ini hanya untuk Admin.")
                    
                    let targetMin = ""
                    let nominalMin = 0

                    if (text.includes("|")) {
                        let [nomor, jumlah] = text.split("|")
                        nomor = nomor.replace(/[^0-9]/g, '')
                        
                        if (nomor.length >= 14) {
                            targetMin = nomor + '@lid'
                        } else {
                            if(nomor.startsWith('08')) nomor = '628' + nomor.slice(2)
                            targetMin = nomor + '@s.whatsapp.net'
                        }
                        
                        nominalMin = parseInt(jumlah)
                    } else {
                        return m.reply(`❌ *CARA PAKAI:*\n${prefix}kurangsaldo 628xxx|50000`)
                    }

                    if (!nominalMin) return m.reply("❌ Nominal salah/kosong.")

                    if (!db.users[targetMin]) return m.reply("⚠️ User belum terdaftar di database.")
                    
                    // [Blueprint] Kurangi saldo
                    db.users[targetMin].saldo -= nominalMin
                    if (db.users[targetMin].saldo < 0) db.users[targetMin].saldo = 0
                    
                    saveDb(db)
                    catatRiwayat(targetMin, "POTONGAN (-)", nominalMin, db.users[targetMin].saldo, sender)
                    
                    let infoTargetMin = targetMin.split('@')[0]
                    m.reply(`✅ *SUKSES KURANGI SALDO*\n\n👤 User: ${infoTargetMin}\n📉 Dikurang: Rp ${nominalMin.toLocaleString()}\n💰 Sisa: Rp ${db.users[targetMin].saldo.toLocaleString()}`)

                    try {
                        await hisoka.sendMessage(targetMin, { 
                            text: `📉 *PENGURANGAN SALDO*\n\nNominal: Rp ${nominalMin.toLocaleString()}\nSisa Saldo: Rp ${db.users[targetMin].saldo.toLocaleString()}`
                        })
                    } catch (e) {
                        m.reply("⚠️ Saldo berkurang, tapi gagal kirim notif ke User.")
                    }
                }
                break

            // ========================================
            // COMMAND: addvip (Admin only)
            // ========================================
            case 'addvip':
                // [Blueprint] Set status VIP user
                {
                    if (!isOwner) return m.reply("❌ Khusus Admin.")
                    let tUser = ""
                    let statusVip = false
                    if (text.includes("|")) {
                        let [nomor, status] = text.split("|")
                        nomor = nomor.replace(/[^0-9]/g, '')
                        tUser = nomor.length >= 14 ? nomor + '@lid' : (nomor.startsWith('08') ? '628' + nomor.slice(2) : nomor) + '@s.whatsapp.net'
                        statusVip = (status.trim() == '1')
                    } else {
                       return m.reply(`❌ Contoh: ${prefix}addvip 628xxx|1`)
                    }
                   if (!db.users[tUser]) db.users[tUser] = { saldo: 0, nama: "User VIP", vip: false }
                   db.users[tUser].vip = statusVip
                   saveDb(db)
                   m.reply(`✅ VIP Update: ${tUser.split('@')[0]} status: ${statusVip}`)
                }
                break

            // ========================================
            // COMMAND: saldo
            // ========================================
            case 'saldo':
            case 'balance':
                // [Blueprint] Tampilkan saldo user
                m.reply(`💳 *INFO SALDO*\nUser: ${pushName}\nSisa: Rp ${userSaldo.toLocaleString()}\nID: ${senderNum}`)
                break

            // ========================================
            // COMMAND: scan
            // ========================================
            case 'scan':
                // [Blueprint] Scan barcode OCR dari gambar
                {
                    if (!isOwner && userSaldo < HARGA.scan) return m.reply(`⚠️ *SALDO KURANG!*`)
                    
                    const isImage = m.isMedia || (m.quoted && m.quoted.isMedia)
                    if (!isImage) return m.reply(`❌ Kirim foto dengan caption *${prefix}scan*`)
                    
                    m.reply("⏳ Sedang memproses gambar...")
                    
                    try {
                        // [Blueprint] Download media, extract IMEI dengan OCR
                        // [Blueprint] Hasil OCR -> regex extract 15-digit IMEI
                        // [Blueprint] Hapus duplikat
                        // [Blueprint] Potong saldo
                        // [Blueprint] Kirim hasil
                        
                        m.reply(`🔍 *HASIL SCAN*\n\n[Blueprint] IMEI hasil scan di sini\n\n💸 Terpotong: Rp ${HARGA.scan}\n💳 Sisa Saldo: Rp ${userSaldo.toLocaleString()}`)
                    } catch (e) {
                        m.reply("❌ Gagal membaca gambar.")
                    }
                }
                break

            // ========================================
            // COMMAND: ipputih, iphitam
            // ========================================
            case 'ipputih':
            case 'iphitam':
                // [Blueprint] Generate barcode iPhone UI style
                {
                    let isDark = (command === 'iphitam')
                    
                    m.reply(`⏳ Memproses barcode iPhone (${isDark ? 'Dark' : 'Light'}) mode...`)

                    // [Blueprint] LOGIKA BLUEPRINT:
                    // 1. Parse input multi-data (IMEI1\nIMEI2\nEID\nMEID)
                    // 2. Validasi kelengkapan data
                    // 3. Deteksi duplikat (cross-check antar data)
                    // 4. Loop generate:
                    //    - Generate EID & MEID (custom atau random)
                    //    - Load template image (template.png atau template_dark.png)
                    //    - Fetch barcode dari API bwipjs
                    //    - Buat canvas dengan Node Canvas
                    //    - Draw background, text, barcode
                    //    - Simpan ke folder temp/
                    // 5. Zip semua gambar (gunakan archiver)
                    // 6. Potong saldo user (per item atau total)
                    // 7. Kirim ZIP + caption dengan info duplikat
                    // 8. Hapus temp files

                    m.reply(`✅ *PROSES BLUEPRINT*\n\n[Blueprint] Generate ${0} data\n[Blueprint] Biaya: Rp ${0}\n[Blueprint] Sisa Saldo: Rp ${userSaldo.toLocaleString()}`)
                }
                break

            // ========================================
            // COMMAND: ipputihnew, iphitamnew (NEW UI)
            // ========================================
            case 'ipputihnew':
            case 'iphitamnew':
                // [Blueprint] Generate barcode iPhone NEW UI (iOS 17 style)
                {
                    let isDarkNew = (command === 'iphitamnew')
                    
                    m.reply(`⏳ Memproses barcode iPhone NEW UI (${isDarkNew ? 'Dark' : 'Light'})...`)

                    // [Blueprint] LOGIKA BLUEPRINT (mirip ipputih tapi):
                    // - Template berbeda: template_new_light.png, template_new_dark.png
                    // - Spacing & layout lebih detail (iOS 17 aesthetic)
                    // - EID bisa split jadi 2 baris
                    // - Spasinya lebih lega & realistic
                    // - Font size beda
                    // - Koordinat barcode berbeda

                    m.reply(`✅ *PROSES BLUEPRINT (NEW UI)*\n\n[Blueprint] Generate data\n[Blueprint] Format: iOS 17 Style`)
                }
                break

            // ========================================
            // COMMAND: ipputihold, iphitamold (Kirim 1 per 1)
            // ========================================
            case 'ipputihold':
            case 'iphitamold':
                // [Blueprint] Generate barcode iPhone OLD UI (kirim satu-per-satu, tidak ZIP)
                {
                    let isDarkOld = (command === 'iphitamold')
                    
                    m.reply(`⏳ Memproses barcode iPhone OLD UI (${isDarkOld ? 'Dark' : 'Light'})...`)

                    // [Blueprint] LOGIKA BLUEPRINT:
                    // - Parse input multi-data
                    // - Validasi & deteksi duplikat
                    // - LOOP per data:
                    //   * Generate barcode
                    //   * Draw canvas
                    //   * Potong saldo per item (langsung, bukan nunggu selesai semua)
                    //   * Kirim gambar langsung ke user
                    //   * Sleep 1.5s (anti-spam)
                    //   * Caption: data ke-x/total, info duplikat
                    // - Tidak ada ZIP, langsung kirim per gambar

                    m.reply(`✅ *PROSES BLUEPRINT (OLD UI - 1 per 1)*\n\n[Blueprint] Mengirim gambar satu-per-satu...`)
                }
                break

            // ========================================
            // COMMAND: android
            // ========================================
            case 'android':
                // [Blueprint] Generate barcode Android HD (Light + Dark mode)
                {
                    m.reply(`⏳ Memproses barcode Android (Light + Dark mode)...`)

                    // [Blueprint] LOGIKA BLUEPRINT:
                    // 1. Parse input: IMEI1\nIMEI2\nEID\nSN
                    // 2. Deteksi duplikat IMEI
                    // 3. Register font Roboto (light & medium variant)
                    // 4. LOOP per data:
                    //    - Generate 4 barcode: IM1, IM2, EID, SN
                    //    - LIGHT MODE:
                    //      * Load template_light.png
                    //      * Buat canvas
                    //      * Draw text + barcode dengan font Roboto Medium
                    //      * Warna text: abu-abu (#b0b3bb)
                    //      * Simpan ke temp/Light_1_imei.jpg
                    //    - DARK MODE:
                    //      * Load template_dark.png
                    //      * Buat canvas
                    //      * Draw text + barcode dengan font Roboto Light (lebih tipis)
                    //      * Warna text: putih (#FFFFFF)
                    //      * Simpan ke temp/Dark_1_imei.jpg
                    //    - Total 2 file per data
                    // 5. Zip semua file + INFO_DUPLIKAT_ANDROID.txt
                    // 6. Potong saldo
                    // 7. Kirim ZIP

                    m.reply(`✅ *PROSES BLUEPRINT (ANDROID HD)*\n\n[Blueprint] Generate Light + Dark mode`)
                }
                break

            // ========================================
            // COMMAND: filter8
            // ========================================
            case 'filter8':
                // [Blueprint] Filter IMEI 8 digit awal (grouping)
                {
                    const HARGA_FILTER = 2000

                    if (!isOwner && db.users[sender].saldo < HARGA_FILTER) {
                        return m.reply(`⚠️ *SALDO TIDAK CUKUP!*\n❌ Butuh: Rp ${HARGA_FILTER.toLocaleString()}\n💰 Saldo Kamu: Rp ${db.users[sender].saldo.toLocaleString()}`)
                    }

                    m.reply("⏳ Sedang menyortir...")

                    // [Blueprint] LOGIKA BLUEPRINT:
                    // 1. Parse list IMEI dari text
                    // 2. Bersihkan & validasi (min 8 digit, numeric)
                    // 3. Group by 8 digit pertama (prefix)
                    // 4. Pisahkan:
                    //    - twins: grup yang punya > 1 anggota (IMEI kembar)
                    //    - singles: grup yang cuma 1 anggota (IMEI jomblo)
                    // 5. Sort twins by urutan
                    // 6. Potong saldo user
                    // 7. Kirim 2 chat:
                    //    - Chat 1: IMEI yang kembar (grouped by prefix)
                    //    - Chat 2: IMEI yang jomblo
                    
                    if (!isOwner) {
                        db.users[sender].saldo -= HARGA_FILTER
                        saveDb(db)
                    }

                    m.reply(`✅ *FILTER 8 DIGIT SELESAI*\n\n[Blueprint] Hasil grouping...\n\n💸 Terpotong: Rp ${HARGA_FILTER.toLocaleString()}\n💰 Sisa: Rp ${db.users[sender].saldo.toLocaleString()}`)
                }
                break

            // ========================================
            // COMMAND: admin
            // ========================================
            case 'admin':
                m.reply(`📞 Hubungi Admin: wa.me/6289523261157`)
                break

            default:
                // [Blueprint] Tidak ada command cocok = diam
        }

    } catch (e) {
        console.error("Error Message.js:", e)
    }
}