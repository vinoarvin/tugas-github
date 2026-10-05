/* ===== DATA PENGGUNA ===== */
const USERS = [
  { username: "wali.kelas", password: "Wali@2026", role: "wali",  name: "Bu Ratna (Wali Kelas)" },
  { username: "guru.mapel", password: "Guru@2026", role: "guru",  name: "Pak Dimas (Guru Mapel)" },
  { username: "andi",  password: "Andi@2026",  role: "siswa", name: "Andi Pratama" },
  { username: "bela",  password: "Bela@2026",  role: "siswa", name: "Bela Safitri" },
  { username: "citra", password: "Citra@2026", role: "siswa", name: "Citra Lestariu" },
  { username: "ci", password: "Ci@2026", role: "siswa", name: "Citra " }
];
const ROLE_LABEL = { wali: "Wali Kelas", guru: "Guru Mapel", siswa: "Siswa" };
const SISWA = USERS.filter(u => u.role === "siswa");

/* ===== SOAL UJIAN (statis, 1 benar = 20) ===== */
const SOAL = [[5, 7, 12], [14, 9, 23], [26, 18, 44], [37, 25, 62], [48, 36, 84]];

/* ===== "DATABASE UTAMA" (localStorage, dipakai bersama semua akun) ===== */
const KEY = "elearning_db";
const db = JSON.parse(localStorage.getItem(KEY) || '{"subs":[],"scores":{}}');
const save = () => localStorage.setItem(KEY, JSON.stringify(db));

let me = null, dirHandle = null;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(t) {
  const el = $("toast"); el.textContent = t; el.hidden = false;
  setTimeout(() => (el.hidden = true), 3500);
}

/* ===== LOGIN / LOGOUT ===== */
$("login-form").addEventListener("submit", e => {
  e.preventDefault();
  const u = USERS.find(x => x.username === $("username").value.trim() && x.password === $("password").value);
  if (!u) { $("login-error").textContent = "Username atau password salah."; return; }
  me = u; $("login-error").textContent = ""; $("login-form").reset();
  $("login-view").hidden = true; $("app-view").hidden = false;
  $("user-name").textContent = u.name; $("role-badge").textContent = ROLE_LABEL[u.role];
  ["wali", "guru", "siswa"].forEach(r => ($(r).hidden = r !== u.role));
  if (u.role === "siswa") initSiswa(); else initStaff(u.role);
});
$("logout-btn").addEventListener("click", () => {
  me = null; $("app-view").hidden = true; $("login-view").hidden = false;
});

/* ===== WALI KELAS & GURU MAPEL ===== */
function initStaff(role) {
  const list = $(role + "-list"), box = $(role + "-detail");
  list.innerHTML = SISWA.map(s => `<li data-u="${s.username}">👤 ${esc(s.name)}</li>`).join("");
  box.className = "detail muted"; box.textContent = "Klik salah satu siswa.";
  list.onclick = e => {
    const li = e.target.closest("li"); if (!li) return;
    list.querySelectorAll("li").forEach(x => x.classList.remove("active")); li.classList.add("active");
    showDetail(SISWA.find(s => s.username === li.dataset.u), role, box);
  };
}

function showDetail(s, role, box) {
  const score = db.scores[s.username];
  const tasks = db.subs.filter(x => x.user === s.username);
  let h = `<h3>${esc(s.name)}</h3><p>Nilai ulangan: ` +
    (score == null ? `<span class="score none">Belum mengerjakan ujian</span>` : `<b class="score">${score}</b>`) +
    `</p><p>Tugas terkumpul: <b>${tasks.length}</b></p>`;
  if (role === "guru") {
    h += "<h4>Histori Pengumpulan Tugas</h4>" + (tasks.length
      ? "<ul>" + tasks.map(t => `<li>${esc(t.time)} – <a href="${esc(t.link)}" target="_blank" rel="noopener">${esc(t.link)}</a></li>`).join("") + "</ul>"
      : '<p class="muted">Belum ada tugas dikumpulkan.</p>');
  } else {
    h += `<button id="sheet-btn" class="btn primary" ${score == null ? "disabled" : ""}>📄 Buat Lembar Penilaian (.txt)</button>`;
  }
  box.className = "detail"; box.innerHTML = h;
  if (role === "wali") $("sheet-btn").onclick = () => makeSheet(s, score, tasks.length);
}

