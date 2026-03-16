// ============================================================
// KONFIGURASI FIREBASE
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyAbPz355jPsQ9ZfHCSHebFDybGucOuqVPQ",
  authDomain: "web-app-warung.firebaseapp.com",
  projectId: "web-app-warung",
  storageBucket: "web-app-warung.firebasestorage.app",
  messagingSenderId: "753873031955",
  appId: "1:753873031955:web:6f85e2a02ba24e336f40e6"
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();

// ============================================================
// DOM READY
// ============================================================
document.addEventListener("DOMContentLoaded", () => {

  // ---- ELEMEN LOGIN ----
  const loginPage    = document.getElementById("loginPage");
  const btnLogin     = document.getElementById("btnLogin");
  const appContainer = document.querySelector(".app");

  // ---- AUTH STATE ----
  auth.onAuthStateChanged(user => {
    if (user) {
      loginPage.style.display  = "none";
      appContainer.style.display = "flex";
      loadKeranjang();
    } else {
      loginPage.style.display  = "flex";
      appContainer.style.display = "none";
    }
  });

  btnLogin.addEventListener("click", doLogin);

  document.getElementById("password").addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });

  function doLogin() {
    const email = document.getElementById("email").value.trim();
    const pass  = document.getElementById("password").value;
    if (!email || !pass) { alert("Email dan password wajib diisi."); return; }
    auth.signInWithEmailAndPassword(email, pass)
        .catch(err => alert("Gagal login: " + err.message));
  }

  document.getElementById("btnLogout").addEventListener("click", () => {
    if (confirm("Yakin ingin keluar?")) auth.signOut();
  });

  // ============================================================
  // REFERENSI ELEMEN
  // ============================================================
  const form               = document.getElementById("barangForm");
  const tabel              = document.getElementById("tabelBarang");
  const searchInput        = document.getElementById("search");
  const searchBelanja      = document.getElementById("searchBelanja");
  const modal              = document.getElementById("modal");
  const openModalBtn       = document.getElementById("openModal");
  const closeModalBtn      = document.getElementById("closeModal");
  const toggleBtn          = document.getElementById("toggleDark");
  const pageGudang         = document.getElementById("pageGudang");
  const pageBelanja        = document.getElementById("pageBelanja");
  const listBelanja        = document.getElementById("listBelanja");
  const keranjangDiv       = document.getElementById("keranjangBelanja");
  const totalDiv           = document.getElementById("totalBelanja");
  const menuGudang         = document.getElementById("menuGudang");
  const menuBelanja        = document.getElementById("menuBelanja");
  const fabBtn             = document.getElementById("openModal");
  const btnScrollKeranjang = document.getElementById("btnScrollKeranjang");
  const clearSearch        = document.getElementById("clearSearch");
  const clearSearchBelanja = document.getElementById("clearSearchBelanja");

  // ============================================================
  // STATE
  // ============================================================
  let allData        = [];
  let keranjang      = {};
  let currentSearch  = "";
  let searchBelanjaQ = "";
  let currentKategori = "";

  // ============================================================
  // UTILITAS
  // ============================================================
  const rupiah = n =>
    "Rp " + new Intl.NumberFormat("id-ID").format(n || 0);

  function escHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeSingleQuote(str = "") {
    return String(str).replace(/'/g, "\\'");
  }

  // ============================================================
  // DARK MODE
  // ============================================================
  toggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    toggleBtn.querySelector(".tool-icon").textContent  = isDark ? "☀️" : "🌙";
    toggleBtn.querySelector(".tool-label").textContent = isDark ? "Mode Terang" : "Mode Gelap";
  });

  // ============================================================
  // SEARCH — iOS Clear Button
  // ============================================================
  function handleSearchInput(inputEl, wrapperSel, onInput) {
    const wrapper = inputEl.closest(".search-ios-wrapper");
    inputEl.addEventListener("input", e => {
      wrapper.classList.toggle("has-value", e.target.value.length > 0);
      onInput(e.target.value);
    });
  }

  handleSearchInput(searchInput, ".search-ios-wrapper", val => {
    currentSearch = val;
    renderTable();
  });

  handleSearchInput(searchBelanja, ".search-ios-wrapper", val => {
    searchBelanjaQ = val;
    renderBelanja();
  });

  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input"));
    searchInput.focus();
  });

  clearSearchBelanja.addEventListener("click", () => {
    searchBelanja.value = "";
    searchBelanja.dispatchEvent(new Event("input"));
    searchBelanja.focus();
  });

  // ============================================================
  // NAVIGASI HALAMAN
  // ============================================================
  menuGudang.addEventListener("click", () => {
    pageGudang.style.display  = "";
    pageBelanja.style.display = "none";
    menuGudang.classList.add("active");
    menuBelanja.classList.remove("active");
    fabBtn.style.display = "flex";
    btnScrollKeranjang.style.display = "none";
  });

  menuBelanja.addEventListener("click", () => {
    pageBelanja.style.display = "";
    pageGudang.style.display  = "none";
    menuBelanja.classList.add("active");
    menuGudang.classList.remove("active");
    fabBtn.style.display = "none";
    btnScrollKeranjang.style.display = "flex";
    renderBelanja();
  });

  btnScrollKeranjang.addEventListener("click", () => {
    keranjangDiv.scrollIntoView({ behavior: "smooth" });
  });

  // ============================================================
  // MODAL — BUKA / TUTUP
  // ============================================================
  function openModal()  { modal.classList.add("active"); }
  function closeModal() {
    modal.classList.remove("active");
    form.reset();
    document.getElementById("docId").value = "";
  }

  openModalBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  // ============================================================
  // FILTER KATEGORI
  // ============================================================
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelector(".filter-btn.active")?.classList.remove("active");
      btn.classList.add("active");
      currentKategori = btn.dataset.kategori;
      renderTable();
    });
  });

  // ============================================================
  // FIREBASE — REALTIME DATA
  // ============================================================
  db.collection("barang").orderBy("nama").onSnapshot(snapshot => {
    allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTable();
    if (pageBelanja.style.display !== "none") renderBelanja();
  });

  // ============================================================
  // RENDER GUDANG
  // ============================================================
  function renderTable() {
    const kw = currentSearch.toLowerCase();
    const filtered = allData.filter(i => {
      const matchS = i.nama.toLowerCase().includes(kw);
      const matchK = !currentKategori || i.kategori === currentKategori;
      return matchS && matchK;
    });

    if (!filtered.length) {
      tabel.innerHTML = `<div class="empty-state">😕 Barang tidak ditemukan.</div>`;
      return;
    }

    tabel.innerHTML = filtered.map((i, idx) => `
      <div class="product-card"
           style="animation-delay:${idx * 0.03}s"
           onclick="toggleDetail(this)">

        <div class="card-main">
          <div class="card-left">
            <div class="prod-name">${escHtml(i.nama)}</div>
            <span class="badge" data-cat="${escHtml(i.kategori || '')}">${escHtml(i.kategori || 'Lainnya')}</span>
          </div>
          <div class="card-right">
            <div class="prod-price">${escHtml(i.catatanUtama || 'Cek Detail')}</div>
            <div class="prod-hint">Klik untuk detail ▾</div>
          </div>
        </div>

        <div class="card-detail">
          <hr class="detail-divider">
          <div class="detail-content">
            <div class="detail-label">Rincian Harga</div>
            <div class="detail-text">${escHtml(i.catatanHarga || '–')}</div>
          </div>
          <div class="card-actions">
            <button class="edit-btn"   onclick="handleEdit('${i.id}',event)">✏️ Edit</button>
            <button class="delete-btn" onclick="handleDelete('${i.id}',event)">🗑️ Hapus</button>
          </div>
        </div>

      </div>
    `).join("");
  }

  // ============================================================
  // TOGGLE DETAIL KARTU
  // ============================================================
  window.toggleDetail = card => {
    const detail    = card.querySelector(".card-detail");
    const isVisible = detail.style.display === "block";
    document.querySelectorAll(".card-detail")
            .forEach(d => d.style.display = "none");
    if (!isVisible) detail.style.display = "block";
  };

  // ============================================================
  // EDIT BARANG
  // ============================================================
  window.handleEdit = (id, e) => {
    e.stopPropagation();
    const i = allData.find(x => x.id === id);
    if (!i) return;
    document.getElementById("docId").value        = i.id;
    document.getElementById("nama").value         = i.nama;
    document.getElementById("hargaAgen").value    = i.hargaAgen || 0;
    document.getElementById("catatanUtama").value = i.catatanUtama || "";
    document.getElementById("catatanHarga").value = i.catatanHarga || "";
    document.getElementById("satuanBeli").value   = i.satuanBeli || "";
    document.getElementById("kategori").value     = i.kategori || "";
    openModal();
  };

  // ============================================================
  // HAPUS BARANG
  // ============================================================
  window.handleDelete = (id, e) => {
    e.stopPropagation();
    const item = allData.find(x => x.id === id);
    if (!item) return;
    if (!confirm(`Hapus "${item.nama}"?`)) return;
    db.collection("barang").doc(id).delete()
      .catch(err => alert("Gagal hapus: " + err.message));
  };

  // ============================================================
  // SIMPAN / UPDATE FORM
  // ============================================================
  form.addEventListener("submit", e => {
    e.preventDefault();
    const payload = {
      nama        : document.getElementById("nama").value.trim(),
      catatanUtama: document.getElementById("catatanUtama").value.trim(),
      catatanHarga: document.getElementById("catatanHarga").value.trim(),
      hargaAgen   : Number(document.getElementById("hargaAgen").value),
      satuanBeli  : document.getElementById("satuanBeli").value,
      kategori    : document.getElementById("kategori").value,
      stok        : 0
    };
    const docId = document.getElementById("docId").value;
    const op = docId
      ? db.collection("barang").doc(docId).update(payload)
      : db.collection("barang").add(payload);
    op.then(closeModal).catch(err => alert("Gagal simpan: " + err.message));
  });

  // ============================================================
  // RENDER BELANJA
  // ============================================================
  function renderBelanja() {
    const q        = searchBelanjaQ.toLowerCase();
    const filtered = allData.filter(i => i.nama.toLowerCase().includes(q));

    listBelanja.innerHTML = filtered.map(i => `
      <div class="belanja-item">
        <div class="belanja-info">
          <div class="belanja-nama">${escHtml(i.nama)}</div>
          <div class="belanja-harga">${rupiah(i.hargaAgen)} / ${escHtml(i.satuanBeli)}</div>
        </div>
        <div class="belanja-action">
          <input class="qty-input" type="number" id="qty-${i.id}" value="1" min="1">
          <button class="tambah-btn"
            onclick="tambahKeKeranjang('${i.id}','${escapeSingleQuote(i.nama)}',${i.hargaAgen},'${escapeSingleQuote(i.satuanBeli)}')">
            ➕
          </button>
        </div>
      </div>
    `).join("");
  }

  // ============================================================
  // TAMBAH KE KERANJANG
  // ============================================================
  window.tambahKeKeranjang = (id, nama, harga, satuan) => {
    const qtyEl  = document.getElementById(`qty-${id}`);
    const jumlah = parseInt(qtyEl?.value) || 1;

    if (keranjang[nama]) {
      keranjang[nama].qty += jumlah;
    } else {
      keranjang[nama] = { qty: jumlah, harga: Number(harga), satuan };
    }

    saveKeranjang();
    renderKeranjang();
    updateBadge();
    if (qtyEl) qtyEl.value = 1;
    alert(`✅ ${nama} ×${jumlah} masuk keranjang!`);
  };

  // ============================================================
  // PERSIST KERANJANG
  // ============================================================
  function saveKeranjang() {
    localStorage.setItem("keranjangWarung", JSON.stringify(keranjang));
  }

  function loadKeranjang() {
    const data = localStorage.getItem("keranjangWarung");
    if (data) {
      try {
        keranjang = JSON.parse(data);
      } catch {
        keranjang = {};
      }
      renderKeranjang();
      updateBadge();
    }
  }

  function updateBadge() {
    const count = Object.keys(keranjang).length;
    if (count > 0) {
      btnScrollKeranjang.setAttribute("data-count", count);
    } else {
      btnScrollKeranjang.removeAttribute("data-count");
    }
  }

  // ============================================================
  // RENDER KERANJANG
  // ============================================================
  function renderKeranjang() {
    const keys = Object.keys(keranjang);

    if (!keys.length) {
      keranjangDiv.innerHTML = `<p class="empty-cart">🧺 Keranjang masih kosong.</p>`;
      totalDiv.innerHTML = "";
      return;
    }

    keranjangDiv.innerHTML = keys.map(n => `
      <div class="keranjang-item">
        <div class="keranjang-info">
          <div class="keranjang-nama">${escHtml(n)}</div>
          <div class="keranjang-qty">
            ${keranjang[n].qty} ${escHtml(keranjang[n].satuan)}
            × ${rupiah(keranjang[n].harga)}
          </div>
        </div>
        <button class="hapus-btn" data-nama="${escHtml(n)}">✕</button>
      </div>
    `).join("");

    const total = keys.reduce((s, n) => s + keranjang[n].qty * keranjang[n].harga, 0);
    totalDiv.innerHTML = `<strong>Total: ${rupiah(total)}</strong>`;
  }

  keranjangDiv.addEventListener("click", e => {
    if (e.target.classList.contains("hapus-btn")) {
      delete keranjang[e.target.dataset.nama];
      saveKeranjang();
      renderKeranjang();
      updateBadge();
    }
  });

  // ============================================================
  // CETAK / BAGIKAN DAFTAR BELANJA
  // ============================================================
  document.getElementById("printBelanja").addEventListener("click", () => {
    const keys = Object.keys(keranjang);
    if (!keys.length) { alert("Keranjang masih kosong!"); return; }

    let text  = "=== DAFTAR BELANJA ===\n";
        text += "Tgl: " + new Date().toLocaleDateString("id-ID") + "\n\n";

    keys.forEach(n => {
      text += `${n.toUpperCase()}\n`;
      text += `  x ${keranjang[n].qty} ${keranjang[n].satuan}\n\n`;
    });

    text += "----------------------\n";
    text += "  ( Warung Hasan )  \n\n\n";

    if (navigator.share) {
      navigator.share({ title: "Daftar Belanja", text })
        .catch(() => copyFallback(text));
    } else {
      copyFallback(text);
    }
  });

  function copyFallback(text) {
    navigator.clipboard.writeText(text)
      .then(() => alert("Disalin! Buka RawBT lalu Paste."))
      .catch(() => alert("Gagal menyalin. Salin manual:\n\n" + text));
  }

}); // end DOMContentLoaded
