/* Rèn Tứ Thư Lãnh Đạo – ứng dụng tự học cá nhân, chạy hoàn toàn trên trình duyệt.
   Dữ liệu tiến độ lưu trong localStorage của máy (có nút sao lưu / khôi phục). */
(function () {
  "use strict";

  const BOOKS = window.BOOKS;
  const SIMON = window.SIMON;
  const KEY = "tuthu-v1";
  const $app = document.getElementById("app");

  // ---------- Chỉ mục nội dung ----------
  const CH = {};           // id chương -> chương (kèm book, n)
  const ORDER = [];        // thứ tự học mặc định
  BOOKS.forEach((b) => {
    b.chapters.forEach((c, i) => {
      c.id = b.id + "-" + (i + 1);
      c.n = i + 1;
      c.book = b;
      CH[c.id] = c;
      ORDER.push(c.id);
    });
  });
  const cardId = (chId, i) => chId + "#" + i;

  // ---------- Lưu trữ ----------
  const blank = () => ({ done: {}, feyn: {}, cards: {}, scen: {}, journal: [], days: {}, chal: {}, pomo: {}, startedAt: today() });
  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(blank(), JSON.parse(raw));
    } catch (e) { /* bỏ qua */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Không lưu được dữ liệu trên trình duyệt này."); }
    updateChrome();
  }

  // ---------- Tiện ích ----------
  function today(d) {
    const x = d ? new Date(d) : new Date();
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }
  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return today(new Date(y, m - 1, d + n));
  }
  function fmtDate(dateStr) {
    const [y, m, d] = dateStr.split("-");
    return d + "/" + m + "/" + y;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  function hash(str) { let h = 0; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
  function shuffle(arr, seed) {
    const a = arr.slice(); let s = seed || 1;
    for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function markActive() { S.days[today()] = true; }
  function streak() {
    let n = 0, d = today();
    if (!S.days[d]) d = addDays(d, -1);
    while (S.days[d]) { n++; d = addDays(d, -1); }
    return n;
  }
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }
  const doneCount = (b) => b.chapters.filter((c) => S.done[c.id]).length;
  const totalDone = () => Object.keys(S.done).filter((id) => CH[id]).length;
  function dueCards() {
    const t = today();
    return Object.entries(S.cards).filter(([id, c]) => c.due <= t && !c.mastered && CH[id.split("#")[0]]).map(([id]) => id);
  }
  function nextLesson() { return ORDER.find((id) => !S.done[id]) || null; }
  function dailyChapter() {
    // Thử thách hôm nay: ưu tiên các chương đã học, xoay vòng theo ngày.
    const learned = ORDER.filter((id) => S.done[id]);
    const pool = learned.length ? learned : [nextLesson() || ORDER[0]];
    return CH[pool[hash(today()) % pool.length]];
  }

  function updateChrome() {
    document.getElementById("streak").textContent = "🔥 " + streak();
    const due = dueCards().length;
    const badge = document.getElementById("due-badge");
    badge.hidden = !due; badge.textContent = due > 99 ? "99+" : due;
  }

  // ---------- Router ----------
  const routes = [
    [/^\/?$/, viewToday, "today"],
    [/^\/books$/, viewBooks, "books"],
    [/^\/book\/([\w-]+)$/, viewBook, "books"],
    [/^\/ch\/([\w-]+)$/, viewChapter, "books"],
    [/^\/review$/, viewReview, "review"],
    [/^\/scen$/, viewScenList, "scen"],
    [/^\/scen\/([\w-]+)$/, viewScenario, "scen"],
    [/^\/journal$/, viewJournal, "journal"],
    [/^\/progress$/, viewProgress, "today"],
    [/^\/method$/, viewMethod, "today"]
  ];
  function route() {
    const path = decodeURIComponent(location.hash.replace(/^#/, "").split("?")[0]) || "/";
    for (const [re, fn, tab] of routes) {
      const m = path.match(re);
      if (m) {
        document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
        stopTimerIfLeaving(fn);
        fn(...m.slice(1));
        window.scrollTo(0, 0);
        $app.focus({ preventScroll: true });
        updateChrome();
        return;
      }
    }
    location.hash = "#/";
  }
  window.addEventListener("hashchange", route);

  // ---------- Hôm nay ----------
  function viewToday() {
    const next = nextLesson();
    const nc = next && CH[next];
    const due = dueCards().length;
    const dc = dailyChapter();
    const chalDone = S.chal[today()] === dc.id;
    const tip = SIMON.tips[hash(today()) % SIMON.tips.length];
    const pct = Math.round((totalDone() / ORDER.length) * 100);
    const hour = new Date().getHours();
    const greet = hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

    $app.innerHTML = `
      <section class="hero">
        <div class="eyebrow">${fmtDate(today())}</div>
        <h1>${greet}! Hôm nay rèn một chút nhé.</h1>
        <p class="muted">Mỗi ngày một chương, một tình huống, một thử thách nhỏ.</p>
      </section>

      <div class="stats">
        <div class="stat"><b>${streak()}</b><span>ngày liên tiếp</span></div>
        <div class="stat"><b>${totalDone()}/${ORDER.length}</b><span>chương đã học</span></div>
        <div class="stat"><b>${due}</b><span>thẻ cần ôn</span></div>
      </div>

      ${nc ? `
      <a class="card book" href="#/ch/${nc.id}" style="--c:${nc.book.color}">
        <div class="eyebrow">Bài học tiếp theo · ${esc(nc.book.title)} · Chương ${nc.n}</div>
        <h2>${nc.book.icon} ${esc(nc.t)}</h2>
        <p class="muted">${esc(nc.s)}</p>
        <span class="btn primary">Bắt đầu học</span>
      </a>` : `
      <div class="card"><div class="eyebrow">Bài học</div><h2>🎉 Bạn đã học xong cả 64 chương!</h2>
      <p class="muted">Hãy tiếp tục ôn thẻ và luyện tình huống để biến kiến thức thành thói quen.</p></div>`}

      ${due ? `
      <a class="card" href="#/review" style="display:block;text-decoration:none">
        <div class="row between"><div><div class="eyebrow">Ôn tập</div><h2>🃏 ${due} thẻ đến hạn ôn</h2>
        <p class="muted small">Chỉ mất khoảng ${Math.max(1, Math.round(due * 0.3))} phút.</p></div><span class="btn">Ôn ngay</span></div>
      </a>` : ""}

      <div class="card" style="--c:${dc.book.color}">
        <div class="eyebrow">Thử thách hôm nay · ${esc(dc.t)}</div>
        <p style="font-weight:600">${esc(dc.ch)}</p>
        <div class="row wrap">
          <button class="btn ${chalDone ? "" : "primary"}" id="chal-btn">${chalDone ? "✓ Đã hoàn thành" : "Tôi đã làm xong"}</button>
          <a class="btn ghost" href="#/ch/${dc.id}">Xem lại bài</a>
        </div>
      </div>

      ${pomodoroCard()}

      <div class="card tight">
        <div class="eyebrow">Mẹo học Simon</div>
        <p class="tip-t">${esc(tip.t)}</p>
        <p class="muted small" style="margin:0">${esc(tip.d)} <a href="#/method">Xem cách học</a></p>
      </div>

      <a class="card tight" href="#/progress" style="display:block;text-decoration:none">
        <div class="row between"><b>Tiến độ toàn bộ</b><span class="muted small">${pct}%</span></div>
        <div class="progress" style="margin-top:8px"><i style="width:${pct}%"></i></div>
      </a>`;

    document.getElementById("chal-btn").onclick = () => {
      if (S.chal[today()] === dc.id) { delete S.chal[today()]; }
      else { S.chal[today()] = dc.id; markActive(); toast("Tuyệt vời! Ghi lại cảm nhận vào Nhật ký nhé."); }
      save(); viewToday();
    };
    bindPomodoro();
  }

  // ---------- Pomodoro ----------
  const POMO = { left: 25 * 60, mode: "focus", running: false, id: null };
  function pomodoroCard() {
    const n = S.pomo[today()] || 0;
    return `
      <div class="card">
        <div class="row between"><div class="eyebrow">Pomodoro · ${POMO.mode === "focus" ? "Tập trung" : "Nghỉ ngơi"}</div>
        <span class="pill">${n} phiên hôm nay</span></div>
        <div class="timer" id="timer">${fmtTime(POMO.left)}</div>
        <div class="grid2">
          <button class="btn primary" id="pomo-toggle">${POMO.running ? "Tạm dừng" : "Bắt đầu"}</button>
          <button class="btn" id="pomo-reset">Đặt lại</button>
        </div>
        <p class="muted small" style="margin:10px 0 0">Học 25 phút, nghỉ 5 phút. Cất điện thoại ra xa trong lúc học.</p>
      </div>`;
  }
  function fmtTime(s) { return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function bindPomodoro() {
    const tg = document.getElementById("pomo-toggle"), rs = document.getElementById("pomo-reset");
    if (!tg) return;
    tg.onclick = () => {
      POMO.running = !POMO.running;
      if (POMO.running) POMO.id = setInterval(tick, 1000); else clearInterval(POMO.id);
      tg.textContent = POMO.running ? "Tạm dừng" : "Bắt đầu";
    };
    rs.onclick = () => { clearInterval(POMO.id); POMO.running = false; POMO.mode = "focus"; POMO.left = 25 * 60; viewToday(); };
  }
  function tick() {
    POMO.left--;
    if (POMO.left <= 0) {
      if (POMO.mode === "focus") {
        S.pomo[today()] = (S.pomo[today()] || 0) + 1; markActive(); save();
        POMO.mode = "break"; POMO.left = 5 * 60; toast("Hết 25 phút! Nghỉ 5 phút nhé.");
      } else { POMO.mode = "focus"; POMO.left = 25 * 60; toast("Hết giờ nghỉ. Vào phiên mới thôi!"); }
      beep();
      if (location.hash === "" || location.hash === "#/") viewToday();
    }
    const el = document.getElementById("timer");
    if (el) el.textContent = fmtTime(POMO.left);
  }
  function stopTimerIfLeaving() { /* đồng hồ vẫn chạy nền khi chuyển trang */ }
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .8);
      o.start(); o.stop(ctx.currentTime + .8);
    } catch (e) { /* không có âm thanh */ }
  }

  // ---------- Thư viện ----------
  function viewBooks() {
    $app.innerHTML = `
      <h1>Bộ Tứ thư lãnh đạo</h1>
      <p class="muted">Bốn tập sách của tác giả Hòa Nhân, mỗi tập 16 chương. Bạn có thể học theo thứ tự hoặc chọn chương mình đang cần.</p>
      ${BOOKS.map((b) => {
        const d = doneCount(b), pct = Math.round((d / b.chapters.length) * 100);
        return `
        <a class="card book" href="#/book/${b.id}" style="--c:${b.color}">
          <div class="row"><span class="icon">${b.icon}</span><div style="flex:1"><h2>${esc(b.title)}</h2>
          <div class="muted small">${d}/${b.chapters.length} chương</div></div></div>
          <p class="muted small" style="margin:10px 0">${esc(b.intro)}</p>
          <div class="progress"><i style="width:${pct}%"></i></div>
        </a>`;
      }).join("")}`;
  }

  function viewBook(id) {
    const b = BOOKS.find((x) => x.id === id);
    if (!b) { location.hash = "#/books"; return; }
    $app.innerHTML = `
      <a class="back" href="#/books">‹ Bài học</a>
      <div class="card lesson-head" style="--c:${b.color}">
        <div class="eyebrow">Tứ thư lãnh đạo</div>
        <h1>${b.icon} ${esc(b.title)}</h1>
        <p class="muted" style="margin:0">${esc(b.intro)}</p>
      </div>
      <div class="card" style="--c:${b.color}">
        <ul class="ch-list">
          ${b.chapters.map((c) => `
            <li><a href="#/ch/${c.id}">
              <span class="ch-no ${S.done[c.id] ? "done" : ""}">${S.done[c.id] ? "✓" : c.n}</span>
              <span class="ch-title"><b>${esc(c.t)}</b><span>${esc(c.s)}</span></span>
              ${S.scen[c.id] ? `<span title="Đã làm tình huống">🎯</span>` : ""}
            </a></li>`).join("")}
        </ul>
      </div>`;
  }

  // ---------- Bài học ----------
  function viewChapter(id) {
    const c = CH[id];
    if (!c) { location.hash = "#/books"; return; }
    const b = c.book, done = !!S.done[id];
    const idx = ORDER.indexOf(id);
    const prev = ORDER[idx - 1], next = ORDER[idx + 1];
    const st = [true, !!(S.feyn[id] || "").trim(), id in S.scen, done];

    $app.innerHTML = `
      <a class="back" href="#/book/${b.id}">‹ ${esc(b.title)}</a>
      <div class="card lesson-head" style="--c:${b.color}">
        <div class="steps" title="Đọc · Tự giải thích · Tình huống · Hoàn thành">${st.map((on) => `<i class="${on ? "on" : ""}"></i>`).join("")}</div>
        <div class="eyebrow">${b.icon} ${esc(b.title)} · Chương ${c.n}</div>
        <h1>${esc(c.t)}</h1>
        <p class="muted" style="margin:0">${esc(c.s)}</p>
      </div>

      <div class="card" style="--c:${b.color}">
        <div class="eyebrow">1 · Ý chính</div>
        <ol class="keys">${c.k.map((k) => `<li>${esc(k)}</li>`).join("")}</ol>
        <blockquote class="quote">“${esc(c.q)}”</blockquote>
      </div>

      <details class="card">
        <summary><b>Các mục trong sách</b> <span class="muted small">· để đọc sâu hơn</span></summary>
        <ul class="outline" style="margin-top:10px">${c.o.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
      </details>

      <div class="card">
        <div class="eyebrow">2 · Tự giải thích (Feynman)</div>
        <p class="small muted">Hãy viết lại bài học bằng lời của bạn, như đang giải thích cho một nhân viên mới. Bạn sẽ áp dụng nó vào việc gì?</p>
        <textarea id="feyn" placeholder="Theo mình, chương này muốn nói rằng…">${esc(S.feyn[id] || "")}</textarea>
        <div class="row" style="margin-top:8px"><button class="btn" id="save-feyn">Lưu</button><span class="muted small" id="feyn-msg"></span></div>
      </div>

      <div class="card">
        <div class="eyebrow">3 · Luyện tình huống</div>
        <p style="margin-bottom:10px">${esc(c.sc.t)}</p>
        <a class="btn ${id in S.scen ? "" : "primary"}" href="#/scen/${id}">${id in S.scen ? "Làm lại tình huống" : "Giải tình huống"}</a>
      </div>

      <div class="card">
        <div class="eyebrow">4 · Thử thách áp dụng</div>
        <p style="font-weight:600;margin:0">${esc(c.ch)}</p>
      </div>

      <button class="btn block ${done ? "" : "primary"}" id="done-btn">${done ? "✓ Đã hoàn thành · bấm để bỏ đánh dấu" : "Hoàn thành bài & tạo thẻ ôn tập"}</button>
      <p class="muted small" style="text-align:center;margin-top:8px">${done ? "Đã học ngày " + fmtDate(S.done[id]) : "Bài học sẽ tạo 3 thẻ ôn, thẻ đầu tiên đến hạn ôn vào ngày mai."}</p>

      <div class="grid2" style="margin-top:14px">
        ${prev ? `<a class="btn" href="#/ch/${prev}">‹ ${esc(CH[prev].t)}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#/ch/${next}">${esc(CH[next].t)} ›</a>` : "<span></span>"}
      </div>`;

    const saveFeyn = () => {
      S.feyn[id] = document.getElementById("feyn").value;
      if (S.feyn[id].trim()) markActive();
      save();
      document.getElementById("feyn-msg").textContent = "Đã lưu ✓";
    };
    document.getElementById("save-feyn").onclick = saveFeyn;
    document.getElementById("feyn").addEventListener("blur", saveFeyn);
    document.getElementById("done-btn").onclick = () => {
      if (S.done[id]) {
        delete S.done[id];
        c.c.forEach((_, i) => delete S.cards[cardId(id, i)]);
        toast("Đã bỏ đánh dấu hoàn thành.");
      } else {
        const fe = document.getElementById("feyn").value; S.feyn[id] = fe;
        S.done[id] = today(); markActive();
        c.c.forEach((_, i) => { const k = cardId(id, i); if (!S.cards[k]) S.cards[k] = { box: 0, due: addDays(today(), SIMON.intervals[0]) }; });
        toast("Hoàn thành! Đã thêm 3 thẻ vào lịch ôn tập.");
      }
      save(); viewChapter(id);
    };
  }

  // ---------- Ôn thẻ (lặp lại ngắt quãng) ----------
  let reviewQueue = null, reviewStats = null;
  function viewReview() {
    if (!reviewQueue) { reviewQueue = shuffle(dueCards(), Date.now() % 1000); reviewStats = { ok: 0, again: 0, total: reviewQueue.length }; }
    const totalCards = Object.keys(S.cards).length;
    const mastered = Object.values(S.cards).filter((c) => c.mastered).length;

    if (!reviewQueue.length) {
      const upcoming = Object.values(S.cards).filter((c) => !c.mastered).map((c) => c.due).sort()[0];
      const finished = reviewStats && reviewStats.total;
      $app.innerHTML = `
        <h1>Ôn thẻ</h1>
        <div class="card empty">
          ${finished ? `<h2>🎉 Xong phiên ôn tập!</h2><p>Nhớ ngay: <b>${reviewStats.ok}</b> · Cần ôn lại: <b>${reviewStats.again}</b></p>`
            : totalCards ? `<h2>Không có thẻ nào đến hạn</h2>` : `<h2>Chưa có thẻ nào</h2><p>Học xong mỗi chương, bạn sẽ có 3 thẻ để ôn.</p>`}
          ${upcoming ? `<p class="muted">Lần ôn tiếp theo: ${fmtDate(upcoming)}</p>` : ""}
          <a class="btn primary" href="#/books">Học bài mới</a>
        </div>
        <div class="card tight"><div class="row between"><span>Tổng số thẻ</span><b>${totalCards}</b></div>
        <div class="row between"><span>Đã thuộc (qua 5 lần ôn)</span><b>${mastered}</b></div></div>
        <div class="card tight small muted">Lịch ôn theo đường cong quên lãng của phương pháp Simon: 1 → 2 → 4 → 7 → 15 ngày. Nhớ thì thẻ lên mốc tiếp theo; quên thì thẻ quay lại mốc 1 ngày.</div>
        ${totalCards ? `<button class="btn block ghost" id="cram">Ôn tự do tất cả thẻ (không ảnh hưởng lịch)</button>` : ""}`;
      reviewStats = null; reviewQueue = null;
      const cram = document.getElementById("cram");
      if (cram) cram.onclick = () => viewCram();
      return;
    }

    const id = reviewQueue[0];
    const [chId, i] = id.split("#");
    const c = CH[chId], card = c.c[+i];
    const done = reviewStats.total - reviewQueue.length;
    $app.innerHTML = `
      <div class="row between"><h1 style="margin:0">Ôn thẻ</h1><span class="pill">${done + 1}/${reviewStats.total}</span></div>
      <div class="progress" style="margin:10px 0 14px"><i style="width:${(done / reviewStats.total) * 100}%"></i></div>
      <div class="card flash" id="flash" style="--c:${c.book.color}" tabindex="0" role="button" aria-label="Lật thẻ">
        <div class="eyebrow">${c.book.icon} ${esc(c.book.short)} · ${esc(c.t)}</div>
        <div class="q">${esc(card[0])}</div>
        <div class="a" id="ans" hidden>${esc(card[1])}</div>
        <div class="hint" id="hint">Tự trả lời trong đầu, rồi chạm vào thẻ để lật</div>
      </div>
      <div class="grid2" id="grade" hidden>
        <button class="btn" id="again">↺ Chưa nhớ</button>
        <button class="btn primary" id="ok">✓ Đã nhớ</button>
      </div>`;
    const flip = () => { document.getElementById("ans").hidden = false; document.getElementById("hint").hidden = true; document.getElementById("grade").hidden = false; };
    const f = document.getElementById("flash");
    f.onclick = flip; f.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } };
    document.getElementById("ok").onclick = () => grade(id, true);
    document.getElementById("again").onclick = () => grade(id, false);
  }
  function grade(id, ok) {
    const c = S.cards[id];
    if (ok) {
      c.box = (c.box || 0) + 1;
      if (c.box >= SIMON.intervals.length) { c.mastered = true; c.due = addDays(today(), 30); }
      else c.due = addDays(today(), SIMON.intervals[c.box]);
      reviewStats.ok++;
    } else {
      c.box = 0; c.due = addDays(today(), SIMON.intervals[0]);
      reviewStats.again++;
    }
    markActive(); save();
    reviewQueue.shift();
    viewReview();
  }
  function viewCram() {
    const ids = shuffle(Object.keys(S.cards).filter((k) => CH[k.split("#")[0]]), Date.now() % 997);
    let i = 0;
    const show = () => {
      if (i >= ids.length) { location.hash = "#/review"; route(); return; }
      const [chId, n] = ids[i].split("#"); const c = CH[chId], card = c.c[+n];
      $app.innerHTML = `
        <div class="row between"><h1 style="margin:0">Ôn tự do</h1><span class="pill">${i + 1}/${ids.length}</span></div>
        <div class="card flash" id="flash" style="margin-top:14px" tabindex="0" role="button">
          <div class="eyebrow">${c.book.icon} ${esc(c.book.short)} · ${esc(c.t)}</div>
          <div class="q">${esc(card[0])}</div>
          <div class="a" id="ans" hidden>${esc(card[1])}</div>
          <div class="hint">Chạm để lật</div>
        </div>
        <div class="grid2"><a class="btn" href="#/review">Dừng</a><button class="btn primary" id="nx">Thẻ tiếp ›</button></div>`;
      document.getElementById("flash").onclick = () => { document.getElementById("ans").hidden = false; };
      document.getElementById("nx").onclick = () => { i++; show(); };
    };
    show();
  }

  // ---------- Tình huống ----------
  function viewScenList() {
    const answered = Object.keys(S.scen).filter((id) => CH[id]).length;
    const right = Object.entries(S.scen).filter(([id, v]) => CH[id] && v).length;
    const pool = ORDER.filter((id) => !(id in S.scen));
    $app.innerHTML = `
      <h1>Tình huống quản trị</h1>
      <p class="muted">64 tình huống thực tế. Hãy chọn cách xử lý, sau đó đọc phần phân tích theo lời dạy của sách.</p>
      <div class="stats">
        <div class="stat"><b>${answered}</b><span>đã giải</span></div>
        <div class="stat"><b>${right}</b><span>chọn đúng ngay</span></div>
        <div class="stat"><b>${answered ? Math.round((right / answered) * 100) : 0}%</b><span>chính xác</span></div>
      </div>
      <button class="btn primary block" id="rand">🎲 Tình huống ngẫu nhiên${pool.length ? " (chưa làm)" : ""}</button>
      ${BOOKS.map((b) => `
        <h2 style="margin-top:20px">${b.icon} ${esc(b.title)}</h2>
        <div class="card" style="--c:${b.color}"><ul class="ch-list">
        ${b.chapters.map((c) => `
          <li><a href="#/scen/${c.id}">
            <span class="ch-no ${c.id in S.scen ? "done" : ""}">${c.id in S.scen ? (S.scen[c.id] ? "✓" : "•") : c.n}</span>
            <span class="ch-title"><b>${esc(c.t)}</b><span>${esc(c.sc.t.length > 90 ? c.sc.t.slice(0, 88) + "…" : c.sc.t)}</span></span>
          </a></li>`).join("")}
        </ul></div>`).join("")}`;
    document.getElementById("rand").onclick = () => {
      const p = pool.length ? pool : ORDER;
      location.hash = "#/scen/" + p[Math.floor(Math.random() * p.length)];
    };
  }

  function viewScenario(id) {
    const c = CH[id];
    if (!c) { location.hash = "#/scen"; return; }
    const sc = c.sc;
    const order = shuffle(sc.o.map((_, i) => i), hash(id + (Date.now() / 60000 | 0)));
    $app.innerHTML = `
      <a class="back" href="#/scen">‹ Tình huống</a>
      <div class="card lesson-head" style="--c:${c.book.color}">
        <div class="eyebrow">${c.book.icon} ${esc(c.book.title)} · ${esc(c.t)}</div>
        <p style="font-size:1.08rem;font-weight:600;margin:0">${esc(sc.t)}</p>
      </div>
      <p class="muted small">Bạn sẽ xử lý thế nào?</p>
      <div id="opts">${order.map((i) => `<button class="opt" data-i="${i}">${esc(sc.o[i][0])}<div class="fb" hidden>${esc(sc.o[i][1])}</div></button>`).join("")}</div>
      <div id="after" hidden>
        <div class="card"><div id="verdict"></div>
          <p class="small muted" style="margin:8px 0 0">Bài học liên quan: <a href="#/ch/${id}">${esc(c.book.short)} · ${esc(c.t)}</a></p></div>
        <div class="grid2"><a class="btn" href="#/journal?ch=${id}">Ghi nhật ký</a><button class="btn primary" id="next-sc">Tình huống khác ›</button></div>
      </div>`;
    document.querySelectorAll(".opt").forEach((btn) => {
      btn.onclick = () => {
        const i = +btn.dataset.i, ok = i === sc.a;
        document.querySelectorAll(".opt").forEach((b) => {
          b.disabled = true;
          const j = +b.dataset.i;
          if (j === sc.a) b.classList.add("right");
          if (j === i && !ok) b.classList.add("wrong");
          if (j === i || j === sc.a) b.querySelector(".fb").hidden = false;
        });
        if (!(id in S.scen)) S.scen[id] = ok;
        markActive(); save();
        document.getElementById("verdict").innerHTML = ok
          ? `<span class="verdict ok">✓ Chính xác!</span> <span class="muted">Bạn đã chọn đúng tinh thần của chương.</span>`
          : `<span class="verdict no">Chưa tối ưu.</span> <span class="muted">Đọc phân tích ở phương án màu xanh để thấy cách xử lý theo sách.</span>`;
        document.getElementById("after").hidden = false;
      };
    });
    const nx = document.getElementById("next-sc");
    nx.onclick = () => {
      const pool = ORDER.filter((x) => !(x in S.scen) && x !== id);
      const p = pool.length ? pool : ORDER.filter((x) => x !== id);
      location.hash = "#/scen/" + p[Math.floor(Math.random() * p.length)];
    };
  }

  // ---------- Nhật ký (Cornell) ----------
  function viewJournal() {
    const params = new URLSearchParams((location.hash.split("?")[1]) || "");
    const pre = params.get("ch") || "";
    const opts = `<option value="">— Không gắn với chương nào —</option>` + BOOKS.map((b) =>
      `<optgroup label="${esc(b.title)}">${b.chapters.map((c) => `<option value="${c.id}" ${c.id === pre ? "selected" : ""}>${c.n}. ${esc(c.t)}</option>`).join("")}</optgroup>`).join("");
    const entries = S.journal.slice().reverse();
    $app.innerHTML = `
      <h1>Nhật ký rèn luyện</h1>
      <p class="muted">Ghi theo phương pháp Cornell: từ khóa, ghi chép và tóm tắt. Bạn có thể ghi lại một tình huống thật, hoặc một việc đã áp dụng hôm nay.</p>
      <form class="card" id="jform">
        <label class="lbl" for="j-ch">Liên quan đến chương</label>
        <select id="j-ch">${opts}</select>
        <div class="cornell">
          <div><label class="lbl" for="j-cue">Từ khóa / câu hỏi</label><textarea id="j-cue" style="min-height:90px" placeholder="VD: Phê bình hành vi, không phê bình con người"></textarea></div>
          <div><label class="lbl" for="j-notes">Ghi chép: chuyện gì xảy ra, tôi đã làm gì</label><textarea id="j-notes" placeholder="Hôm nay mình góp ý cho…"></textarea></div>
          <div class="sum"><label class="lbl" for="j-sum">Tóm tắt / bài học rút ra</label><textarea id="j-sum" style="min-height:70px" placeholder="Lần sau mình sẽ…"></textarea></div>
        </div>
        <button class="btn primary block" style="margin-top:12px" type="submit">Lưu nhật ký</button>
      </form>
      <h2>Các ghi chép (${entries.length})</h2>
      ${entries.length ? entries.map((e) => {
        const c = CH[e.ch];
        return `<div class="card entry" style="--c:${c ? c.book.color : "var(--line)"}">
          <div class="row between"><div class="eyebrow" style="margin:0">${fmtDate(e.date)}${c ? " · " + esc(c.book.short) + " · " + esc(c.t) : ""}</div>
          <button class="btn ghost small" data-del="${e.id}" aria-label="Xóa ghi chép" style="min-height:32px;padding:4px 10px">Xóa</button></div>
          ${e.cue ? `<p class="cue" style="margin-top:8px">${esc(e.cue)}</p>` : ""}
          ${e.notes ? `<p style="white-space:pre-wrap">${esc(e.notes)}</p>` : ""}
          ${e.sum ? `<p class="muted" style="white-space:pre-wrap;margin:0"><b>Tóm tắt:</b> ${esc(e.sum)}</p>` : ""}
        </div>`;
      }).join("") : `<div class="card empty">Chưa có ghi chép nào. Hãy viết dòng đầu tiên!</div>`}
      ${backupCard()}`;
    document.getElementById("jform").onsubmit = (ev) => {
      ev.preventDefault();
      const e = { id: Date.now().toString(36), date: today(), ch: document.getElementById("j-ch").value,
        cue: document.getElementById("j-cue").value.trim(), notes: document.getElementById("j-notes").value.trim(), sum: document.getElementById("j-sum").value.trim() };
      if (!e.cue && !e.notes && !e.sum) { toast("Hãy viết vài dòng trước khi lưu."); return; }
      S.journal.push(e); markActive(); save(); toast("Đã lưu nhật ký.");
      if (location.hash === "#/journal") viewJournal(); else location.hash = "#/journal";
    };
    document.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
      if (!confirm("Xóa ghi chép này?")) return;
      S.journal = S.journal.filter((e) => e.id !== b.dataset.del); save(); viewJournal();
    });
    bindBackup();
  }

  // ---------- Tiến độ ----------
  function viewProgress() {
    const days = Object.keys(S.days).length;
    const feyn = Object.values(S.feyn).filter((v) => v && v.trim()).length;
    const chals = Object.keys(S.chal).length;
    const pomos = Object.values(S.pomo).reduce((a, b) => a + b, 0);
    // Lịch 5 tuần gần nhất
    const cells = [];
    for (let i = 34; i >= 0; i--) { const d = addDays(today(), -i); cells.push(`<i title="${fmtDate(d)}" style="display:block;aspect-ratio:1;border-radius:4px;background:${S.days[d] ? "var(--accent)" : "var(--surface-2)"}"></i>`); }
    $app.innerHTML = `
      <a class="back" href="#/">‹ Hôm nay</a>
      <h1>Tiến độ của bạn</h1>
      <div class="stats">
        <div class="stat"><b>${streak()}</b><span>chuỗi ngày</span></div>
        <div class="stat"><b>${days}</b><span>ngày đã rèn</span></div>
        <div class="stat"><b>${pomos}</b><span>phiên Pomodoro</span></div>
      </div>
      <div class="card">
        <div class="eyebrow">35 ngày gần nhất</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">${cells.join("")}</div>
      </div>
      <div class="card">
        <div class="eyebrow">Theo từng cuốn</div>
        ${BOOKS.map((b) => { const d = doneCount(b); return `
          <div style="margin:10px 0"><div class="row between small"><span>${b.icon} ${esc(b.title)}</span><b>${d}/16</b></div>
          <div class="progress" style="--c:${b.color};margin-top:6px"><i style="width:${(d / 16) * 100}%"></i></div></div>`; }).join("")}
      </div>
      <div class="card tight">
        <div class="row between"><span>Bài tự giải thích (Feynman)</span><b>${feyn}</b></div>
        <div class="row between"><span>Tình huống đã giải</span><b>${Object.keys(S.scen).length}</b></div>
        <div class="row between"><span>Thử thách đã hoàn thành</span><b>${chals}</b></div>
        <div class="row between"><span>Ghi chép nhật ký</span><b>${S.journal.length}</b></div>
        <div class="row between"><span>Thẻ đã thuộc</span><b>${Object.values(S.cards).filter((c) => c.mastered).length}/${Object.keys(S.cards).length}</b></div>
      </div>
      ${backupCard()}`;
    bindBackup();
  }

  // ---------- Cách học ----------
  function viewMethod() {
    $app.innerHTML = `
      <a class="back" href="#/">‹ Hôm nay</a>
      <h1>Cách học trong ứng dụng</h1>
      <p class="muted">Ứng dụng áp dụng các nguyên tắc trong cuốn <i>Phương pháp học Simon</i> để biến 4 cuốn sách thành kỹ năng thật.</p>
      <div class="card"><div class="eyebrow">Mỗi chương, 4 bước</div>
        <ol class="keys">
          <li><b>Đọc ý chính</b>: một khối kiến thức nhỏ, đọc khoảng 3 phút.</li>
          <li><b>Tự giải thích (Feynman)</b>: viết lại bằng lời của bạn.</li>
          <li><b>Luyện tình huống</b>: chọn cách xử lý và đọc phần phân tích.</li>
          <li><b>Hoàn thành</b>: app tạo 3 thẻ ôn, ôn lại sau 1, 2, 4, 7 và 15 ngày.</li>
        </ol>
        <p class="muted small" style="margin:0">Thêm vào đó: thử thách áp dụng mỗi ngày, Pomodoro 25 phút để tập trung, và nhật ký Cornell để rút kinh nghiệm.</p>
      </div>
      ${SIMON.tips.map((t) => `<div class="card tight"><p class="tip-t" style="margin-bottom:4px">${esc(t.t)}</p><p class="muted small" style="margin:0">${esc(t.d)}</p></div>`).join("")}
      <p class="muted small">Gợi ý lộ trình: mỗi ngày một chương, học hết một cuốn trong 16 ngày, cả bộ trong khoảng 2 tháng.</p>`;
  }

  // ---------- Sao lưu ----------
  function backupCard() {
    return `
      <div class="card tight">
        <div class="eyebrow">Sao lưu dữ liệu</div>
        <p class="muted small">Tiến độ chỉ lưu trên trình duyệt của máy này. Hãy tải bản sao lưu về để không bị mất, hoặc để chuyển sang máy khác.</p>
        <div class="grid2">
          <button class="btn" id="bk-export">⬇ Tải sao lưu</button>
          <label class="btn" for="bk-import" style="cursor:pointer">⬆ Khôi phục</label>
        </div>
        <input type="file" id="bk-import" accept="application/json,.json" hidden>
      </div>`;
  }
  function bindBackup() {
    const ex = document.getElementById("bk-export"), im = document.getElementById("bk-import");
    if (!ex) return;
    ex.onclick = () => {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "ren-tu-thu-" + today() + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    im.onchange = () => {
      const f = im.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (typeof data !== "object" || !data.done) throw new Error("bad");
          if (!confirm("Khôi phục sẽ thay thế toàn bộ dữ liệu hiện tại. Tiếp tục?")) return;
          S = Object.assign(blank(), data); save(); toast("Đã khôi phục dữ liệu."); route();
        } catch (e) { toast("Tệp sao lưu không hợp lệ."); }
      };
      r.readAsText(f);
    };
  }

  route();
})();
