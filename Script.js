/* =============================================================
   SE2026 Indragiri Hilir — Script Utama
   File      : script.js
   Deskripsi : Logika form registrasi, dropdown dependency CSV,
               validasi, pratinjau, dan pengiriman data ke
               Google Apps Script via iframe (anti-CORS).
============================================================= */

'use strict';

// ── Konfigurasi ──────────────────────────────────────────────
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyMwXthnHR5ZBpbzWkA2tN3-u6BlxYY7stziUsKzcX-HVlpE1NY-DBD1sqpczUPAXHE/exec';
const CSV_PATH   = 'mastersls.csv';  // Pastikan file ini satu folder dengan index.html

// ── Referensi elemen ─────────────────────────────────────────
const form         = document.getElementById('digitalForm');
const btnSubmit    = document.getElementById('btnSubmit');
const btnPreview   = document.getElementById('btnPreview');
const btnKonfirmasi = document.getElementById('btnKonfirmasi');
const modalPreview = new bootstrap.Modal(document.getElementById('modalPreview'));

// ── Label ramah untuk tabel pratinjau ────────────────────────
const labelMap = {
    nama_pemilik      : 'Nama Pemilik',
    nama_usaha        : 'Nama Usaha',
    jenis_usaha       : 'Jenis Usaha',
    jenis_usaha_lainnya: 'Jenis Usaha (Lainnya)',
    platform          : 'Platform Utama',
    platform_lainnya  : 'Platform (Lainnya)',
    medsos            : 'Akun Media Sosial',
    kontak            : 'Nomor WhatsApp',
    kecamatan         : 'Kecamatan',
    desa              : 'Desa/Kelurahan',
    rt                : 'RT',
    alamat            : 'Alamat',
    koordinat         : 'Koordinat GPS'
};

// =============================================================
// 1. LOAD CSV & BANGUN DROPDOWN DEPENDENCY
// =============================================================

/**
 * Mem-parsing CSV sederhana (tanpa library) menjadi array of objects.
 * Asumsi: baris pertama adalah header, delimiter koma, tanpa quoting kompleks.
 */
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim());
        return headers.reduce((obj, h, i) => { obj[h] = cols[i] || ''; return obj; }, {});
    });
}

/**
 * Dari array rows CSV, bangun struktur nested:
 * { kecamatan: { desa: [rt, rt, ...] } }
 */
function buildIndex(rows) {
    const idx = {};
    rows.forEach(row => {
        const kec  = row.kecamatan;
        const desa = row.desa;
        const rt   = row.rt;
        if (!kec || !desa || !rt) return;
        if (!idx[kec]) idx[kec] = {};
        if (!idx[kec][desa]) idx[kec][desa] = [];
        if (!idx[kec][desa].includes(rt)) idx[kec][desa].push(rt);
    });
    return idx;
}

/** Mengisi select dengan array pilihan, didahului placeholder */
function populateSelect(selectEl, items, placeholder) {
    selectEl.innerHTML = `<option value="" selected disabled>${placeholder}</option>`;
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        selectEl.appendChild(opt);
    });
    selectEl.disabled = false;
}

/** Reset dan kunci sebuah select */
function resetSelect(selectEl, placeholder) {
    selectEl.innerHTML = `<option value="" selected disabled>${placeholder}</option>`;
    selectEl.disabled = true;
    selectEl.value = '';
}

// Muat CSV lalu pasang event listener dropdown
fetch(CSV_PATH)
    .then(res => {
        if (!res.ok) throw new Error('CSV tidak ditemukan: ' + CSV_PATH);
        return res.text();
    })
    .then(text => {
        const rows  = parseCSV(text);
        const index = buildIndex(rows);

        // Isi dropdown Kecamatan
        const selKec  = document.getElementById('kecamatan');
        const selDesa = document.getElementById('desa');
        const selRT   = document.getElementById('rt');

        populateSelect(selKec, Object.keys(index), '-- Pilih Kecamatan --');
        selKec.disabled = false;

        // Kecamatan → isi Desa, reset RT
        selKec.addEventListener('change', function () {
            const kec = this.value;
            resetSelect(selRT, '-- Pilih Desa dulu --');
            if (index[kec]) {
                populateSelect(selDesa, Object.keys(index[kec]), '-- Pilih Desa/Kelurahan --');
            } else {
                resetSelect(selDesa, '-- Pilih Desa/Kelurahan --');
            }
        });

        // Desa → isi RT
        selDesa.addEventListener('change', function () {
            const kec  = selKec.value;
            const desa = this.value;
            if (index[kec] && index[kec][desa]) {
                populateSelect(selRT, index[kec][desa], '-- Pilih RT --');
            } else {
                resetSelect(selRT, '-- Pilih RT --');
            }
        });
    })
    .catch(err => {
        console.error('Gagal memuat mastersls.csv:', err);
        // Fallback: biarkan dropdown tetap disabled dengan pesan error
        const selKec = document.getElementById('kecamatan');
        selKec.innerHTML = '<option value="" disabled selected>⚠ Gagal memuat data wilayah</option>';
    });


// =============================================================
// 2. DROPDOWN "LAINNYA" DINAMIS
// =============================================================

// Jenis Usaha
document.getElementById('jenis_usaha').addEventListener('change', function () {
    const wrapper = document.getElementById('jenis_lainnya_wrapper');
    const input   = document.getElementById('jenis_usaha_lainnya');
    const isLain  = this.value === 'Lainnya';
    wrapper.style.display = isLain ? 'block' : 'none';
    input.required = isLain;
});

