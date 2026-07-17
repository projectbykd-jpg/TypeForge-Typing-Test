# 🚀 Setup Vercel untuk Day-Group Panel

## Langkah 1: Configure Environment Variables di Vercel

1. **Pergi ke Vercel Dashboard**
   - https://vercel.com/projectbykd-jpg/day-group-panel

2. **Settings → Environment Variables**

3. **Tambahkan variables berikut:**

```
GITHUB_TOKEN = [PAT kamu]
GITHUB_OWNER = projectbykd-jpg
GITHUB_REPO = Day-Group-Panel
JWT_SECRET = [random string min 32 karakter]
BCRYPT_ROUNDS = 10
ALLOWED_ORIGINS = https://day-group-panel.vercel.app,https://yourdomain.com
```

### Cara generate JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Atau pakai: https://randomkeygen.com/ (pilih "SHA1 string")

---

## Langkah 2: Create GitHub Database File

**Buat file baru di repository:**

**Path:** `database/users.json`

**Content:**
```json
{
  "users": []
}
```

Commit & push ke GitHub.

---

## Langkah 3: Update index.html Login Script

Edit `public/index.html`, tambahkan di bagian login handler:

```javascript
// Tambahkan di file index.html sebelum handleLogin function

const API_URL = 'https://day-group-panel.vercel.app/api';

async function handleLogin() {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    const btn = document.getElementById('btnLogin');
    const err = document.getElementById('login-err');
    
    if(!u || !p) { err.innerText = "Lengkapi data!"; return; }
    btn.innerText = "AUTHENTICATING...";
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        
        const data = await response.json();
        
        if(data.success) {
            localStorage.setItem('auth_token', data.token);
            currentUser = u;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-panel').style.display = 'flex';
            document.body.classList.remove('justify-center');
            toast("Selamat Datang, " + data.user.username);
        } else {
            err.innerText = data.error || "Login gagal";
            btn.innerText = "AUTHORIZE ACCESS";
            btn.disabled = false;
        }
    } catch(error) {
        err.innerText = "Error: " + error.message;
        btn.innerText = "AUTHORIZE ACCESS";
        btn.disabled = false;
    }
}
```

---

## Langkah 4: Add Register Button di index.html

Tambahkan link ke register page di login form:

```html
<div class="text-center text-sm mt-2">
    <span class="text-slate-400">Belum punya akun? </span>
    <a href="register.html" class="neon-cyan hover:underline">Daftar di sini</a>
</div>
```

---

## Langkah 5: Deploy & Test

**Auto Deploy:**
Vercel akan auto-deploy setiap kali ada push ke repo.

**Manual Deploy:**
```bash
vercel deploy --prod
```

**Test Register:**
1. Buka https://day-group-panel.vercel.app/register.html
2. Isi form:
   - Username: `testuser123`
   - Email: `test@gmail.com`
   - Password: `Test@123456`
3. Click "CREATE ACCOUNT"
4. Check GitHub - file `database/users.json` seharusnya ter-update

**Test Login:**
1. Pergi ke https://day-group-panel.vercel.app/index.html
2. Masukkan username & password yang tadi di-register
3. Seharusnya berhasil login

---

## 🔐 Security Checklist

✅ **DO:**
- Gunakan HTTPS saja
- Keep JWT_SECRET & GitHub PAT rahasia
- Enable branch protection di GitHub
- Monitor Vercel logs untuk suspicious activity
- Regularly rotate GitHub PAT setiap 3 bulan
- Use strong passwords (min 12 chars)

❌ **DON'T:**
- Share environment variables
- Commit secrets ke GitHub
- Use weak passwords
- Expose API tokens
- Use `localhost` di production

---

## 📊 Monitoring

**Vercel Dashboard:**
- https://vercel.com/projectbykd-jpg/day-group-panel
- Lihat logs, errors, dan performance metrics

**GitHub Repository:**
- Monitor `database/users.json` untuk verify data tersimpan
- Check commit history untuk track registration activity

---

## ⚠️ Troubleshooting

### Error: "GitHub API error"
```
Masalah: GitHub token tidak valid atau repository tidak ditemukan
Solusi:
1. Check GitHub PAT masih valid (Settings → Developer Settings)
2. Verify GITHUB_OWNER dan GITHUB_REPO di env variables
3. Check rate limiting: https://api.github.com/rate_limit
```

### Error: "CORS error"
```
Masalah: Frontend URL tidak diizinkan oleh backend
Solusi:
1. Update ALLOWED_ORIGINS env variable
2. Pastikan format: https://yourdomain.com (tanpa trailing slash)
3. Redeploy di Vercel
```

### Password tidak ter-hash
```
Masalah: Bcrypt library tidak ter-load
Solusi:
1. Check package.json ada 'bcryptjs'
2. Rebuild: vercel deploy --prod
3. Check Vercel build logs
```

### File users.json tidak ter-update
```
Masalah: GitHub PAT tidak punya write permission
Solusi:
1. Generate PAT baru dengan scope: repo (full)
2. Update GITHUB_TOKEN di env variables
3. Test dengan request baru
```

---

## 📝 API Endpoints

### POST /api/register
```javascript
Request:
{
  "username": "testuser",
  "email": "test@gmail.com",
  "password": "securepass123"
}

Response (Success):
{
  "success": true,
  "message": "Akun berhasil dibuat",
  "user": {
    "username": "testuser",
    "email": "test@gmail.com",
    "createdAt": "2026-07-17T10:30:00.000Z"
  }
}
```

### POST /api/login
```javascript
Request:
{
  "username": "testuser",
  "password": "securepass123"
}

Response (Success):
{
  "success": true,
  "message": "Login berhasil",
  "token": "eyJhbGc...",
  "user": {
    "username": "testuser",
    "email": "test@gmail.com"
  }
}
```

---

## 🎯 Next Steps

1. ✅ Setup environment variables
2. ✅ Create database/users.json
3. ✅ Update index.html login script
4. ✅ Add register button
5. ✅ Test register & login
6. 📋 Add 2FA (optional)
7. 📋 Add email verification (optional)
8. 📋 Add password reset (optional)

---

**Questions?** Check Vercel docs: https://vercel.com/docs
