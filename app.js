// ===========================
// KONFIGURASI FIREBASE
// ===========================
const firebaseConfig = {
  apiKey: "AIzaSyAbPz355jPsQ9ZfHCSHebFDybGucOuqVPQ",
  authDomain: "web-app-warung.firebaseapp.com",
  projectId: "web-app-warung",
  storageBucket: "web-app-warung.firebasestorage.app",
  messagingSenderId: "753873031955",
  appId: "1:753873031955:web:6f85e2a02ba24e336f40e6"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", function () {

  // ===========================
  // REFERENSI ELEMEN DOM
  // ===========================
  const form           = document.getElementById("barangForm");
  const tabel          = document.getElementById("tabelBarang");
  const searchInput    = document.getElementById("search");
  const searchBelanja  = document.getElementById("searchBelanja");
  const modal          = document.getElementById("modal");
  const openModalBtn   = document.getElementById("openModal");
  const closeModalBtn  = document.getElementById("closeModal");
  const toggleBtn      = document.getElementById("toggleDark");
  const pageGudang     = document.getElementById("pageGudang");
  const pageBelanja    = document.getElementById("pageBelanja");
  const listBelanja    = document.getElementById("listBelanja");
  const keranjangDiv   = document.getElementById("keranjangBelanja");
  const totalDiv       = document.getElementById("totalBelanja");
  const menuGudang     = document.getElementById("menuGudang");
  const menuBelanja    = document.getElementById("menuBelanja");
  const fabBtn         = document.getElementById("openModal");

  // ===========================
  // STATE APLIKASI
  // FIX: currentKategori dideklarasikan di sini, bukan terlepas di bawah
  // ===========================
  let allData        = [];
  let keranjang      = {};
  let currentSearch  = "";
  let searchBelanjaQ = "";
  let currentKategori = "";

  // ===========================
  // UTILITY
  // ===========================
  function rupiah(angka) {
    return "Rp " + new Intl.NumberFormat("id-ID").format(angka || 0);
  }

  // ===========================
  // MODAL: BUKA & TUTUP
  // ===========================
  function openModal() {
    modal.classList.add("active");
  }

  function closeModal() {
    modal.classList.remove("active");
    form.reset();
    document.getElementById("docId").value = "";
  }

  openModalBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);

  // Tutup modal saat klik di luar konten
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // ===========================
  // FIX: NAVIGASI HALAMAN
  // ===========================
  menuGudang.addEventListener("click", () => {
    pageGudang.style.display = "block";
    pageBelanja.style.display = "none";
    menuGudang.classList.add("active");
    menuBelanja.classList.remove("active");
    fabBtn.style.display = "flex"; // Tampilkan FAB di Gudang
  });

  menuBelanja.addEventListener("click", () => {
    pageBelanja.style.display = "block";
    pageGudang.style.display = "none";
    menuBelanja.classList.add("active");
    menuGudang.classList.remove("active");
    fabBtn.style.display = "none"; // FIX: Sembunyikan FAB di halaman Belanja
    renderBelanja();
  });

  // ===========================
  // FIX: DARK MODE TOGGLE
  // ===========================
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    toggleBtn.textContent = isDark ? "☀️" : "🌙";
  });

  // ===========================
  // FILTER KATEGORI
  // ===========================
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelector(".filter-btn.active").classList.remove("active");
      btn.classList.add("active");
      currentKategori = btn.dataset.kategori;
      renderTable();
    });
  });

  // ===========================
  // SEARCH GUDANG
  // ===========================
  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderTable();
  });

  // FIX: SEARCH BELANJA (sebelumnya tidak ada event listener)
  searchBelanja.addEventListener("input", (e) => {
    searchBelanjaQ = e.target.value;
    renderBelanja();
  });

  // ===========================
  // AMBIL DATA DARI FIREBASE
  // ===========================
  db.collection("barang").orderBy("nama").onSnapshot(snapshot => {
    allData = [];
    snapshot.forEach(doc => allData.push({ id: doc.id, ...doc.data() }));
    renderTable();
    if (pageBelanja.style.display !== "none") renderBelanja();
  });

  // ===========================
  // RENDER TABEL / DAFTAR GUDANG
  // ===========================
  function renderTable() {
    const keyword  = currentSearch.toLowerCase();
    const filtered = allData.filter(i => {
      const matchSearch   = i.nama.toLowerCase().includes(keyword);
      const matchKategori = currentKategori === "" || i.kategori === currentKategori;
      return matchSearch && matchKategori;
    });

    if (filtered.length === 0) {
      tabel.innerHTML = `<p style="text-align:center; color:#999; padding: 30px 0;">Barang tidak ditemukan.</p>`;
      return;
    }

    tabel.innerHTML = filtered.map(i => `
      <div class="product-card" onclick="toggleDetail(this)">
        <div class="card-main">
          <div class="card-left">
            <div class="prod-name">${i.nama}</div>
            <div class="prod-cat">${i.kategori || ''}</div>
          </div>
          <div class="card-right">
            <div class="prod-price">${i.catatanUtama || 'Cek Detail'}</div>
            <div style="font-size: 10px; color: #999;">Klik untuk detail ▾</div>
          </div>
        </div>

        <div class="card-detail">
          <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
          <div class="detail-content">
            <div style="font-size: 11px; color: #888; margin-bottom: 4px; font-weight: bold;">RINCIAN HARGA:</div>
            <div class="detail-text">${i.catatanHarga || '-'}</div>
          </div>
          <div class="card-actions">
            <button class="edit-btn" onclick="handleEdit('${i.id}', event)">✏️ Edit</button>
            <button class="delete-btn" onclick="handleDelete('${i.id}', event)">🗑️ Hapus</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  // ===========================
  // TOGGLE DETAIL KARTU
  // ===========================
  window.toggleDetail = function (card) {
    const detail    = card.querySelector(".card-detail");
    const isVisible = detail.style.display === "block";

    // Tutup semua detail yang terbuka
    document.querySelectorAll(".card-detail").forEach(d => d.style.display = "none");

    // Buka yang diklik (jika sebelumnya tertutup)
    if (!isVisible) detail.style.display = "block";
  };

  // ===========================
  // FIX: EDIT BARANG (catatanUtama sekarang ikut terisi)
  // ===========================
  window.handleEdit = function (id, event) {
    event.stopPropagation();
    const i = allData.find(x => x.id === id);
    if (!i) return;

    document.getElementById("docId").value        = i.id;
    document.getElementById("nama").value         = i.nama;
    document.getElementById("hargaAgen").value    = i.hargaAgen || 0;
    document.getElementById("catatanUtama").value = i.catatanUtama || ""; // FIX: sebelumnya kosong
    document.getElementById("catatanHarga").value = i.catatanHarga || "";
    document.getElementById("satuanBeli").value   = i.satuanBeli || "";
    document.getElementById("kategori").value     = i.kategori || "";
    openModal();
  };

  // ===========================
  // FIX: HAPUS BARANG (sebelumnya tidak ada fungsi ini)
  // ===========================
  window.handleDelete = function (id, event) {
    event.stopPropagation();
    const item = allData.find(x => x.id === id);
    if (!item) return;
    if (!confirm(`Yakin ingin menghapus "${item.nama}"?`)) return;
    db.collection("barang").doc(id).delete().catch(err => {
      alert("Gagal menghapus: " + err.message);
    });
  };

  // ===========================
  // SIMPAN / UPDATE BARANG (FORM SUBMIT)
  // ===========================
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = {
      nama         : document.getElementById("nama").value.trim(),
      catatanUtama : document.getElementById("catatanUtama").value.trim(),
      catatanHarga : document.getElementById("catatanHarga").value.trim(),
      hargaAgen    : Number(document.getElementById("hargaAgen").value),
      satuanBeli   : document.getElementById("satuanBeli").value,
      kategori     : document.getElementById("kategori").value,
      stok         : 0
    };

    const docId = document.getElementById("docId").value;
    if (docId) {
      db.collection("barang").doc(docId).update(payload)
        .then(closeModal)
        .catch(err => alert("Gagal menyimpan: " + err.message));
    } else {
      db.collection("barang").add(payload)
        .then(closeModal)
        .catch(err => alert("Gagal menyimpan: " + err.message));
    }
  });

  // ===========================
  // RENDER HALAMAN BELANJA
  // ===========================
  function renderBelanja() {
    const filtered = allData.filter(i =>
      i.nama.toLowerCase().includes(searchBelanjaQ.toLowerCase())
    );

    listBelanja.innerHTML = filtered.map(i => `
      <div class="belanja-item">
        <div class="belanja-info">
          <div class="belanja-nama">${i.nama}</div>
          <div class="belanja-harga">${rupiah(i.hargaAgen)} / ${i.satuanBeli}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input
            type="number"
            id="qty-${i.id}"
            value="1" min="1"
            style="width:50px; padding:8px; border:1px solid #ddd; border-radius:4px;"
          >
          <button
            class="tambah-btn"
            onclick="tambahKeKeranjang('${i.id}', '${i.nama.replace(/'/g, "\\'")}', ${i.hargaAgen}, '${i.satuanBeli}')"
          >➕</button>
        </div>
      </div>
    `).join("");
  }

  // ===========================
  // TAMBAH KE KERANJANG
  // ===========================
  window.tambahKeKeranjang = function (id, nama, harga, satuan) {
    const qtyInput = document.getElementById(`qty-${id}`);
    const jumlah   = parseInt(qtyInput.value) || 1;

    if (keranjang[nama]) {
      keranjang[nama].qty += jumlah;
    } else {
      keranjang[nama] = { qty: jumlah, harga: Number(harga), satuan: satuan };
    }

    renderKeranjang();
    qtyInput.value = 1;
    alert(`✅ ${nama} berhasil masuk keranjang!`);
  };

  // ===========================
  // FIX: RENDER KERANJANG (pakai class CSS yang benar)
  // ===========================
  function renderKeranjang() {
    const keys = Object.keys(keranjang);

    if (keys.length === 0) {
      keranjangDiv.innerHTML = `<p style="text-align:center; color:#999; padding:12px 0;">Keranjang kosong.</p>`;
      totalDiv.innerHTML = "";
      return;
    }

    keranjangDiv.innerHTML = keys.map(n => `
      <div class="keranjang-item">
        <div class="keranjang-info">
          <div class="keranjang-nama">${n}</div>
          <div class="keranjang-qty">${keranjang[n].qty} ${keranjang[n].satuan} × ${rupiah(keranjang[n].harga)}</div>
        </div>
        <button class="hapus-btn" data-nama="${n}">✕</button>
      </div>
    `).join("");

    const total = keys.reduce((sum, n) => sum + (keranjang[n].qty * keranjang[n].harga), 0);
    totalDiv.innerHTML = `<strong>Total: ${rupiah(total)}</strong>`;
  }

  // Hapus item dari keranjang
  keranjangDiv.addEventListener("click", (e) => {
    if (e.target.classList.contains("hapus-btn")) {
      delete keranjang[e.target.dataset.nama];
      renderKeranjang();
    }
  });

  // ===========================
  // CETAK / BAGIKAN DAFTAR BELANJA
  // ===========================
  document.getElementById("printBelanja").addEventListener("click", () => {
    const keys = Object.keys(keranjang);
    if (keys.length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }

    let text = "=== DAFTAR BELANJA ===\n";
    text += "Tgl: " + new Date().toLocaleDateString("id-ID") + "\n\n";

    keys.forEach(n => {
      text += `${n.toUpperCase()}\n`;
      text += `  x ${keranjang[n].qty} ${keranjang[n].satuan}\n\n`;
    });

    text += "----------------------\n";
    text += "  ( Warung Hasan )  \n\n\n";

    if (navigator.share) {
      navigator.share({ title: "Daftar Belanja", text: text })
        .catch(err => {
          console.warn("Share gagal:", err);
          navigator.clipboard.writeText(text);
          alert("Gagal membagikan. Teks telah disalin ke clipboard.");
        });
    } else {
      navigator.clipboard.writeText(text);
      alert("Daftar belanja disalin! Silakan buka aplikasi RawBT lalu Paste.");
    }
  });

}); // end DOMContentLoaded