// Platform (checkbox): tampilkan input "Lainnya" jika dicentang
document.querySelectorAll('.platform-check').forEach(cb => {
    cb.addEventListener('change', function () {
        const checked  = document.querySelectorAll('.platform-check:checked');
        const errEl    = document.getElementById('platformError');
        errEl.style.display = checked.length === 0 ? 'block' : 'none';

        const lainnyaCb = document.getElementById('plat_lainnya');
        const wrapper   = document.getElementById('platform_lainnya_wrapper');
        const input     = document.getElementById('platform_lainnya');
        const isLain    = lainnyaCb.checked;
        wrapper.style.display = isLain ? 'block' : 'none';
        input.required = isLain;
    });
});


// =============================================================
// 3. VALIDASI PLATFORM (minimal 1 checkbox)
// =============================================================

function validatePlatform() {
    const checked = document.querySelectorAll('.platform-check:checked');
    const errEl   = document.getElementById('platformError');
    if (checked.length === 0) {
        errEl.style.display = 'block';
        document.getElementById('platformCheckboxGroup')
            .scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }
    errEl.style.display = 'none';
    return true;
}


// =============================================================
// 4. GEOTAGGING
// =============================================================

function getLocation() {
    const btn = document.getElementById('btnGeo');
    if (!navigator.geolocation) {
        alert('Geolocation tidak didukung oleh browser ini.');
        return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Mendapatkan lokasi...';

    navigator.geolocation.getCurrentPosition(
        pos => {
            document.getElementById('coords').value =
                pos.coords.latitude + ',' + pos.coords.longitude;
            document.getElementById('statusGeo').style.display = 'block';
            btn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Koordinat Tersimpan';
            btn.classList.replace('btn-outline-secondary', 'btn-outline-success');
        },
        () => {
            alert('Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Sematkan Koordinat (Opsional)';
        }
    );
}

// Expose ke HTML karena dipanggil via onclick=""
window.getLocation = getLocation;


// =============================================================
// 5. KUMPULKAN PLATFORM CHECKBOX → HIDDEN INPUT
//    (agar form.submit() native mengirim satu field, bukan banyak)
// =============================================================

function collectPlatform() {
    const values = Array.from(document.querySelectorAll('.platform-check:checked'))
                        .map(cb => cb.value);
    let hidden = document.getElementById('platform_hidden');
    if (!hidden) {
        hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.id   = 'platform_hidden';
        hidden.name = 'platform';
        form.appendChild(hidden);
    }
    // Nonaktifkan checkbox asli agar tidak mengirim duplikat
    document.querySelectorAll('.platform-check').forEach(cb => cb.disabled = true);
    hidden.value = values.join(', ');
}

function restorePlatformCheckboxes() {
    document.querySelectorAll('.platform-check').forEach(cb => cb.disabled = false);
    const hidden = document.getElementById('platform_hidden');
    if (hidden) hidden.remove();
}


// =============================================================
// 6. PRATINJAU DATA (modal sebelum kirim)
// =============================================================

btnPreview.addEventListener('click', () => {
    if (!validatePlatform()) return;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        form.querySelector(':invalid').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const platformValues = Array.from(document.querySelectorAll('.platform-check:checked'))
                                .map(cb => cb.value).join(', ');

    const data  = new FormData(form);
    const tbody = document.querySelector('#previewTable tbody');
    tbody.innerHTML = '';

    const trPlatform = document.createElement('tr');
    trPlatform.innerHTML = `<td>Platform Utama</td><td>${platformValues || '-'}</td>`;

    let platformInserted = false;
    for (const [key, value] of data.entries()) {
        if (key === 'platform') {
            if (!platformInserted) { tbody.appendChild(trPlatform); platformInserted = true; }
            continue;
        }
        if (!value.trim()) continue;
        const label = labelMap[key] || key;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${label}</td><td>${value}</td>`;
        tbody.appendChild(tr);
    }
    if (!platformInserted) tbody.appendChild(trPlatform);

    modalPreview.show();
});


// =============================================================
// 7. KIRIM DATA (iframe trick — anti CORS Google Apps Script)
// =============================================================

function kirimData() {
    btnSubmit.disabled  = true;
    btnPreview.disabled = true;
    btnSubmit.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Mengirim...';

    // Buat iframe tersembunyi (sekali saja)
    const iframeName = 'hidden_iframe_target';
    let iframe = document.getElementById(iframeName);
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.name  = iframeName;
        iframe.id    = iframeName;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }

    form.action = SCRIPT_URL;
    form.method = 'POST';
    form.target = iframeName;

    iframe.onload = () => {
        restorePlatformCheckboxes();
        form.reset();
        form.classList.remove('was-validated');
        form.removeAttribute('action');
        form.removeAttribute('target');

        // Reset dropdown dependency
        resetSelect(document.getElementById('desa'), '-- Pilih Kecamatan dulu --');
        resetSelect(document.getElementById('rt'),   '-- Pilih Desa dulu --');

        document.getElementById('formContainer').style.display   = 'none';
        document.getElementById('successContainer').style.display = 'block';
        document.getElementById('successContainer')
            .scrollIntoView({ behavior: 'smooth' });
    };

    collectPlatform();
    form.submit();
}

// Kirim dari tombol "Ya, Kirim Data" di modal
btnKonfirmasi.addEventListener('click', () => {
    modalPreview.hide();
    kirimData();
});

// Kirim langsung dari tombol submit form (bypass modal)
form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validatePlatform()) return;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    kirimData();
});