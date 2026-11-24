/* Đăng nhập tài khoản và đồng bộ tiến độ qua Firebase (Authentication + Cloud Firestore).
   Khi chưa điền cấu hình trong firebase-config.js, ứng dụng vẫn chạy bình thường ở chế độ lưu trên máy. */
(function () {
  "use strict";

  const A = window.App;
  const cfg = window.FIREBASE_CONFIG;
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const DEVICE = deviceId();

  const st = { status: cfg ? "loading" : "off", user: null, lastSync: 0, dirty: false };
  let auth = null, db = null, unsub = null, pushTimer = null, box = null;

  function deviceId() {
    try {
      let id = localStorage.getItem("tuthu-device");
      if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("tuthu-device", id); }
      return id;
    } catch (e) { return "x" + Date.now(); }
  }
  const userKey = (uid) => A.KEY + ":" + uid;
  const esc = A.esc;

  // ---------- Gộp dữ liệu (dùng khi đăng nhập trên máy đã có tiến độ) ----------
  function merge(a, b) {
    if (!a) return b; if (!b) return a;
    const m = A.blank();
    const keys = (x, y) => Array.from(new Set(Object.keys(x || {}).concat(Object.keys(y || {}))));
    keys(a.done, b.done).forEach((k) => { const x = a.done[k], y = b.done[k]; m.done[k] = x && y ? (x < y ? x : y) : (x || y); });
    keys(a.feyn, b.feyn).forEach((k) => { const x = a.feyn[k] || "", y = b.feyn[k] || ""; m.feyn[k] = x.length >= y.length ? x : y; });
    keys(a.cards, b.cards).forEach((k) => {
      const x = a.cards[k], y = b.cards[k];
      if (!x || !y) { m.cards[k] = x || y; return; }
      const pick = (x.box || 0) !== (y.box || 0) ? ((x.box || 0) > (y.box || 0) ? x : y) : (x.due >= y.due ? x : y);
      m.cards[k] = Object.assign({}, pick, { mastered: !!(x.mastered || y.mastered) || undefined });
    });
    keys(a.scen, b.scen).forEach((k) => { m.scen[k] = k in b.scen ? b.scen[k] : a.scen[k]; });
    const byId = {};
    (a.journal || []).concat(b.journal || []).forEach((e) => { byId[e.id] = e; });
    m.journal = Object.values(byId).sort((x, y) => (x.date + x.id < y.date + y.id ? -1 : 1));
    keys(a.days, b.days).forEach((k) => { m.days[k] = true; });
    keys(a.chal, b.chal).forEach((k) => { m.chal[k] = b.chal[k] || a.chal[k]; });
    keys(a.pomo, b.pomo).forEach((k) => { m.pomo[k] = Math.max(a.pomo[k] || 0, b.pomo[k] || 0); });
    m.startedAt = [a.startedAt, b.startedAt].filter(Boolean).sort()[0] || m.startedAt;
    m._ts = Date.now();
    return m;
  }
  const hasProgress = (s) => s && (Object.keys(s.done || {}).length || (s.journal || []).length || Object.keys(s.scen || {}).length || Object.keys(s.feyn || {}).length);

  // ---------- Khởi động Firebase ----------
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load " + src)); document.head.appendChild(s); });
  }
  async function init() {
    updateBadge();
    if (!cfg) return;
    try {
      await loadScript(SDK + "firebase-app-compat.js");
      await Promise.all([loadScript(SDK + "firebase-auth-compat.js"), loadScript(SDK + "firebase-firestore-compat.js")]);
      firebase.initializeApp(cfg);
      auth = firebase.auth();
      db = firebase.firestore();
      auth.languageCode = "vi";
      auth.getRedirectResult().catch((e) => A.toast(errMsg(e)));
      auth.onAuthStateChanged(onUser);
    } catch (e) {
      setStatus("error");
    }
    window.addEventListener("online", () => { if (st.user && st.dirty) push(); });
  }

  async function onUser(user) {
    if (unsub) { unsub(); unsub = null; }
    st.user = user;
    if (!user) { A.useStorage(A.KEY); setStatus("guest"); return; }

    setStatus("syncing");
    const key = userKey(user.uid);
    try {
      const ref = db.collection("users").doc(user.uid);
      const snap = await ref.get();
      const remote = snap.exists ? parse(snap.data().state) : null;
      let state = merge(A.readLocal(key), remote) || A.blank();
      const guest = A.readLocal(A.KEY);
      let mergedGuest = false;
      if (hasProgress(guest)) { state = merge(state, guest); mergedGuest = true; }
      A.useStorage(key);
      A.replaceState(state);
      if (mergedGuest) { A.clearLocal(A.KEY); A.toast("Đã gộp tiến độ trên máy này vào tài khoản."); }
      if (mergedGuest || !remote || JSON.stringify(remote) !== JSON.stringify(state)) await push();
      else { st.lastSync = Date.now(); setStatus("synced"); }

      // Nhận thay đổi từ thiết bị khác theo thời gian thực.
      unsub = ref.onSnapshot((d) => {
        if (!d.exists || d.metadata.hasPendingWrites) return;
        const data = d.data();
        if (data.device === DEVICE) return;
        const next = parse(data.state);
        if (next && (next._ts || 0) > (A.getState()._ts || 0)) {
          A.replaceState(next);
          st.lastSync = Date.now(); setStatus("synced");
        }
      }, () => setStatus("error"));
    } catch (e) {
      A.useStorage(key);
      st.dirty = true; setStatus("error");
    }
  }

  function parse(s) { try { return typeof s === "string" ? JSON.parse(s) : s; } catch (e) { return null; } }

  // ---------- Đẩy dữ liệu lên ----------
  function onLocalChange() {
    if (!st.user) return;
    st.dirty = true; setStatus("pending");
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 1500);
  }
  async function push() {
    if (!st.user || !db) return;
    clearTimeout(pushTimer);
    const S = A.getState();
    setStatus("syncing");
    try {
      await db.collection("users").doc(st.user.uid).set({
        state: JSON.stringify(S),
        clientTs: S._ts || Date.now(),
        device: DEVICE,
        email: st.user.email || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      st.dirty = false; st.lastSync = Date.now(); setStatus("synced");
    } catch (e) {
      st.dirty = true; setStatus("error");
    }
  }

  // ---------- Trạng thái & giao diện ----------
  const LABEL = {
    off: ["👤", "Chưa bật đồng bộ"],
    loading: ["⏳", "Đang kết nối…"],
    guest: ["👤", "Chưa đăng nhập"],
    pending: ["☁️", "Có thay đổi chưa đồng bộ"],
    syncing: ["🔄", "Đang đồng bộ…"],
    synced: ["☁️", "Đã đồng bộ"],
    error: ["⚠️", "Lỗi đồng bộ – sẽ thử lại khi có mạng"]
  };
  function setStatus(s) {
    st.status = s; updateBadge();
    if (box && document.body.contains(box) && !box.contains(document.activeElement)) renderAccount(box);
  }
  function updateBadge() {
    const el = document.getElementById("acct");
    if (!el) return;
    const [icon, text] = LABEL[st.status] || LABEL.off;
    el.textContent = st.user ? (st.status === "error" ? "⚠️" : st.status === "synced" ? "☁️" : icon) : "👤";
    el.title = text; el.setAttribute("aria-label", "Tài khoản: " + text);
    el.classList.toggle("on", !!st.user);
  }

  function renderAccount(el) {
    box = el;
    if (st.status === "off") {
      el.innerHTML = `<div class="card"><h2>Đồng bộ chưa được bật</h2>
        <p class="muted">Tiến độ đang được lưu trên máy này. Muốn bật đăng nhập và đồng bộ, hãy điền cấu hình Firebase vào tệp <code>firebase-config.js</code> theo hướng dẫn trong README.</p></div>`;
      return;
    }
    if (st.status === "loading") { el.innerHTML = `<div class="card empty">Đang kết nối…</div>`; return; }

    if (!st.user) {
      el.innerHTML = `
        <div class="card">
          <h2>Đăng nhập để đồng bộ</h2>
          <p class="muted small">Đăng nhập trên mọi thiết bị bằng cùng một tài khoản, tiến độ sẽ tự động đồng bộ. Tiến độ hiện có trên máy này sẽ được gộp vào tài khoản.</p>
          <button class="btn block" id="g-login"><b style="color:#4285f4">G</b>&nbsp; Đăng nhập bằng Google</button>
          <hr class="sep">
          <form id="em-form" novalidate>
            <label class="lbl" for="em">Email</label>
            <input type="email" id="em" autocomplete="email" required placeholder="ban@vidu.com">
            <label class="lbl" for="pw">Mật khẩu</label>
            <input type="password" id="pw" autocomplete="current-password" required placeholder="Ít nhất 6 ký tự">
            <div class="grid2" style="margin-top:12px">
              <button class="btn primary" type="submit" data-act="in">Đăng nhập</button>
              <button class="btn" type="submit" data-act="up">Tạo tài khoản</button>
            </div>
            <p class="small" style="margin:12px 0 0;text-align:center"><a href="#/account" id="forgot">Quên mật khẩu?</a></p>
          </form>
          <p class="muted small" id="auth-msg" role="alert" style="margin:10px 0 0"></p>
        </div>
        <div class="card tight small muted">Trên iPhone, nếu bạn mở app từ biểu tượng ngoài màn hình chính mà đăng nhập Google không được, hãy dùng email và mật khẩu.</div>`;
      const msg = (t) => { document.getElementById("auth-msg").textContent = t; };
      document.getElementById("g-login").onclick = async () => {
        const p = new firebase.auth.GoogleAuthProvider();
        try { await auth.signInWithPopup(p); }
        catch (e) {
          if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test(e.code || "")) { try { await auth.signInWithRedirect(p); } catch (e2) { msg(errMsg(e2)); } }
          else if (!/popup-closed|cancelled-popup/.test(e.code || "")) msg(errMsg(e));
        }
      };
      let act = "in";
      el.querySelectorAll("#em-form [data-act]").forEach((b) => b.addEventListener("click", () => { act = b.dataset.act; }));
      document.getElementById("em-form").onsubmit = async (ev) => {
        ev.preventDefault();
        const em = document.getElementById("em").value.trim(), pw = document.getElementById("pw").value;
        if (!em || !pw) { msg("Hãy nhập email và mật khẩu."); return; }
        msg(act === "up" ? "Đang tạo tài khoản…" : "Đang đăng nhập…");
        try {
          if (act === "up") await auth.createUserWithEmailAndPassword(em, pw);
          else await auth.signInWithEmailAndPassword(em, pw);
        } catch (e) { msg(errMsg(e)); }
      };
      document.getElementById("forgot").onclick = async (ev) => {
        ev.preventDefault();
        const em = document.getElementById("em").value.trim();
        if (!em) { msg("Nhập email của bạn vào ô Email rồi bấm lại “Quên mật khẩu?”."); return; }
        try { await auth.sendPasswordResetEmail(em); msg("Đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư (kể cả thư rác)."); }
        catch (e) { msg(errMsg(e)); }
      };
      return;
    }

    const u = st.user;
    const [, text] = LABEL[st.status] || LABEL.synced;
    const when = st.lastSync ? new Date(st.lastSync).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";
    el.innerHTML = `
      <div class="card">
        <div class="eyebrow">Đang đăng nhập</div>
        <h2 style="word-break:break-all">${esc(u.displayName || u.email || "Tài khoản")}</h2>
        ${u.displayName && u.email ? `<p class="muted small" style="word-break:break-all">${esc(u.email)}</p>` : ""}
        <div class="row between small" style="margin-top:6px"><span>${text}</span><span class="muted">Lần cuối: ${when}</span></div>
        <div class="grid2" style="margin-top:12px">
          <button class="btn" id="sync-now">🔄 Đồng bộ ngay</button>
          <button class="btn" id="sign-out">Đăng xuất</button>
        </div>
      </div>
      <div class="card tight small muted">Học trên máy nào cũng được, chỉ cần đăng nhập cùng tài khoản. Khi mất mạng, tiến độ vẫn được lưu trên máy và sẽ tự đồng bộ khi có mạng trở lại.</div>
      <details class="card tight">
        <summary class="small">Xóa tài khoản</summary>
        <p class="small muted" style="margin-top:8px">Xóa vĩnh viễn tài khoản và toàn bộ tiến độ đã lưu trên máy chủ. Không thể hoàn tác.</p>
        <button class="btn block" id="del-acct" style="color:var(--bad);border-color:var(--bad)">Xóa tài khoản của tôi</button>
      </details>`;
    document.getElementById("sync-now").onclick = () => push();
    document.getElementById("sign-out").onclick = async () => {
      if (st.dirty) await push();
      const key = userKey(u.uid);
      await auth.signOut();
      A.clearLocal(key);
      A.toast("Đã đăng xuất.");
    };
    document.getElementById("del-acct").onclick = async () => {
      if (!confirm("Xóa vĩnh viễn tài khoản và toàn bộ tiến độ? Không thể hoàn tác.")) return;
      try {
        await db.collection("users").doc(u.uid).delete();
        const key = userKey(u.uid);
        await u.delete();
        A.clearLocal(key);
        A.toast("Đã xóa tài khoản.");
      } catch (e) {
        A.toast(e.code === "auth/requires-recent-login" ? "Vì lý do bảo mật, hãy đăng xuất, đăng nhập lại rồi xóa." : errMsg(e));
      }
    };
  }

  function errMsg(e) {
    const c = (e && e.code) || "";
    const map = {
      "auth/invalid-email": "Email không hợp lệ.",
      "auth/missing-password": "Hãy nhập mật khẩu.",
      "auth/weak-password": "Mật khẩu quá yếu, cần ít nhất 6 ký tự.",
      "auth/email-already-in-use": "Email này đã có tài khoản, hãy bấm Đăng nhập.",
      "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
      "auth/invalid-login-credentials": "Email hoặc mật khẩu không đúng.",
      "auth/wrong-password": "Mật khẩu không đúng.",
      "auth/user-not-found": "Chưa có tài khoản với email này, hãy bấm Tạo tài khoản.",
      "auth/too-many-requests": "Thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.",
      "auth/network-request-failed": "Không có kết nối mạng.",
      "auth/unauthorized-domain": "Tên miền này chưa được cho phép trong Firebase (Authentication → Settings → Authorized domains).",
      "auth/operation-not-allowed": "Phương thức đăng nhập này chưa được bật trong Firebase.",
      "auth/admin-restricted-operation": "Việc tự tạo tài khoản đang bị tắt. Hãy liên hệ người quản lý app."
    };
    return map[c] || "Có lỗi xảy ra" + (c ? " (" + c + ")" : "") + ".";
  }

  window.Sync = { onLocalChange, renderAccount, push, _merge: merge };
  // app.js vẽ trang đầu tiên trước khi tệp này tải xong: vẽ lại nếu đang ở trang Tài khoản.
  if (/^#\/account/.test(location.hash)) A.rerender();
  init();
})();
