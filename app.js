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
const db = firebase.firestore();
const auth = firebase.auth();

// ============================================================
// DOM READY
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // ============================================================
  // REFERENSI ELEMEN
  // ============================================================
  const loginPage = document.getElementById("loginPage");
  const btnLogin = document.getElementById("btnLogin");
  const loginError = document.getElementById("loginError");
  const appContainer = document.querySelector(".app");

  const form = document.getElementById("barangForm");
  const tabel = document.getElementById("tabelBarang");
  const searchInput = document.getElementById("search");
  const searchBelanja = document.getElementById("searchBelanja");
  const modalEl = document.getElementById("modal");
  const openModalBtn = document.getElementById("openModal");
  const closeModalBtn = document.getElementById("closeModal");
  const toggleBtn = document.getElementById("toggleDark");

  const pageGudang = document.getElementById("pageGudang");
  const pageBelanja = document.getElementById("pageBelanja");
  const pageHistory = document.getElementById("pageHistory");
  const pageKasir = document.getElementById("pageKasir");

  const listBelanja = document.getElementById("listBelanja");
  const keranjangDiv = document.getElementById("keranjangBelanja");
  const totalDiv = document.getElementById("totalBelanja");

  const menuGudang = document.getElementById("menuGudang");
  const menuBelanja = document.getElementById("menuBelanja");
  const menuHistory = document.getElementById("menuHistory");
  const menuKasir = document.getElementById("menuKasir");

  const fabBtn = document.getElementById("openModal");
  const btnScrollKeranjang = document.getElementById("btnScrollKeranjang");
  const clearSearch = document.getElementById("clearSearch");
  const clearSearchBelanja = document.getElementById("clearSearchBelanja");

  const tabBelanja = document.getElementById("tabBelanja");
  const tabUpdateData = document.getElementById("tabUpdateData");
  const listHBelanja = document.getElementById("listHistoryBelanja");
  const listHUpdateData = document.getElementById("listHistoryUpdateData");

  const daftarBarangKasir = document.getElementById("daftarBarangKasir");
  const listKeranjangKasir = document.getElementById("listKeranjangKasir");
  const totalKasir = document.getElementById("totalKasir");

  // ============================================================
  // STATE
  // ============================================================
  let allData = [];
  let keranjang = {};
  let keranjangKasir = {};

  let currentSearch = "";
  let searchBelanjaQ = "";
  let currentKategori = "";
  let activePage = "gudang";

  let latestPriceTrendMap = {};
  let historyCleanedOnce = false;
  let historyListenersAttached = false;

  let html5QrCode = null;
  let scannerRunning = false;

  const unsubscribers = {
    barang: null,
    priceTrend: null,
    historyBelanja: null,
    historyStok: null
  };

  // ============================================================
  // UTILITAS
  // ============================================================
  const rupiah = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(Number(n) || 0);

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

  function toLowerSafe(str = "") {
    return String(str).toLowerCase();
  }

  function debounce(fn, delay = 250) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  function getKategoriBadgeLabel(kategori = "") {
    if (!kategori) return "Item lain";
    if (kategori.includes("Minuman")) return "Minuman";
    if (kategori.includes("Snack")) return "Snack";
    if (kategori.includes("Rokok")) return "Rokok";
    if (kategori.includes("Sembako")) return "Sembako";
    return kategori;
  }

  function getPriceTrend(oldPrice, newPrice) {
    const oldVal = Number(oldPrice) || 0;
    const newVal = Number(newPrice) || 0;

    if (!oldVal || !newVal || oldVal === newVal) {
      return {
        status: "tetap",
        icon: "•",
        className: "trend-flat",
        text: "Harga tetap"
      };
    }

    if (newVal > oldVal) {
      return {
        status: "naik",
        icon: "▲",
        className: "trend-up",
        text: `Naik ${rupiah(newVal - oldVal)}`
      };
    }

    return {
      status: "turun",
      icon: "▼",
      className: "trend-down",
      text: `Turun ${rupiah(oldVal - newVal)}`
    };
  }

  function showToast(msg, type = "success", duration = 3000) {
    const container = document.getElementById("toastContainer");
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️"
    };

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ""}</span> ${escHtml(msg)}`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), duration);
  }

  function closeAllDetails() {
    document.querySelectorAll(".card-detail").forEach((d) => {
      d.style.display = "none";
    });
  }

  // ============================================================
  // AUTH
  // ============================================================
  auth.onAuthStateChanged((user) => {
    if (user) {
      loginPage.style.display = "none";
      appContainer.style.display = "flex";

      loadKeranjang();
      loadKeranjangKasir();
      startRealtimeListeners();

      showPage("gudang");
    } else {
      stopRealtimeListeners();
      loginPage.style.display = "flex";
      appContainer.style.display = "none";
    }
  });

  btnLogin.addEventListener("click", doLogin);
  document.getElementById("password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });

  function doLogin() {
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;

    loginError.textContent = "";

    if (!email || !pass) {
      loginError.textContent = "⚠️ Email dan password wajib diisi.";
      return;
    }

    btnLogin.textContent = "Memuat...";
    btnLogin.classList.add("loading");

    auth.signInWithEmailAndPassword(email, pass)
      .then(() => {
        showToast("Login berhasil", "success");
      })
      .catch((err) => {
        const msg =
          err.code === "auth/wrong-password" ? "Password salah." :
            err.code === "auth/user-not-found" ? "Email tidak terdaftar." :
              err.code === "auth/invalid-credential" ? "Email / password salah." :
                err.message;

        loginError.textContent = "❌ " + msg;
      })
      .finally(() => {
        btnLogin.textContent = "Masuk →";
        btnLogin.classList.remove("loading");
      });
  }

  document.getElementById("btnLogout").addEventListener("click", () => {
    if (confirm("Yakin ingin keluar?")) {
      auth.signOut().then(() => {
        window.location.reload();
      }).catch((error) => {
        console.error("Gagal Logout:", error);
      });
    }
  });

  // 1. Tambahkan variabel timer di luar (global)
  let renderTimer;
  let isLoading = true;

  // 2. Buat fungsi pembantu untuk menunda render
  function requestRender() {
    clearTimeout(renderTimer); // Batalkan antrean render sebelumnya
    renderTimer = setTimeout(() => {
      console.log("Melakukan render tunggal untuk semua perubahan data...");
      if (activePage === "gudang") renderTable();
      if (activePage === "belanja") renderBelanja();
      if (activePage === "kasir") renderKasir();
    }, 100); // Tunggu 100 milidetik (tidak terasa oleh manusia tapi cukup buat komputer)
  }

  function startRealtimeListeners() {
    isLoading = true;
    if (!unsubscribers.barang) {
      try {
        unsubscribers.barang = db.collection("barang")
          .orderBy("nama")
          .onSnapshot((snapshot) => {
            allData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            if (!snapshot.metadata.hasPendingWrites) {
              console.log("Data sinkron dengan server, menjalankan render...");
              updateStats();
            }

            isLoading = false;
            requestRender();
          }, (err) => {
            isLoading = false;
            console.error("Listener barang error:", err);
            showToast("Gagal memuat data barang.", "error");
            requestRender();
          });
      } catch (err) {
        isLoading = false;
        console.error("Gagal memulai listener barang:", err);
        requestRender();
      }
    }

    if (!unsubscribers.priceTrend) {
      try {
        unsubscribers.priceTrend = db.collection("history_stok")
          .orderBy("waktu", "desc")
          .limit(200)
          .onSnapshot((snapshot) => {
            const map = {};

            snapshot.docs.forEach((doc) => {
              const item = doc.data();
              if (!map[item.barangId] && item.priceTrend && item.barangId) {
                map[item.barangId] = item.priceTrend;
              }
            });

            latestPriceTrendMap = map;

            requestRender();
          }, (err) => {
            console.error("Listener trend harga error:", err);
          });
      } catch (err) {
        console.error("Gagal memulai listener trend harga:", err);
      }
    }
  }

  function stopRealtimeListeners() {
    Object.keys(unsubscribers).forEach((key) => {
      if (typeof unsubscribers[key] === "function") {
        unsubscribers[key]();
        unsubscribers[key] = null;
      }
    });

    historyListenersAttached = false;
  }

  // ============================================================
  // DARK MODE
  // ============================================================
  toggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    toggleBtn.querySelector(".tool-icon").textContent = isDark ? "☀️" : "🌙";
    toggleBtn.querySelector(".tool-label").textContent = isDark ? "Mode Terang" : "Mode Gelap";
  });

  // ============================================================
  // SEARCH
  // ============================================================
  function handleSearchInput(inputEl, onInput) {
    const wrapper = inputEl.closest(".search-ios-wrapper");
    const debounced = debounce(onInput, 250);

    inputEl.addEventListener("input", (e) => {
      wrapper.classList.toggle("has-value", e.target.value.length > 0);
      debounced(e.target.value);
    });
  }

  handleSearchInput(searchInput, (val) => {
    currentSearch = val;
    updateStats();
    if (activePage === "gudang") renderTable();
  });

  handleSearchInput(searchBelanja, (val) => {
    searchBelanjaQ = val;
    if (activePage === "belanja") renderBelanja();
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
  // ============================================================
  function syncFilterButtons(kategori) {
    document.querySelectorAll(".filter-btn[data-kategori]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.kategori === kategori);
    });
  }

  document.querySelectorAll(".filter-btn[data-kategori]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentKategori = btn.dataset.kategori;
      syncFilterButtons(currentKategori);
      updateStats();

      if (activePage === "gudang") renderTable();
      if (activePage === "belanja") renderBelanja();
    });
  });

  // ============================================================
  // NAVIGASI HALAMAN
  // ============================================================
  function showPage(active) {
    activePage = active;

    pageGudang.style.display = active === "gudang" ? "" : "none";
    pageBelanja.style.display = active === "belanja" ? "" : "none";
    pageHistory.style.display = active === "history" ? "" : "none";
    pageKasir.style.display = active === "kasir" ? "" : "none";

    menuGudang.classList.toggle("active", active === "gudang");
    menuBelanja.classList.toggle("active", active === "belanja");
    menuHistory.classList.toggle("active", active === "history");
    menuKasir.classList.toggle("active", active === "kasir");

    fabBtn.style.display = active === "gudang" ? "flex" : "none";
    btnScrollKeranjang.style.display = active === "belanja" ? "flex" : "none";

    closeAllDetails();

    if (active === "gudang") {
      updateStats();
      renderTable();
    }

    if (active === "belanja") {
      renderBelanja();
      renderKeranjang();
      updateBadge();
    }

    if (active === "history") {
      loadHistory();
    }

    if (active === "kasir") {
      renderKasir();
      renderDaftarKeranjangKasir();
    }
  }

  menuGudang.addEventListener("click", () => showPage("gudang"));
  menuBelanja.addEventListener("click", () => showPage("belanja"));
  menuHistory.addEventListener("click", () => showPage("history"));
  menuKasir.addEventListener("click", () => showPage("kasir"));

  btnScrollKeranjang.addEventListener("click", () => {
    keranjangDiv.scrollIntoView({ behavior: "smooth" });
  });

  // ============================================================
  // TAB HISTORY
  // ============================================================
  tabBelanja.addEventListener("click", () => {
    tabBelanja.classList.add("active");
    tabUpdateData.classList.remove("active");
    listHBelanja.style.display = "block";
    listHUpdateData.style.display = "none";
  });

  tabUpdateData.addEventListener("click", () => {
    tabUpdateData.classList.add("active");
    tabBelanja.classList.remove("active");
    listHUpdateData.style.display = "block";
    listHBelanja.style.display = "none";
  });

  // ============================================================
  // MODAL
  // ============================================================
  function openModal() {
    modalEl.classList.add("active");
  }

  function closeModal() {
    modalEl.classList.remove("active");
    form.reset();
    document.getElementById("docId").value = "";
    if (typeof window.stopScanner === "function") window.stopScanner();
  }

  openModalBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);

  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) closeModal();
  });

  // ============================================================
  // UPDATE STATS
  // ============================================================
  function updateStats() {
    const totalEl = document.getElementById("statTotal");
    const kategoriEl = document.getElementById("statKategori");
    const filteredEl = document.getElementById("statFiltered");

    if (!totalEl || !kategoriEl || !filteredEl) return;

    const kategoriUnik = new Set(allData.map((i) => i.kategori).filter(Boolean));
    totalEl.textContent = allData.length;
    kategoriEl.textContent = kategoriUnik.size;

    const kw = toLowerSafe(currentSearch);
    const filtered = allData.filter((i) => {
      const nama = toLowerSafe(i.nama);
      const barcode = String(i.barcode || "");
      const matchSearch = nama.includes(kw) || barcode.includes(kw);
      const matchKategori = !currentKategori || i.kategori === currentKategori;
      return matchSearch && matchKategori;
    });

    filteredEl.textContent = filtered.length;
  }

  // ============================================================
  // FILTER HELPER
  // ============================================================
  function getFilteredBarangGudang() {
    const keyword = toLowerSafe(currentSearch);

    return allData.filter((item) => {
      const matchSearch = toLowerSafe(item.nama).includes(keyword);
      const matchBarcode = String(item.barcode || "").includes(keyword);
      const matchKategori = !currentKategori || item.kategori === currentKategori;
      return (matchSearch || matchBarcode) && matchKategori;
    });
  }

  function getFilteredBarangBelanja() {
    const keyword = toLowerSafe(searchBelanjaQ);

    return allData.filter((item) => {
      const matchSearch = toLowerSafe(item.nama).includes(keyword);
      const matchBarcode = String(item.barcode || "").includes(keyword);
      const matchKategori = !currentKategori || item.kategori === currentKategori;
      return (matchSearch || matchBarcode) && matchKategori;
    });
  }

  // ============================================================
  // RENDER GUDANG
  // ============================================================
  function renderTable() {
    if (isLoading) {
      tabel.innerHTML = `
        <div class="skeleton-container">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>`;
      return;
    }

    const filtered = getFilteredBarangGudang();

    const filteredEl = document.getElementById("statFiltered");
    if (filteredEl) filteredEl.textContent = filtered.length;

    if (!filtered.length) {
      tabel.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">😕</span>
          Barang tidak ditemukan.
        </div>
      `;
      return;
    }

    tabel.innerHTML = filtered.map((item, index) => {
      const imgHtml = item.fotoUrl
        ? `
          <div class="prod-img-wrapper">
            <img
              src="${escHtml(item.fotoUrl)}"
              class="prod-img"
              loading="lazy"
              onerror="this.parentElement.innerHTML='📦'"
            >
          </div>
        `
        : `<div class="prod-img-wrapper">📦</div>`;

      const trend = latestPriceTrendMap[item.id];
      const trendHtml = trend && trend.status !== "tetap"
        ? `<span class="price-trend-inline ${escHtml(trend.className)}" title="${escHtml(trend.text)}">${escHtml(trend.icon)}</span>`
        : "";

      return `
        <div
          class="product-card"
          style="animation-delay:${index * 0.03}s"
          onclick="toggleDetail(this)"
        >
          <div class="card-main">
            ${imgHtml}
            <div class="card-left">
              <div class="prod-name-row">
                <div class="prod-name">${escHtml(item.nama)}</div>
                ${trendHtml}
              </div>
              <span class="badge" data-cat="${escHtml(getKategoriBadgeLabel(item.kategori || ""))}">
                ${escHtml(item.kategori || "Lainnya")}
              </span>
            </div>
            <div class="card-right">
              <div class="prod-price">${escHtml(item.catatanUtama || "Cek Detail")}</div>
              <div class="prod-hint">Klik untuk detail ▾</div>
            </div>
          </div>

          <div class="card-detail">
            <hr class="detail-divider">

            <div class="detail-content">
              <div class="detail-label">Rincian Harga</div>
              <div class="detail-text">${escHtml(item.catatanHarga || "–")}</div>
            </div>

            <div class="detail-content price-detail-box">
              <div class="detail-label">Harga Agen</div>
              <div class="detail-text">${rupiah(item.hargaAgen)} / ${escHtml(item.satuanBeli || "pcs")}</div>
            </div>

            <div class="detail-content price-detail-box">
              <div class="detail-label">Harga Jual Eceran</div>
              <div class="detail-text">${rupiah(item.hargaEceran || 0)}</div>
            </div>

            <div class="card-actions">
              <button class="edit-btn" onclick="handleEdit('${item.id}', event)">✏️ Edit</button>
              <button class="copy-btn" onclick="handleCopy('${item.id}', event)">📋 Salin</button>
              <button class="delete-btn" onclick="handleDelete('${item.id}', event)">🗑️ Hapus</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // ============================================================
  // TOGGLE DETAIL
  // ============================================================
  window.toggleDetail = (card) => {
    const detail = card.querySelector(".card-detail");
    const isVisible = detail.style.display === "block";

    closeAllDetails();

    if (!isVisible) {
      detail.style.display = "block";
    }
  };

  // ============================================================
  // EDIT BARANG
  // ============================================================
  window.handleEdit = (id, e) => {
    e.stopPropagation();

    const item = allData.find((x) => x.id === id);
    if (!item) return;

    document.getElementById("docId").value = item.id;
    document.getElementById("nama").value = item.nama || "";
    document.getElementById("hargaAgen").value = item.hargaAgen || 0;
    document.getElementById("HargaJualEceran").value = item.hargaEceran || 0;
    document.getElementById("isiSatuan").value = item.isiSatuan || item.isiPerSatuan || 1;
    document.getElementById("catatanUtama").value = item.catatanUtama || "";
    document.getElementById("catatanHarga").value = item.catatanHarga || "";
    document.getElementById("satuanBeli").value = item.satuanBeli || "";
    document.getElementById("kategori").value = item.kategori || "";
    document.getElementById("fotoUrl").value = item.fotoUrl || "";
    document.getElementById("barcode").value = item.barcode || "";

    openModal();
  };

  // ============================================================
  // COPY BARANG
  // ============================================================
  window.handleCopy = (id, e) => {
    e.stopPropagation();

    const item = allData.find((x) => x.id === id);
    if (!item) return;

    document.getElementById("docId").value = "";
    document.getElementById("nama").value = (item.nama || "") + " -";
    document.getElementById("hargaAgen").value = item.hargaAgen || 0;
    document.getElementById("HargaJualEceran").value = item.hargaEceran || 0;
    document.getElementById("isiSatuan").value = item.isiSatuan || item.isiPerSatuan || 1;
    document.getElementById("catatanUtama").value = item.catatanUtama || "";
    document.getElementById("catatanHarga").value = item.catatanHarga || "";
    document.getElementById("satuanBeli").value = item.satuanBeli || "pcs";
    document.getElementById("kategori").value = item.kategori || "";
    document.getElementById("fotoUrl").value = item.fotoUrl || "";
    document.getElementById("barcode").value = "";

    openModal();
    showToast("Data disalin, silakan ubah nama / harga bila perlu.", "info");
  };

  // ============================================================
  // HAPUS BARANG
  // ============================================================
  window.handleDelete = async (id, e) => {
    e.stopPropagation();

    const item = allData.find((x) => x.id === id);
    if (!item) return;

    if (!confirm(`Hapus "${item.nama}"?`)) return;

    try {
      await db.collection("barang").doc(id).delete();

      await catatLog("history_stok", {
        barangId: id,
        nama: item.nama,
        tipe: "Hapus",
        kategori: item.kategori || "",
        hargaLama: item.hargaAgen || 0,
        hargaBaru: 0,
        keterangan: "Barang dihapus dari sistem",
        priceTrend: {
          status: "hapus",
          icon: "🗑️",
          className: "trend-delete",
          text: "Data dihapus"
        }
      });

      showToast(`🗑️ ${item.nama} berhasil dihapus.`, "error");
    } catch (err) {
      showToast("Gagal hapus: " + err.message, "error");
    }
  };

  // ============================================================
  // SCANNER BARCODE
  // ============================================================
  window.mulaiScan = async (targetInputId) => {
    const container = document.getElementById("reader-container");
    container.style.display = "flex";

    try {
      if (scannerRunning && html5QrCode) {
        await window.stopScanner();
      }

      html5QrCode = new Html5Qrcode("reader");

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          const input = document.getElementById(targetInputId);
          if (input) {
            input.value = decodedText;
            input.dispatchEvent(new Event("input"));
          }

          showToast("Barcode terdeteksi: " + decodedText, "success");
          await window.stopScanner();
        }
      );

      scannerRunning = true;
    } catch (err) {
      console.error("Scanner error:", err);
      showToast("Kamera error: " + err, "error");
      await window.stopScanner();
    }
  };

  window.stopScanner = async () => {
    const container = document.getElementById("reader-container");

    try {
      if (html5QrCode && scannerRunning) {
        await html5QrCode.stop();
        await html5QrCode.clear();
      }
    } catch (err) {
      console.warn("Stop scanner warning:", err);
    } finally {
      html5QrCode = null;
      scannerRunning = false;
      container.style.display = "none";
    }
  };

  // ============================================================
  // SIMPAN / UPDATE BARANG
  // ============================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const docId = document.getElementById("docId").value.trim();
    const existing = docId ? allData.find((item) => item.id === docId) : null;

    const nama = document.getElementById("nama").value.trim();
    const fotoUrl = document.getElementById("fotoUrl").value.trim();
    const barcode = document.getElementById("barcode").value.trim();
    const catatanUtama = document.getElementById("catatanUtama").value.trim();
    const catatanHarga = document.getElementById("catatanHarga").value.trim();
    const hargaAgen = Number(document.getElementById("hargaAgen").value) || 0;
    const hargaEceran = Number(document.getElementById("HargaJualEceran").value) || 0;
    const isiSatuan = Math.max(1, Number(document.getElementById("isiSatuan").value) || 1);
    const satuanBeli = document.getElementById("satuanBeli").value;
    const kategori = document.getElementById("kategori").value;

    if (!nama || !hargaAgen || !catatanUtama || !satuanBeli || !kategori) {
      showToast("Mohon lengkapi data wajib.", "warning");
      return;
    }

    const modalEceran = Math.round(hargaAgen / isiSatuan);

    const payload = {
      nama,
      fotoUrl,
      barcode,
      catatanUtama,
      catatanHarga,
      hargaAgen,
      hargaEceran,
      isiSatuan,
      isiPerSatuan: isiSatuan,
      modalEceran,
      satuanBeli,
      kategori,
      stok: existing?.stok ?? 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const oldPrice = Number(existing?.hargaAgen || 0);
    const newPrice = Number(payload.hargaAgen || 0);
    const trend = getPriceTrend(oldPrice, newPrice);

    try {
      let barangId = docId;

      if (docId) {
        await db.collection("barang").doc(docId).update(payload);
      } else {
        const ref = await db.collection("barang").add({
          ...payload,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        barangId = ref.id;
      }

      await catatLog("history_stok", {
        barangId,
        nama: payload.nama,
        tipe: docId ? "Update" : "Barang Baru",
        keterangan: docId
          ? `${rupiah(oldPrice)} → ${rupiah(newPrice)} • ${payload.catatanUtama}`
          : `Harga awal ${rupiah(newPrice)} • ${payload.kategori}`,
        kategori: payload.kategori,
        hargaLama: oldPrice,
        hargaBaru: newPrice,
        priceTrend: docId
          ? trend
          : {
            status: "baru",
            icon: "✦",
            className: "trend-new",
            text: "Barang baru"
          }
      });

      showToast(`💾 ${payload.nama} berhasil disimpan!`, "success");
      closeModal();
    } catch (err) {
      console.error(err);
      showToast("Gagal simpan: " + err.message, "error");
    }
  });

  // ============================================================
  // CATAT LOG
  // ============================================================
  function catatLog(collectionName, data) {
    const user = auth.currentUser;
    const labelWarung = user ? user.email.split("@")[0] : "Umum";

    return db.collection(collectionName).add({
      ...data,
      warung: labelWarung,
      waktu: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  // ============================================================
  // HAPUS DATA LAMA
  // ============================================================
  async function hapusDataLama() {
    if (historyCleanedOnce) return;
    historyCleanedOnce = true;

    const duaMingguLalu = new Date();
    duaMingguLalu.setDate(duaMingguLalu.getDate() - 14);

    const collections = ["history_belanja", "history_stok"];

    try {
      for (const name of collections) {
        const snap = await db.collection(name)
          .where("waktu", "<", duaMingguLalu)
          .get();

        const batch = db.batch();
        snap.forEach((doc) => batch.delete(doc.ref));

        if (!snap.empty) {
          await batch.commit();
        }
      }
    } catch (err) {
      console.error("Gagal hapus data lama:", err);
    }
  }

  // ============================================================
  // HISTORY
  // ============================================================
  function loadHistory() {
    hapusDataLama().catch((err) => {
      console.warn("Cleanup history gagal:", err.message);
    });

    if (historyListenersAttached) return;
    historyListenersAttached = true;

    try {
      unsubscribers.historyBelanja = db.collection("history_belanja")
        .orderBy("waktu", "desc")
        .limit(30)
        .onSnapshot((snapshot) => {
          if (!snapshot.docs.length) {
            listHBelanja.innerHTML = `
            <div class="empty-state">
              <span class="empty-state-icon">🛒</span>
              Belum ada riwayat belanja.
            </div>
          `;
            return;
          }

          listHBelanja.innerHTML = snapshot.docs.map((doc) => {
            const data = doc.data();
            const waktuTampil = data.waktu
              ? data.waktu.toDate().toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
              : "Baru saja";

            return `
            <div class="history-card">
              <div class="history-info">
                <span class="history-tag tag-belanja">${escHtml(data.warung || "Warung")}</span>
                <strong>${escHtml(data.nama || "")}</strong>
                <small>${escHtml(String(data.qty || 0))} ${escHtml(data.satuan || "")} • Total: ${rupiah(data.total)}</small>
              </div>
              <div class="history-date">${waktuTampil}</div>
            </div>
          `;
          }).join("");
        }, (err) => {
          console.error("History belanja error:", err);
          listHBelanja.innerHTML = `<div class="empty-state">Gagal memuat data.</div>`;
        });
    } catch (err) {
      console.error("Gagal memulai listener history belanja:", err);
    }

    try {
      unsubscribers.historyStok = db.collection("history_stok")
        .orderBy("waktu", "desc")
        .limit(30)
        .onSnapshot((snapshot) => {
          if (!snapshot.docs.length) {
            listHUpdateData.innerHTML = `
            <div class="empty-state">
              <span class="empty-state-icon">📦</span>
              Belum ada riwayat update barang.
            </div>
          `;
            return;
          }

          listHUpdateData.innerHTML = snapshot.docs.map((doc) => {
            const data = doc.data();

            const tagClass = data.tipe === "Barang Baru"
              ? "tag-baru"
              : data.tipe === "Hapus"
                ? "tag-hapus"
                : "tag-update";

            const tanggal = data.waktu
              ? data.waktu.toDate().toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short"
              })
              : "Baru saja";

            const trend = data.priceTrend || {
              status: "tetap",
              icon: "•",
              className: "trend-flat",
              text: "Harga tetap"
            };

            const priceBlock = data.tipe === "Update"
              ? `
              <div class="history-price-box">
                <div class="history-price-row">
                  <span class="price-old">${rupiah(data.hargaLama)}</span>
                  <span class="price-arrow">→</span>
                  <span class="price-new">${rupiah(data.hargaBaru)}</span>
                </div>
                <div class="history-trend ${escHtml(trend.className)}">
                  <span class="trend-icon">${escHtml(trend.icon)}</span>
                  <span>${escHtml(trend.text)}</span>
                </div>
              </div>
            `
              : data.tipe === "Barang Baru"
                ? `<div class="history-trend trend-new"><span class="trend-icon">✦</span><span>Harga awal ${rupiah(data.hargaBaru)}</span></div>`
                : `<div class="history-trend trend-delete"><span class="trend-icon">🗑️</span><span>Data dihapus</span></div>`;

            return `
            <div class="history-card history-card-update">
              <div class="history-info history-info-update">
                <div class="history-top-row">
                  <span class="history-tag ${tagClass}">${escHtml(data.warung || "Admin")}</span>
                  <span class="history-item-type">${escHtml(data.tipe || "")}</span>
                </div>

                <strong class="history-title-row">
                  <span>${escHtml(data.nama || "")}</span>
                  ${data.tipe === "Update" ? `<span class="history-title-trend ${escHtml(trend.className)}">${escHtml(trend.icon)}</span>` : ""}
                </strong>

                <small>${escHtml(data.keterangan || "")}</small>
                ${priceBlock}
              </div>

              <div class="history-date">${tanggal}</div>
            </div>
          `;
          }).join("");
        }, (err) => {
          console.error("History stok error:", err);
          listHUpdateData.innerHTML = `<div class="empty-state">Gagal memuat data.</div>`;
        });
    } catch (err) {
      console.error("Gagal memulai listener history stok:", err);
    }
  }

  // ============================================================
  // BELANJA
  // ============================================================
  function renderBelanja() {
    if (isLoading) {
      listBelanja.innerHTML = `
        <div class="skeleton-container">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>`;
      return;
    }

    const filtered = getFilteredBarangBelanja();

    if (!filtered.length) {
      listBelanja.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🔍</span>
          Barang tidak ditemukan.
        </div>
      `;
      return;
    }

    listBelanja.innerHTML = filtered.map((item) => {
      const imgHtml = item.fotoUrl
        ? `<div class="belanja-img"><img src="${escHtml(item.fotoUrl)}" loading="lazy" onerror="this.parentElement.innerHTML='📦'"></div>`
        : `<div class="belanja-img">📦</div>`;

      return `
        <div class="belanja-item">
          ${imgHtml}
          <div class="belanja-info">
            <div class="belanja-nama">${escHtml(item.nama)}</div>
            <div class="belanja-harga">${rupiah(item.hargaAgen)} / ${escHtml(item.satuanBeli || "pcs")}</div>
          </div>
          <div class="belanja-action">
            <input class="qty-input" type="number" id="qty-${item.id}" value="1" min="1">
            <button
              class="tambah-btn"
              onclick="tambahKeKeranjang('${item.id}', '${escapeSingleQuote(item.nama)}', ${Number(item.hargaAgen) || 0}, '${escapeSingleQuote(item.satuanBeli || "pcs")}', '${escapeSingleQuote(item.kategori || "Lain-lain")}')"
            >
              ➕
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  window.tambahKeKeranjang = (id, nama, harga, satuan, kategori) => {
    const qtyEl = document.getElementById(`qty-${id}`);
    const jumlah = Math.max(1, parseInt(qtyEl?.value, 10) || 1);

    if (keranjang[nama]) {
      keranjang[nama].qty += jumlah;
    } else {
      keranjang[nama] = {
        id,
        qty: jumlah,
        harga: Number(harga) || 0,
        satuan: satuan || "pcs",
        kategori: kategori || "Lain-lain"
      };
    }

    saveKeranjang();
    renderKeranjang();
    updateBadge();

    if (qtyEl) qtyEl.value = 1;

    showToast(`${nama} ×${jumlah} masuk keranjang!`, "success");
  };

  function saveKeranjang() {
    localStorage.setItem("keranjangWarung", JSON.stringify(keranjang));
  }

  function loadKeranjang() {
    const data = localStorage.getItem("keranjangWarung");

    if (data) {
      try {
        keranjang = JSON.parse(data) || {};
      } catch {
        keranjang = {};
      }
    } else {
      keranjang = {};
    }

    renderKeranjang();
    updateBadge();
  }

  function updateBadge() {
    const count = Object.keys(keranjang).length;

    if (count > 0) {
      btnScrollKeranjang.setAttribute("data-count", count);
    } else {
      btnScrollKeranjang.removeAttribute("data-count");
    }
  }

  function renderKeranjang() {
    const keys = Object.keys(keranjang);

    if (!keys.length) {
      keranjangDiv.innerHTML = `<p class="empty-cart">🧺 Keranjang masih kosong.</p>`;
      totalDiv.innerHTML = "";
      return;
    }

    keranjangDiv.innerHTML = keys.map((nama) => `
      <div class="keranjang-item">
        <div class="keranjang-info">
          <div class="keranjang-nama">${escHtml(nama)}</div>
          <div class="keranjang-qty">
            ${escHtml(String(keranjang[nama].qty))} ${escHtml(keranjang[nama].satuan)}
            × ${rupiah(keranjang[nama].harga)}
          </div>
        </div>
        <button class="hapus-btn" data-nama="${escHtml(nama)}">✕</button>
      </div>
    `).join("");

    const total = keys.reduce((sum, nama) => {
      return sum + (Number(keranjang[nama].qty) || 0) * (Number(keranjang[nama].harga) || 0);
    }, 0);

    totalDiv.innerHTML = `<strong>Total: ${rupiah(total)}</strong>`;
  }

  keranjangDiv.addEventListener("click", (e) => {
    if (e.target.classList.contains("hapus-btn")) {
      const nama = e.target.dataset.nama;
      delete keranjang[nama];
      saveKeranjang();
      renderKeranjang();
      updateBadge();
    }
  });

  function bersihkanKeranjang() {
    keranjang = {};
    saveKeranjang();
    renderKeranjang();
    updateBadge();
  }

  document.getElementById("printBelanja").addEventListener("click", async () => {
    const keys = Object.keys(keranjang);

    if (!keys.length) {
      showToast("Keranjang masih kosong!", "warning");
      return;
    }

    const grupKategori = {};

    keys.forEach((nama) => {
      const item = keranjang[nama];
      const kategori = item.kategori || "Lain-lain";

      if (!grupKategori[kategori]) grupKategori[kategori] = [];
      grupKategori[kategori].push({ nama, ...item });
    });

    try {
      await Promise.all(
        keys.map((nama) => {
          const item = keranjang[nama];
          return catatLog("history_belanja", {
            nama,
            qty: item.qty,
            satuan: item.satuan,
            total: (Number(item.qty) || 0) * (Number(item.harga) || 0),
            kategori: item.kategori || "Lain-lain"
          });
        })
      );
    } catch (err) {
      showToast("Sebagian riwayat gagal disimpan: " + err.message, "warning");
    }

    let text = "=== DAFTAR BELANJA ===\n";
    text += "Tgl: " + new Date().toLocaleDateString("id-ID") + "\n\n";

    Object.keys(grupKategori).forEach((kategori) => {
      text += `--- ${kategori.toUpperCase()} ---\n`;
      grupKategori[kategori].forEach((item) => {
        text += `${item.nama.toUpperCase()}\n`;
        text += `  x ${item.qty} ${item.satuan}\n\n`;
      });
    });

    text += "----------------------\n";
    text += "  ( Warung Barokah )  \n\n";

    if (navigator.share) {
      navigator.share({ title: "Daftar Belanja", text })
        .then(() => {
          showToast("Daftar berhasil dibagikan!", "success");
          bersihkanKeranjang();
        })
        .catch(() => {
          copyFallback(text);
        });
    } else {
      copyFallback(text);
    }
  });

  function copyFallback(text) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast("Disalin! Buka RawBT lalu paste.", "info");
        bersihkanKeranjang();
      })
      .catch(() => {
        showToast("Gagal menyalin teks.", "error");
      });
  }

  // ============================================================
  // KASIR
  // ============================================================
  function renderKasir() {
    if (isLoading) {
      daftarBarangKasir.innerHTML = `
        <div class="skeleton-container">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>`;
      return;
    }

    if (!allData.length) {
      daftarBarangKasir.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">💰</span>
          Belum ada barang untuk kasir.
        </div>
      `;
      return;
    }

    daftarBarangKasir.innerHTML = allData.map((item) => {
      const imgHtml = item.fotoUrl
        ? `<div class="belanja-img"><img src="${escHtml(item.fotoUrl)}" loading="lazy" onerror="this.parentElement.innerHTML='📦'"></div>`
        : `<div class="belanja-img">📦</div>`;

      return `
        <div class="belanja-item">
          ${imgHtml}
          <div class="belanja-info">
            <div class="belanja-nama">${escHtml(item.nama)}</div>
            <div class="belanja-harga">Jual: ${rupiah(item.hargaEceran || 0)}</div>
          </div>
          <div class="belanja-action">
            <button class="tambah-btn" onclick="tambahKeKeranjangKasir('${item.id}')">➕</button>
          </div>
        </div>
      `;
    }).join("");
  }

  window.tambahKeKeranjangKasir = (id) => {
    const item = allData.find((brg) => brg.id === id);
    if (!item) return;

    if (keranjangKasir[id]) {
      keranjangKasir[id].qty += 1;
    } else {
      keranjangKasir[id] = {
        id,
        nama: item.nama,
        hargaJual: Number(item.hargaEceran) || 0,
        modal: Number(item.modalEceran) || 0,
        qty: 1,
        satuan: item.satuanBeli || "pcs"
      };
    }

    saveKeranjangKasir();
    renderDaftarKeranjangKasir();
    showToast(`${item.nama} masuk keranjang kasir`, "success");
  };

  window.ubahQtyKasir = (id, delta) => {
    if (!keranjangKasir[id]) return;

    keranjangKasir[id].qty += delta;

    if (keranjangKasir[id].qty <= 0) {
      delete keranjangKasir[id];
    }

    saveKeranjangKasir();
    renderDaftarKeranjangKasir();
  };

  function saveKeranjangKasir() {
    localStorage.setItem("penyimpanan_Kasir", JSON.stringify(keranjangKasir));
  }

  function loadKeranjangKasir() {
    const data = localStorage.getItem("penyimpanan_Kasir");

    if (data) {
      try {
        keranjangKasir = JSON.parse(data) || {};
      } catch {
        keranjangKasir = {};
      }
    } else {
      keranjangKasir = {};
    }

    renderDaftarKeranjangKasir();
  }

  function bersihkanKeranjangKasir() {
    keranjangKasir = {};
    saveKeranjangKasir();
    renderDaftarKeranjangKasir();
  }

  function renderDaftarKeranjangKasir() {
    const items = Object.values(keranjangKasir);

    if (!items.length) {
      listKeranjangKasir.innerHTML = `<p class="empty-cart">🛒 Keranjang kasir masih kosong.</p>`;
      totalKasir.textContent = "Total: Rp 0";
      return;
    }

    listKeranjangKasir.innerHTML = items.map((item) => {
      const subtotal = (Number(item.hargaJual) || 0) * (Number(item.qty) || 0);

      return `
        <div class="keranjang-item">
          <div class="keranjang-info">
            <div class="keranjang-nama">${escHtml(item.nama)}</div>
            <div class="keranjang-qty">${item.qty} × ${rupiah(item.hargaJual)} = ${rupiah(subtotal)}</div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="hapus-btn" onclick="ubahQtyKasir('${item.id}', -1)">-</button>
            <button class="hapus-btn" onclick="ubahQtyKasir('${item.id}', 1)">+</button>
            <button class="hapus-btn" onclick="hapusItemKasir('${item.id}')">✕</button>
          </div>
        </div>
      `;
    }).join("");

    const total = items.reduce((sum, item) => {
      return sum + (Number(item.hargaJual) || 0) * (Number(item.qty) || 0);
    }, 0);

    totalKasir.textContent = `Total: ${rupiah(total)}`;
  }

  window.hapusItemKasir = (id) => {
    if (!keranjangKasir[id]) return;
    delete keranjangKasir[id];
    saveKeranjangKasir();
    renderDaftarKeranjangKasir();
  };

  window.prosesTransaksi = async () => {
    const items = Object.values(keranjangKasir);

    if (!items.length) {
      showToast("Keranjang kasir masih kosong.", "warning");
      return;
    }

    const total = items.reduce((sum, item) => {
      return sum + (Number(item.hargaJual) || 0) * (Number(item.qty) || 0);
    }, 0);

    const totalModal = items.reduce((sum, item) => {
      return sum + (Number(item.modal) || 0) * (Number(item.qty) || 0);
    }, 0);

    const totalLaba = total - totalModal;

    try {
      const batch = db.batch();
      const penjualanRef = db.collection("history_penjualan").doc();

      batch.set(penjualanRef, {
        items,
        total,
        totalModal,
        totalLaba,
        kasir: auth.currentUser ? auth.currentUser.email : "unknown",
        waktu: firebase.firestore.FieldValue.serverTimestamp()
      });

      items.forEach((item) => {
        const barang = allData.find((b) => b.id === item.id);
        if (!barang) return;

        const stokSekarang = Number(barang.stok) || 0;
        const stokBaru = Math.max(0, stokSekarang - (Number(item.qty) || 0));

        batch.update(db.collection("barang").doc(item.id), {
          stok: stokBaru,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();

      showToast(`Transaksi berhasil • Total ${rupiah(total)}`, "success");
      bersihkanKeranjangKasir();
    } catch (err) {
      console.error(err);
      showToast("Gagal proses transaksi: " + err.message, "error");
    }
  };
}); // end DOMContentLoaded