function makeSheet(s, score, nTasks) {
  const txt = `LEMBAR PENILAIAN SISWA\n======================\nNama           : ${s.name}\nUsername       : ${s.username}\nNilai Ujian    : ${score}\nTugas Terkumpul: ${nTasks}\nDibuat oleh    : ${me.name}\nTanggal        : ${new Date().toLocaleString("id-ID")}\n`;
  saveTxt(`lembar_penilaian_${s.username}.txt`, txt);
}

/* Simpan .txt ke folder proyek (pilih folder sekali). Jika browser tidak mendukung -> unduh biasa. */
async function saveTxt(name, text) {
  try {
    if (!dirHandle && window.showDirectoryPicker) {
      toast("Pilih folder tempat index.html, style.css, script.js berada");
      dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    }
    if (dirHandle) {
      const w = await (await dirHandle.getFileHandle(name, { create: true })).createWritable();
      await w.write(text); await w.close();
      return toast(`✅ ${name} tersimpan di folder proyek`);
    }
  } catch (err) { if (err.name === "AbortError") return; dirHandle = null; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = name; a.click();
  toast(`⬇️ ${name} diunduh – pindahkan ke folder proyek`);
}

/* ===== SISWA ===== */
function initSiswa() {
  document.querySelectorAll(".tab").forEach(t => (t.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
    document.querySelectorAll(".tabpane").forEach(p => (p.hidden = p.id !== t.dataset.tab));
  }));
  document.querySelector('[data-tab="tab-tugas"]').click();
  $("task-msg").textContent = ""; $("task-link").value = "";
  renderTasks(); renderExam();
}

function renderTasks() {
  const mine = db.subs.filter(x => x.user === me.username);
  $("task-history").innerHTML = mine.length
    ? mine.map(t => `<li>${esc(t.time)} – <a href="${esc(t.link)}" target="_blank" rel="noopener">${esc(t.link)}</a></li>`).join("")
    : '<li class="muted">Belum ada tugas.</li>';
}

$("task-submit").onclick = () => {
  const link = $("task-link").value.trim(), msg = $("task-msg");
  if (!/^https?:\/\/\S+$/i.test(link)) { msg.className = "msg bad"; msg.textContent = "Masukkan link yang valid (diawali http:// atau https://)."; return; }
  db.subs.push({ user: me.username, link, time: new Date().toLocaleString("id-ID") }); save();
  $("task-link").value = ""; msg.className = "msg ok"; msg.textContent = "✅ Tugas berhasil terkirim!";
  renderTasks();
};

function renderExam() {
  const done = db.scores[me.username];
  $("exam-box").innerHTML = SOAL.map((q, i) =>
    `<div class="q"><b>${i + 1}.</b> ${q[0]} + ${q[1]} = <input type="number" class="ans" ${done != null ? "disabled" : ""}></div>`).join("");
  $("exam-submit").disabled = done != null;
  showScore(done);
}
function showScore(s) {
  const r = $("exam-result");
  r.className = "msg ok"; r.textContent = s == null ? "" : `Nilai kamu: ${s} (ujian sudah dikerjakan)`;
}

$("exam-submit").onclick = () => {
  const ans = [...document.querySelectorAll(".ans")];
  if (ans.some(a => a.value === "")) { $("exam-result").className = "msg bad"; $("exam-result").textContent = "Jawab semua 5 soal dulu ya."; return; }
  db.scores[me.username] = ans.reduce((n, a, i) => n + (Number(a.value) === SOAL[i][2] ? 20 : 0), 0); save();
  renderExam();
};