# 🤖 AirBot Blueprint v2.0

> **WhatsApp Bot Rancangan Sistem: Scan & Generate Barcode IMEI**

---

## 📋 Tentang Project

AirBot adalah **blueprint/rancangan lengkap** untuk WhatsApp Bot yang memiliki fitur:

- ✅ **Scan Barcode OCR** - Ekstrak IMEI dari foto barcode
- ✅ **Generate Barcode iPhone** - UI Style dengan berbagai varian (Light/Dark/New/Old)
- ✅ **Generate Barcode Android** - HD Light + Dark Mode
- ✅ **Filter IMEI** - Grouping 8-digit awal otomatis
- ✅ **Manajemen Saldo** - Deposit, topup, potongan otomatis
- ✅ **Admin Panel** - Kontrol user, set VIP, monitor transaksi
- ✅ **History Logging** - Pencatatan semua transaksi

---

## 📁 Struktur Folder

```
airbot-blueprint/
├── index.js                     # Entry point & launcher
├── hisoka.js                    # Koneksi WhatsApp & event handler
├── config.js                    # Konfigurasi bot
├── package.json                 # Dependencies
├── database.json                # Data user & settings
├── history_saldo.json           # Log transaksi
├── README.md                    # Dokumentasi
│
├── event/
│   └── message.js               # Main message handler & command
│
└── lib/
    ├── serialize.js             # Message normalizer & client extension
    ├── function.js              # Utility functions
    ├── api.js                   # API wrapper dengan axios
    ├── database.js              # Database abstraction (Mongo/JSON)
    ├── sticker.js               # Sticker converter (WebP)
    └── loadDatabase.js          # Database loader helper
```

---

## 🎯 PENTING: INI ADALAH BLUEPRINT

**Blueprint ini BUKAN kode siap pakai!** Ini adalah:

- ✅ **Rancangan logika sistem** - Pseudocode & sketsa arsitektur
- ✅ **Struktur file & folder** - Organisasi project yang bersih
- ✅ **Interface & fungsi utama** - Kerangka kode
- ✅ **Dokumentasi inline** - Penjelasan di setiap blok

**Untuk implementasi production:**
1. Isi kode detail di setiap `[Blueprint]` section
2. Tambah library yang diperlukan
3. Setup config (API key, owner, prefix, dll)
4. Test & debug

---

## 📦 Dependencies

```json
{
  "@hapi/boom": "^10.0.1",
  "@whiskeysockets/baileys": "6.6.0",
  "archiver": "^5.3.0",
  "axios": "^1.4.0",
  "canvas": "^2.11.2",
  "chalk": "^5.3.0",
  "file-type": "^16.5.3",
  "fluent-ffmpeg": "^2.1.2",
  "moment-timezone": "^0.5.43",
  "pino": "^8.1.0",
  "tesseract.js": "^5.0.3"
}
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Config

Edit `config.js`:

```javascript
owner: [
    "13340554342579",      // Owner LID
    "194128394625218"      // Owner 2 LID
],
pairingNumber: "628xxx"    // Nomor untuk pairing code
```

### 3. Run Bot

```bash
npm start
```

---

## 💬 Command List

### User Commands

| Command | Fungsi |
|---------|--------|
| `.menu` | Tampilkan menu |
| `.saldo` | Check saldo |
| `.scan` | Scan barcode OCR |
| `.filter8` | Filter IMEI 8-digit |
| `.ipputih` | Generate barcode iPhone light |
| `.iphitam` | Generate barcode iPhone dark |
| `.ipputihnew` | Generate barcode iPhone NEW UI |
| `.ipputihold` | Generate barcode iPhone old (1 per 1) |
| `.android` | Generate barcode Android |
| `.deposit` | Deposit via QRIS |

### Admin Commands

| Command | Fungsi |
|---------|--------|
| `.addsaldo nomor\|jumlah` | Tambah saldo user |
| `.minsaldo nomor\|jumlah` | Kurangi saldo user |
| `.addvip nomor\|status` | Set VIP user (1=VIP, 0=Normal) |

---

## 🔧 Configuration

### Database Mode

**Mode JSON (Default):**
```javascript
database: "database.json"
```

**Mode MongoDB:**
```javascript
database: "mongodb://localhost:27017/airbot"
```

### Prefix

```javascript
prefix: /^[./!#]/    // Command: .menu, /menu, !menu, #menu
```

### Harga Layanan

Edit di `config.js` atau `database.json`:

```json
{
  "scan": 0,                    // Free
  "filter8": 2000,              // Rp 2000
  "barcode_acak": 1000,         // Rp 1000 (random)
  "barcode_custom": 10000,      // Rp 10000 (custom)
  "android_acak": 1200,         // Rp 1200
  "android_custom": 10000       // Rp 10000
}
```

---

## 📊 Database Schema

### Users

```json
{
  "userid@lid": {
    "saldo": 50000,
    "nama": "John Doe",
    "vip": false
  }
}
```

### Settings

```json
{
  "scan": 0,
  "filter8": 2000,
  "barcode_acak": 1000,
  "barcode_custom": 10000,
  "vip_barcode_acak": 1000,
  "vip_barcode_custom": 5000,
  "android_acak": 1200,
  "android_custom": 10000
}
```

### History

```json
[
  {
    "waktu": "14/02/2026, 10:30:45",
    "target_user": "userid",
    "tipe_transaksi": "DEPOSIT (+)",
    "nominal": 50000,
    "saldo_akhir": 50000,
    "eksekutor": "admin"
  }
]
```

---

## 🔐 Security Notes

- ✅ API keys di `config.js` - simpan di `.env` untuk production
- ✅ Owner list di `config.js` - validasi sebelum eksekusi command admin
- ✅ Database JSON - consider MongoDB untuk skala besar
- ✅ Session folder - jangan upload ke git (add ke `.gitignore`)

---

## 📝 File Size & Memory

- **Code**: ~200KB (blueprint saja, implementasi akan lebih besar)
- **Memory**: 3GB default (configurable di `index.js`)
- **Session**: ~1-2MB per bot

---

## 🤝 Contribution & Support

Project ini adalah **blueprint rancangan** oleh **WiznAlgo** untuk portofolio freelance.

---

## 📄 License

GPL-3.0-or-later

---

**Dibuat dengan ❤️ oleh WiznAlgo** | 2026
