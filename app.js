// ============================================================
// KONFIGURASI FIREBASE
// ============================================================
const firebaseConfig = {
  apiKey:            "AIzaSyAbPz355jPsQ9ZfHCSHebFDybGucOuqVPQ",
  authDomain:        "web-app-warung.firebaseapp.com",
  projectId:         "web-app-warung",
  storageBucket:     "web-app-warung.firebasestorage.app",
  messagingSenderId: "753873031955",
  appId:             "1:753873031955:web:6f85e2a02ba24e336f40e6"
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();

// ============================================================
// DOM READY
// ============================================================
document.addEventListener("DOMContentLoaded", () => {

  // ── ELEMEN LOGIN ──────────────────────────────────────────
  const loginPage    = document.getElementById("loginPage");
  const btnLogin     = document.getElementById("btnLogin");
  const loginError   = document.getElementById("loginError");
  const appContainer = document.querySelector(".app");

  // ── AUTH STATE ────────────────────────────────────────────
  auth.onAuthStateChanged(user => {
    if (user) {
      loginPage.style.display    = "none";
      appContainer.style.display = "flex";
      loadKeranjang();
    } else {
      loginPage.style.display    = "flex";
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
    loginError.textContent = "";

    if (!email || !pass) {
      loginError.textContent = "⚠️ Email dan password wajib diisi.";
      return;
    }

    btnLogin.textContent = "Memuat...";
    btnLogin.classList.add("loading");

    auth.signInWithEmailAndPassword(email, pass)
      .catch(err => {
        const msg =
          err.code === "auth/wrong-password"  ? "Password salah." :
          err.code === "auth/user-not-found"  ? "Email tidak terdaftar." :
          err.message;
        loginError.textContent = "❌ " + msg;
      })
      .finally(() => {
        btnLogin.textContent = "Masuk →";
        btnLogin.classList.remove("loading");
      });
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
  const modalEl            = document.getElementById("modal");
  const openModalBtn       = document.getElementById("openModal");
  const closeModalBtn      = document.getElementById("closeModal");
  const toggleBtn          = document.getElementById("toggleDark");
  const pageGudang         = document.getElementById("pageGudang");
  const pageBelanja        = document.getElementById("pageBelanja");
  const pageHistory        = document.getElementById("pageHistory");
  const listBelanja        = document.getElementById("listBelanja");
  const keranjangDiv       = document.getElementById("keranjangBelanja");
  const totalDiv           = document.getElementById("totalBelanja");
  const menuGudang         = document.getElementById("menuGudang");
  const menuBelanja        = document.getElementById("menuBelanja");
  const menuHistory        = document.getElementById("menuHistory");
  const fabBtn             = document.getElementById("openModal");
  const btnScrollKeranjang = document.getElementById("btnScrollKeranjang");
  const clearSearch        = document.getElementById("clearSearch");
  const clearSearchBelanja = document.getElementById("clearSearchBelanja");
  const tabBelanja         = document.getElementById("tabBelanja");
  const tabUpdateData      = document.getElementById("tabUpdateData");
  const listHBelanja       = document.getElementById("listHistoryBelanja");
  const listHUpdateData    = document.getElementById("listHistoryUpdateData");

  // ============================================================
  // STATE
  // ============================================================
  let allData         = [];
  let keranjang       = {};
  let currentSearch   = "";
  let searchBelanjaQ  = "";
  let currentKategori = "";
  let historyCleanedOnce = false; // FIX: hindari pemanggilan berulang

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
  // TOAST NOTIFICATION
  // ============================================================
  function showToast(msg, type = "success", duration = 3000) {
    const container = document.getElementById("toastContainer");
    const icons     = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
    const toast     = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ""}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
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
  function handleSearchInput(inputEl, onInput) {
    const wrapper = inputEl.closest(".search-ios-wrapper");
    inputEl.addEventListener("input", e => {
      wrapper.classList.toggle("has-value", e.target.value.length > 0);
      onInput(e.target.value);
    });
  }

  handleSearchInput(searchInput, val => {
    currentSearch = val;
    renderTable();
  });

  handleSearchInput(searchBelanja, val => {
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
  // FILTER KATEGORI
  // FIX: gunakan syncFilterButtons agar kedua halaman selalu sinkron,
  //      bukan document.querySelector global yang bisa salah halaman
  // ============================================================
  function syncFilterButtons(kategori) {
    document.querySelectorAll(".filter-btn[data-kategori]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.kategori === kategori);
    });
  }

  document.querySelectorAll(".filter-btn[data-kategori]").forEach(btn => {
    btn.addEventListener("click", () => {
      currentKategori = btn.dataset.kategori;
      syncFilterButtons(currentKategori);
      renderTable();
      renderBelanja();
    });
  });

  // ============================================================
  // NAVIGASI HALAMAN
  // ============================================================
  function showPage(active) {
    pageGudang.style.display  = active === "gudang"  ? "" : "none";
    pageBelanja.style.display = active === "belanja" ? "" : "none";
    pageHistory.style.display = active === "history" ? "" : "none";

    menuGudang.classList.toggle("active",  active === "gudang");
    menuBelanja.classList.toggle("active", active === "belanja");
    menuHistory.classList.toggle("active", active === "history");

    fabBtn.style.display             = active === "gudang"  ? "flex" : "none";
    btnScrollKeranjang.style.display = active === "belanja" ? "flex" : "none";

    if (active === "belanja") renderBelanja();
    if (active === "history") loadHistory();
  }

  menuGudang.addEventListener("click",  () => showPage("gudang"));
  menuBelanja.addEventListener("click", () => showPage("belanja"));
  menuHistory.addEventListener("click", () => showPage("history"));

  btnScrollKeranjang.addEventListener("click", () => {
    keranjangDiv.scrollIntoView({ behavior: "smooth" });
  });

  // ============================================================
  // TAB HISTORY
  // ============================================================
  tabBelanja.addEventListener("click", () => {
    tabBelanja.classList.add("active");
    tabUpdateData.classList.remove("active");
    listHBelanja.style.display    = "block";
    listHUpdateData.style.display = "none";
  });

  tabUpdateData.addEventListener("click", () => {
    tabUpdateData.classList.add("active");
    tabBelanja.classList.remove("active");
    listHUpdateData.style.display = "block";
    listHBelanja.style.display    = "none";
  });

  // ============================================================
  // MODAL — BUKA / TUTUP
  // ============================================================
  function openModal()  { modalEl.classList.add("active"); }

  function closeModal() {
    modalEl.classList.remove("active");
    form.reset();
    document.getElementById("docId").value = "";
    // FIX: hapus referensi ke #uploadStatus yang tidak ada di HTML
    if (typeof stopScanner === "function") stopScanner();
  }

  openModalBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);
  modalEl.addEventListener("click", e => {
    if (e.target === modalEl) closeModal();
  });

  // ============================================================
  // FIREBASE — REALTIME DATA
  // ============================================================
  db.collection("barang").orderBy("nama").onSnapshot(snapshot => {
    allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTable();
    updateStats();
    if (pageBelanja.style.display !== "none") renderBelanja();
  });

  // ============================================================
  // UPDATE STATS BAR
  // ============================================================
  function updateStats() {
    const totalEl    = document.getElementById("statTotal");
    const kategoriEl = document.getElementById("statKategori");
    const filteredEl = document.getElementById("statFiltered");
    if (!totalEl) return;

    const kategoriUnik = new Set(allData.map(i => i.kategori).filter(Boolean));
    totalEl.textContent    = allData.length;
    kategoriEl.textContent = kategoriUnik.size;

    const kw = currentSearch.toLowerCase();
    const filtered = allData.filter(i =>
      i.nama.toLowerCase().includes(kw) &&
      (!currentKategori || i.kategori === currentKategori)
    );
    filteredEl.textContent = filtered.length;
  }

  // ============================================================
  // RENDER GUDANG
  // ============================================================
  function renderTable() {
    const kw = currentSearch.toLowerCase();
    const filtered = allData.filter(i => {
      const matchSearch  = i.nama.toLowerCase().includes(kw);
      const matchBarcode = i.barcode && i.barcode.includes(kw);
      const matchKat     = !currentKategori || i.kategori === currentKategori;
      return (matchSearch || matchBarcode) && matchKat;
    });

    const filteredEl = document.getElementById("statFiltered");
    if (filteredEl) filteredEl.textContent = filtered.length;

    if (!filtered.length) {
      tabel.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">😕</span>
          Barang tidak ditemukan.
        </div>`;
      return;
    }

    tabel.innerHTML = filtered.map((i, idx) => {
      const imgHtml = i.fotoUrl
        ? `<div class="prod-img-wrapper">
             <img src="${i.fotoUrl}" class="prod-img" loading="lazy"
               onerror="this.parentElement.innerHTML='📦'">
           </div>`
        : `<div class="prod-img-wrapper">📦</div>`;

      return `
        <div class="product-card"
             style="animation-delay:${idx * 0.03}s"
             onclick="toggleDetail(this)">

          <div class="card-main">
            ${imgHtml}
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
              <button class="copy-btn"   onclick="handleCopy('${i.id}',event)">📋 Salin</button>
              <button class="delete-btn" onclick="handleDelete('${i.id}',event)">🗑️ Hapus</button>
            </div>
          </div>

        </div>`;
    }).join("");
  }

  // ============================================================
  // TOGGLE DETAIL KARTU
  // ============================================================
  window.toggleDetail = card => {
    const detail    = card.querySelector(".card-detail");
    const isVisible = detail.style.display === "block";
    document.querySelectorAll(".card-detail").forEach(d => d.style.display = "none");
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
    document.getElementById("fotoUrl").value      = i.fotoUrl || "";
    document.getElementById("barcode").value      = i.barcode || "";
    openModal();
  };

  // ============================================================
  // SALIN BARANG (sebagai template barang baru)
  // ============================================================
  window.handleCopy = (id, e) => {
    e.stopPropagation();
    const i = allData.find(x => x.id === id);
    if (!i) return;
    document.getElementById("docId").value        = "";          // Baru, bukan update
    document.getElementById("nama").value         = i.nama + "-";
    document.getElementById("hargaAgen").value    = 0;           // Isi manual
    document.getElementById("catatanUtama").value = i.catatanUtama || "";
    document.getElementById("catatanHarga").value = i.catatanHarga || "";
    document.getElementById("satuanBeli").value   = "pcs";
    document.getElementById("kategori").value     = i.kategori || "";
    openModal();
    showToast("Data disalin! Sesuaikan nama & harga.", "info");
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
      .then(() => {
        catatLog("history_stok", {
          nama      : item.nama,
          tipe      : "Hapus",
          keterangan: "Barang dihapus dari sistem"
        });
        showToast(`🗑️ ${item.nama} berhasil dihapus.`, "error");
      })
      .catch(err => showToast("Gagal hapus: " + err.message, "error"));
  };

  // ============================================================
  // SCANNER BARCODE
  // ============================================================
  let html5QrCode;

  window.mulaiScan = targetInputId => {
    const container = document.getElementById("reader-container");
    container.style.display = "flex";

    if (html5QrCode) html5QrCode.clear();

    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      decodedText => {
        const input = document.getElementById(targetInputId);
        if (input) {
          input.value = decodedText;
          input.dispatchEvent(new Event("input"));
        }
        stopScanner();
        showToast("Barcode terdeteksi: " + decodedText, "success");
      }
    ).catch(err => {
      showToast("Kamera error: " + err, "error");
      stopScanner();
    });
  };

  window.stopScanner = () => {
    const container = document.getElementById("reader-container");
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode.stop()
        .then(() => { html5QrCode.clear(); container.style.display = "none"; })
        .catch(() => { container.style.display = "none"; });
    } else {
      container.style.display = "none";
    }
  };

  // ============================================================
  // SIMPAN / UPDATE FORM BARANG
  // ============================================================
  form.addEventListener("submit", e => {
    e.preventDefault();

    const payload = {
      nama        : document.getElementById("nama").value.trim(),
      fotoUrl     : document.getElementById("fotoUrl").value.trim(),
      barcode     : document.getElementById("barcode").value.trim(),
      catatanUtama: document.getElementById("catatanUtama").value.trim(),
      catatanHarga: document.getElementById("catatanHarga").value.trim(),
      hargaAgen   : Number(document.getElementById("hargaAgen").value),
      satuanBeli  : document.getElementById("satuanBeli").value,
      kategori    : document.getElementById("kategori").value,
      stok        : 0
    };

    const docId = document.getElementById("docId").value;
    const op    = docId
      ? db.collection("barang").doc(docId).update(payload)
      : db.collection("barang").add(payload);

    op.then(() => {
      catatLog("history_stok", {
        nama      : payload.nama,
        tipe      : docId ? "Update" : "Barang Baru",
        keterangan: `Harga: ${payload.catatanUtama}(${payload.kategori})`
      });
      showToast(`💾 ${payload.nama} berhasil disimpan!`, "success");
      closeModal();
    })
    .catch(err => showToast("Gagal simpan: " + err.message, "error"));
  });

  // ============================================================
  // CATAT LOG
  // FIX: pakai auth.currentUser (konsisten), bukan firebase.auth().currentUser
  // ============================================================
  function catatLog(collectionName, data) {
    const user        = auth.currentUser;
    if (!user){console.war("⚠️ Gagal catat story: User tidak login")}
    const labelWarung = user ? user.email.split("@")[0] : "Umum";

    db.collection(collectionName).add({
      ...data,
      warung: labelWarung,
      waktu : firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.warn("catatLog error:", err.message));
  }

  // ============================================================
  // HAPUS DATA LAMA (> 2 minggu)
  // FIX: jalankan hanya sekali per sesi dengan flag historyCleanedOnce
  // ============================================================
  async function hapusDataLama() {
    if (historyCleanedOnce) return;
    historyCleanedOnce = true;

    const duaMingguLalu = new Date();
    duaMingguLalu.setDate(duaMingguLalu.getDate() - 14);

    const colls = ["history_belanja", "history_stok"];
    for (const c of colls) {
      const snap = await db.collection(c)
        .where("waktu", "<", duaMingguLalu)
        .get();
      snap.forEach(doc => doc.ref.delete());
    }
  }

  // ============================================================
  // LOAD HISTORY
  // ============================================================
  function loadHistory() {
    hapusDataLama(); // Aman karena sudah ada flag

    // Stream History Belanja
    db.collection("history_belanja")
      .orderBy("waktu", "desc")
      .limit(30)
      .onSnapshot(snap => {
        if (!snap.docs.length) {
          listHBelanja.innerHTML = `
            <div class="empty-state">
              <span class="empty-state-icon">🛒</span>
              Belum ada riwayat belanja.
            </div>`;
          return;
        }

        listHBelanja.innerHTML = snap.docs.map(doc => {
          const d           = doc.data();
          const waktuTampil = d.waktu
            ? d.waktu.toDate().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
            : "Baru saja...";

          return `
            <div class="history-card">
              <div class="history-info">
                <span class="history-tag tag-belanja">${escHtml(d.warung || "Warung")}</span>
                <strong>${escHtml(d.nama)}</strong>
                <small>${d.qty} ${escHtml(d.satuan || "")} • Total: ${rupiah(d.total)}</small>
              </div>
              <div class="history-date">${waktuTampil}</div>
            </div>`;
        }).join("");
      });

    // Stream History Update Stok
    db.collection("history_stok")
      .orderBy("waktu", "desc")
      .limit(30)
      .onSnapshot(snap => {
        if (!snap.docs.length) {
          listHUpdateData.innerHTML = `
            <div class="empty-state">
              <span class="empty-state-icon">📦</span>
              Belum ada riwayat update barang.
            </div>`;
          return;
        }

        listHUpdateData.innerHTML = snap.docs.map(doc => {
          const d        = doc.data();
          const tagClass = d.tipe === "Barang Baru" ? "tag-baru"
                         : d.tipe === "Hapus"       ? "tag-hapus"
                         : "tag-update";
          const tanggal  = d.waktu
            ? d.waktu.toDate().toLocaleDateString("id-ID")
            : "Baru saja";

          return `
            <div class="history-card">
              <div class="history-info">
                <span class="history-tag ${tagClass}">${escHtml(d.warung || "Admin")}</span>
                <strong>${escHtml(d.tipe)}: ${escHtml(d.nama)}</strong>
                <small>${escHtml(d.keterangan || "")}</small>
              </div>
              <div class="history-date">${tanggal}</div>
            </div>`;
        }).join("");
      });
  }

  // ============================================================
  // RENDER BELANJA
  // FIX: format arrow function filter dirapikan
  // ============================================================
  function renderBelanja() {
    const q        = searchBelanjaQ.toLowerCase();
    const filtered = allData.filter(i => {
      const matchSearch  = i.nama.toLowerCase().includes(q);
      const matchBarcode = i.barcode && i.barcode.includes(q);
      const matchKat     = !currentKategori || i.kategori === currentKategori;
      return (matchSearch || matchBarcode) && matchKat;
    });

    if (!filtered.length) {
      listBelanja.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🔍</span>
          Barang tidak ditemukan.
        </div>`;
      return;
    }

    listBelanja.innerHTML = filtered.map(i => {
      const imgHtml = i.fotoUrl
        ? `<div class="belanja-img"><img src="${i.fotoUrl}" loading="lazy" onerror="this.parentElement.innerHTML='📦'"></div>`
        : `<div class="belanja-img">📦</div>`;

      return `
        <div class="belanja-item">
          ${imgHtml}
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
        </div>`;
    }).join("");
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

    showToast(`${nama} ×${jumlah} masuk keranjang!`, "success");
  };

  // ============================================================
  // PERSIST KERANJANG (localStorage)
  // ============================================================
  function saveKeranjang() {
    localStorage.setItem("keranjangWarung", JSON.stringify(keranjang));
  }

  function loadKeranjang() {
    const data = localStorage.getItem("keranjangWarung");
    if (data) {
      try { keranjang = JSON.parse(data); } catch { keranjang = {}; }
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
      totalDiv.innerHTML     = "";
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
      </div>`).join("");

    const total = keys.reduce((s, n) => s + keranjang[n].qty * keranjang[n].harga, 0);
    totalDiv.innerHTML = `<strong>Total: ${rupiah(total)}</strong>`;
  }

  keranjangDiv.addEventListener("click", e => {
    if (e.target.classList.contains("hapus-btn")) {
      const nama = e.target.dataset.nama;
      delete keranjang[nama];
      saveKeranjang();
      renderKeranjang();
      updateBadge();
    }
  });

  // ============================================================
  // BERSIHKAN KERANJANG
  // ============================================================
  function bersihkanKeranjang() {
    keranjang = {};
    saveKeranjang();
    renderKeranjang();
    updateBadge();
  }

  // ============================================================
  // CETAK / BAGIKAN DAFTAR BELANJA
  // ============================================================
  document.getElementById("printBelanja").addEventListener("click", () => {
    const keys = Object.keys(keranjang);
    if (!keys.length) {
      showToast("Keranjang masih kosong!", "warning");
      return;
    }

    let text = "=== DAFTAR BELANJA ===\n";
    text    += "Tgl: " + new Date().toLocaleDateString("id-ID") + "\n\n";

    keys.forEach(n => {
      const item = keranjang[n];
      const subtotal = item.qty * item.harga;
      catatLog("history_belanja", {
        nama  : n,
        qty   : keranjang[n].qty,
        satuan: keranjang[n].satuan,
        total : keranjang[n].qty * keranjang[n].harga
      });
      text += `${n.toUpperCase()}\n`;
      text += `  x ${keranjang[n].qty} ${keranjang[n].satuan}\n\n`;
    });

    text += "----------------------\n";
    text += "  ( Warung Barokah )  \n\n";

    if (navigator.share) {
      navigator.share({ title: "Daftar Belanja", text })
        .then(() => {
          bersihkanKeranjang();
          showToast("Daftar berhasil dibagikan!", "success");
        })
        .catch(() => copyFallback(text));
    } else {
      copyFallback(text);
    }
  });

  function copyFallback(text) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast("Disalin! Buka RawBT lalu Paste.", "info");
        bersihkanKeranjang();
      })
      .catch(() => showToast("Gagal menyalin teks.", "error"));
  }

}); // end DOMContentLoaded
