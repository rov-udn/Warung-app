// CONFIG FIREBASE
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

  /* ── Referensi elemen ── */
  const form         = document.getElementById("barangForm");
  const tabel        = document.getElementById("tabelBarang");
  const searchInput  = document.getElementById("search");
  const modal        = document.getElementById("modal");
  const openModalBtn = document.getElementById("openModal");
  const closeModalBtn= document.getElementById("closeModal");
  const toggleBtn    = document.getElementById("toggleDark");
  const filterButtons= document.querySelectorAll(".filter-btn");

  /* ── State Global ── */
  let allData = [];
  let currentKategori = "";
  let currentSearch = "";

  /* ── Modal Control ── */
  function openModal() {
    modal.classList.add("active");
  }

  function closeModal() {
    modal.classList.remove("active");
  }

  /* ── Format Rupiah ── */
  function formatRupiah(angka) {
    return new Intl.NumberFormat("id-ID").format(angka);
  }

  /* ── Render Table ── */
  function renderTable() {
    tabel.innerHTML = "";

    const filtered = allData.filter(item => {
      const cocokKategori = currentKategori
        ? item.kategori === currentKategori
        : true;

      const cocokSearch = item.nama
        .toLowerCase()
        .includes(currentSearch);

      return cocokKategori && cocokSearch;
    });

    if (filtered.length === 0) {
      tabel.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;color:#aaa;padding:20px;">
            Tidak ada barang ditemukan
          </td>
        </tr>`;
      return;
    }

    filtered.forEach(data => {
      tabel.innerHTML += `
        <tr>
          <td>${data.nama}</td>
          <td>Rp ${formatRupiah(data.harga)}</td>
          <td>${data.stok}</td>
          <td>${data.kategori}</td>
          <td>${data.satuan}</td>
          <td>
            <button class="edit-btn" data-id="${data.id}">✏️ Edit</button>
            <button class="delete-btn" data-id="${data.id}">🗑️ Hapus</button>
          </td>
        </tr>`;
    });
  }

  /* ── Firestore Listener (1x saja) ── */
  db.collection("barang").onSnapshot(snapshot => {
    allData = [];
    snapshot.forEach(doc => {
      allData.push({ id: doc.id, ...doc.data() });
    });
    renderTable();
  });

  /* ── Filter Kategori ── */
  filterButtons.forEach(btn => {
    btn.addEventListener("click", function () {

      filterButtons.forEach(b => b.classList.remove("active"));
      this.classList.add("active");

      currentKategori = this.dataset.kategori;
      renderTable();
    });
  });

  /* ── Search ── */
  searchInput.addEventListener("input", function () {
    currentSearch = this.value.toLowerCase();
    renderTable();
  });

  /* ── Edit & Delete ── */
  tabel.addEventListener("click", function (e) {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("edit-btn")) {
      const item = allData.find(i => i.id === id);
      if (!item) return;

      document.getElementById("docId").value    = item.id;
      document.getElementById("nama").value     = item.nama;
      document.getElementById("harga").value    = item.harga;
      document.getElementById("stok").value     = item.stok;
      document.getElementById("kategori").value = item.kategori;
      document.getElementById("satuan").value   = item.satuan;

      openModal();
    }

    if (e.target.classList.contains("delete-btn")) {
      if (confirm("Yakin ingin menghapus barang ini?")) {
        db.collection("barang").doc(id).delete();
      }
    }
  });

  /* ── Submit Form ── */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const docId    = document.getElementById("docId").value;
    const nama     = document.getElementById("nama").value.trim();
    const harga    = Number(document.getElementById("harga").value);
    const stok     = Number(document.getElementById("stok").value) || 0;
    const kategori = document.getElementById("kategori").value;
    const satuan   = document.getElementById("satuan").value;

    const payload = { nama, harga, stok, kategori, satuan };

    if (docId) {
      db.collection("barang").doc(docId).update(payload);
    } else {
      db.collection("barang").add(payload);
    }

    form.reset();
    document.getElementById("docId").value = "";
    closeModal();
  });

  /* ── Dark Mode ── */
  toggleBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark");
    this.textContent = document.body.classList.contains("dark")
      ? "☀️ Mode Terang"
      : "🌙 Mode Gelap";
  });

  /* ── Modal Control Events ── */
  openModalBtn.addEventListener("click", function () {
    form.reset();
    document.getElementById("docId").value = "";
    openModal();
  });

  closeModalBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });

});