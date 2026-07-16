# 👑 Day-Group Panel System

**Google Apps Script Web Application untuk manajemen hasil lottery dan pengiriman ke multiple platform**

---

## 📋 Daftar Isi
1. [Fitur Utama](#fitur-utama)
2. [Instalasi](#instalasi)
3. [Konfigurasi](#konfigurasi)
4. [Penggunaan](#penggunaan)
5. [Struktur File](#struktur-file)
6. [API Functions](#api-functions)
7. [Troubleshooting](#troubleshooting)

---

## ✨ Fitur Utama

### 🔐 Authentication
- Login user dengan credentials validation
- Activity logging otomatis per user
- Secure session management

### 📊 Result Processing
- Parse raw text result lottery secara otomatis
- Extract Pasaran, Prize 1-3, dan Shio
- Real-time preview hasil parsing
- Status validation (BENAR/SALAH)

### 📤 Multi-Platform Delivery
- **Telegram** - Format pesan dengan date/time
- **LinkTree** - Post dengan title dan body
- **Panel-Z** - Direct database update

### 📝 Activity Logging
- Log semua aksi user ke Google Sheets
- Timestamp otomatis (GMT+7)
- Tracking copy action dan send action

### 🎨 UI/UX
- Glass-morphism design dengan Tailwind CSS
- Real-time clock & date display
- Toast notifications
- Responsive mobile-friendly layout
- Dark theme dengan neon accent

---

## 🚀 Instalasi

### Prerequisites
- Google Account
- Google Sheets dengan struktur:
  - **Sheet "Users"**: Username | Password | Websites | Telegram | Linktree | PanelZ
  - **Sheet "Akun Sosmed"**: Website | Telegram Token | Chat ID | Email | Password | Panel Username | Panel Password | Panel Username2 | Panel Password2 | Panel URL
  - **History Sheets**: Otomatis dibuat per user

### Setup Steps

1. **Buka Google Apps Script**
   - Pergi ke https://script.google.com
   - Buat project baru

2. **Copy Files**
   - Copy `index.html` → File baru dengan nama "index"
   - Copy `Code.gs` → File "Code.gs" yang sudah ada

3. **Create HTML File**
   ```
   - Klik (+) New file → HTML
   - Nama: "index"
   - Paste isi index.html
   ```

4. **Deploy Web App**
   ```
   - Deploy → New deployment
   - Type: Web app
   - Execute as: Your account
   - Who has access: Anyone
   - Copy deployment URL
   ```

---

## ⚙️ Konfigurasi

### Google Sheets Structure

**Sheet: Users**
```
A: Username
B: Password
C: Websites (comma-separated)
D: Enable Telegram (TRUE/FALSE)
E: Enable Linktree (TRUE/FALSE)
F: Enable Panel-Z (TRUE/FALSE)
```

**Sheet: Akun Sosmed**
```
A: Website Name
B: Telegram Token
C: Telegram Chat ID
D: Linktree Email
E: Linktree Password
F: Panel Username
G: Panel Password
H: Panel Username2
I: Panel Password2
J: Panel URL
```

### Market Mapping
Daftar pasaran yang didukung:
- TOTOMACAU-13, TOTOMACAU-16, TOTOMACAU-19, TOTOMACAU-22, TOTOMACAU-23, TOTOMACAU-00
- HONGKONG, SINGAPORE, SYDNEY, THAILAND, MALAYSIA
- Dan 50+ pasaran lainnya

---

## 📖 Penggunaan

### Login
1. Buka deployed web app URL
2. Masukkan username & password
3. Click "AUTHORIZE ACCESS"

### Kirim Result via Raw Text
1. Paste raw result text di "AUTO-SEND RAW DATA" textarea
2. System otomatis parse: Pasaran, Prize 1-3, Shio
3. Preview hasil di "STATUS REAL-TIME MONITOR"
4. Click button untuk copy/send ke platform tertentu

### Direct Send ke Panel-Z
1. Pilih Pasaran dari dropdown
2. Input Angka
3. Click "SEND TO PANEL-Z"

### Send Ke Semua Platform
1. Input raw result text
2. Click "SEND ALL SYSTEMS"
3. Hasil pengiriman akan ditampilkan di modal

---

## 📁 Struktur File

```
Day-Group-Panel/
├── index.html          # UI/Frontend
├── Code.gs            # Backend Logic
├── appsscript.json    # Project Config
└── README.md          # Dokumentasi
```

---

## 🔧 API Functions

### Authentication
```javascript
checkLogin(username, password)
// Returns: {success: boolean, user: string, message: string}
```

### Text Processing
```javascript
processText(text)
// Returns: {market, status, shio, twoDigit, output, prize1, prize2, prize3}
```

### Activity Logging
```javascript
logActivity(username, action, keterangan)
// Returns: boolean
```

### Multi-Platform Sending
```javascript
sendAllSystems(rawText, username)
// Returns: {telegram: string, linktree: string, panelz: string}

sendToTelegram(rawText, teleCfg)
sendToAWS(rawText, linktreeCfg)
sendToPanelZ(rawText, panelCfg)
```

---

## 🛠️ Troubleshooting

### Error: "Username atau Password Salah"
- Pastikan data di sheet "Users" sudah benar
- Check typo di username/password

### Telegram tidak terkirim
- Verify Telegram Token di sheet "Akun Sosmed"
- Check Chat ID format (harus angka, bukan username)
- Test token: https://api.telegram.org/bot[TOKEN]/getMe

### Panel-Z connection failed
- Verify Panel URL format (harus lengkap dengan http://)
- Check username, password, dan credentials panel
- Pastikan network connection stabil

### Prize tidak terparsing
- Ensure format raw text: "Prize 1 : 1234" (with space)
- Check pasaran ada di dalam text
- Verify format: "Pasaran [NAME]"

---

## 📝 Format Raw Text Example

```
Pasaran TOTOMACAU-13
Hasil Pengeluaran Hari ini:

Prize 1 : 1234
Prize 2 : 5678
Prize 3 : 9012
Shio : KUDA

Selamat kepada para pemenang jackpot
```

---

## 🎯 Development Notes

- **Framework**: Google Apps Script
- **Frontend**: HTML5 + Tailwind CSS + Font Awesome
- **Backend**: Google Apps Script (GAS)
- **Database**: Google Sheets
- **Integrations**: Telegram API, AWS/Linktree, Custom Panel-Z

---

## 📞 Support

Untuk pertanyaan atau issue, silakan buat GitHub Issue di repo ini.

---

**Made with ❤️ by ProjectByKD**

Version 1.0 | Last Updated: 2026
