# Registrasi Mandiri Usaha Digital — SE2026 Indragiri Hilir

Formulir registrasi mandiri berbasis web untuk pendataan awal pelaku usaha digital dalam rangka **Sensus Ekonomi 2026**, dikembangkan oleh BPS Kabupaten Indragiri Hilir.

---

## Struktur Proyek

```
se2026/
├── index.html       # Halaman utama & struktur form
├── style.css        # Seluruh gaya visual
├── script.js        # Logika form, dropdown, validasi, pengiriman
├── mastersls.csv    # Master data wilayah (kecamatan, desa, RT)
└── README.md        # Dokumentasi ini
```

---

## Cara Menjalankan

> ⚠️ **Penting:** File ini menggunakan `fetch()` untuk membaca `mastersls.csv`.
> Browser memblokir `fetch()` pada file lokal (`file://`).
> Gunakan salah satu cara berikut:

### Opsi 1 — VS Code Live Server (Rekomendasi)
1. Install ekstensi **Live Server** di VS Code
2. Klik kanan `index.html` → **Open with Live Server**

### Opsi 2 — Python (sudah terinstall di kebanyakan PC)
```bash
# Masuk ke folder proyek
cd se2026/

# Python 3
python -m http.server 8080

# Lalu buka browser: http://localhost:8080
```

### Opsi 3 — Upload ke Hosting / GitHub Pages
Upload seluruh isi folder `se2026/` ke server atau GitHub Pages, lalu akses URL-nya.

---

## Cara Mengisi Data Wilayah (`mastersls.csv`)

Format CSV: **satu baris per RT**, dengan tiga kolom:

```
kecamatan,desa,rt
Tembilahan,Kelurahan Tembilahan Kota,RT 001
Tembilahan,Kelurahan Tembilahan Kota,RT 002
Tembilahan,Kelurahan Tembilahan Hilir,RT 001
...
```

### Aturan pengisian:
| Kolom | Keterangan |
|---|---|
| `kecamatan` | Nama kecamatan persis seperti di data resmi |
| `desa` | Nama desa/kelurahan (sertakan "Desa" / "Kelurahan" di depan jika perlu) |
| `rt` | Nomor RT, contoh: `RT 001`, `RT 002` |

- Tidak perlu kolom RW — RW sudah tidak ditanyakan di form
- Jika satu desa punya 5 RT, buat 5 baris dengan kecamatan & desa yang sama
- Urutan baris tidak berpengaruh, tapi lebih rapi jika diurutkan per kecamatan

### Cara edit CSV:
- Buka dengan **Microsoft Excel** atau **Google Sheets**
- Simpan/ekspor kembali sebagai **CSV (Comma Separated Values)**
- Pastikan nama file tetap `mastersls.csv`

---

## Konfigurasi Google Apps Script

URL tujuan pengiriman data ada di baris pertama `script.js`:

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/...';
```

Ganti nilai tersebut jika URL Apps Script berubah.

### Header kolom yang diharapkan di Google Spreadsheet:
```
Timestamp | nama_pemilik | nama_usaha | jenis_usaha | jenis_usaha_lainnya |
platform | platform_lainnya | medsos | kontak | kecamatan | desa | rt |
alamat | koordinat
```

---

## Fitur Utama

- ✅ Dropdown Kecamatan → Desa → RT berbasis file CSV (dependency otomatis)
- ✅ Platform usaha multi-pilih (checkbox)
- ✅ Validasi form lengkap sebelum pengiriman
- ✅ Pratinjau data sebelum dikirim (modal konfirmasi)
- ✅ Geotagging koordinat GPS (opsional)
- ✅ Pengiriman via iframe (menghindari error CORS Google Apps Script)
- ✅ Pesan sukses setelah data terkirim

---

*© 2026 BPS Kabupaten Indragiri Hilir*