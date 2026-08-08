(() => {
  "use strict";

  const CONFIG = window.TYPEFORGE_CONFIG || {};
  const API_URL = CONFIG.API_URL || "";
  const TOKEN_KEY = "typeforge_session_token";

  const state = {
    user: null,
    stats: null,
    duration: 30,
    language: "english",
    mode: "words",
    currentTest: null,
    testStarted: false,
    timer: null,
    timeLeft: 30,
    elapsed: 0
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  function toast(message, type = "success") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    $("#toastContainer").appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function setBusy(button, busy, text = "Loading...") {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.textContent = text;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
    }
  }

  async function api(action, payload = {}, authenticated = false) {
    if (!API_URL || API_URL.includes("PASTE_YOUR")) {
      throw new Error("API URL belum diatur di config.js");
    }

    const body = { action, ...payload };
    if (authenticated) {
      body.token = localStorage.getItem(TOKEN_KEY) || "";
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || "Request gagal");
    return data;
  }

  function showAuth() {
    $("#authScreen").classList.remove("hidden");
    $("#appShell").classList.add("hidden");
  }

  function showApp() {
    $("#authScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
  }

  function setAuthTab(tab) {
    $$("[data-auth-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.authTab === tab));
    $("#loginForm").classList.toggle("hidden", tab !== "login");
    $("#registerForm").classList.toggle("hidden", tab !== "register");
    $("#authTitle").textContent = tab === "login" ? "Welcome back" : "Create account";
    $("#authSubtitle").textContent = tab === "login"
      ? "Masuk untuk melanjutkan latihan mengetikmu."
      : "Daftar sekali, lalu semua hasil test akan tersimpan.";
  }

  function navigate(page) {
    $$(".page").forEach(p => p.classList.toggle("active", p.id === `page-${page}`));
    $$(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.page === page));
    $(".sidebar").classList.remove("open");

    if (page === "leaderboard") loadLeaderboard();
    if (page === "history") loadHistory();
    if (page === "dashboard") loadDashboard();
  }

  function initials(name) {
    const parts = String(name || "U").trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase()).join("") || "U";
  }

  function applyUser() {
    if (!state.user) return;
    const init = initials(state.user.displayName);
    $("#sidebarAvatar").textContent = init;
    $("#profileAvatar").textContent = init;
    $("#sidebarName").textContent = state.user.displayName;
    $("#sidebarUserId").textContent = `@${state.user.userId}`;
    $("#welcomeName").textContent = state.user.displayName.split(" ")[0];
    $("#profileName").textContent = state.user.displayName;
    $("#profileUserId").textContent = `@${state.user.userId}`;
    $("#profileJoined").textContent = formatDate(state.user.createdAt);
    $("#resultName").textContent = state.user.displayName.split(" ")[0];
  }

  function formatDate(value, short = false) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("id-ID", short
      ? { day: "2-digit", month: "short" }
      : { day: "2-digit", month: "short", year: "numeric" }
    ).format(d);
  }

  async function bootstrap() {
    wireEvents();
    try {
      const health = await api("health");
      $("#apiStatus").textContent = health.version || "online";
    } catch {
      $("#apiStatus").textContent = "offline";
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return showAuth();

    try {
      const data = await api("me", {}, true);
      state.user = data.user;
      applyUser();
      showApp();
      await loadDashboard();
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      showAuth();
      toast("Sesi berakhir. Silakan login lagi.", "error");
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const btn = e.submitter;
    setBusy(btn, true, "Signing in...");
    try {
      const data = await api("login", {
        userId: $("#loginUserId").value.trim(),
        password: $("#loginPassword").value
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      state.user = data.user;
      applyUser();
      showApp();
      navigate("dashboard");
      toast("Login berhasil.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(btn, false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const btn = e.submitter;
    setBusy(btn, true, "Creating...");
    try {
      const data = await api("register", {
        displayName: $("#registerName").value.trim(),
        userId: $("#registerUserId").value.trim(),
        password: $("#registerPassword").value
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      state.user = data.user;
      applyUser();
      showApp();
      navigate("dashboard");
      toast("Akun berhasil dibuat.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(btn, false);
    }
  }

  async function loadDashboard() {
    try {
      const data = await api("dashboard", {}, true);
      state.stats = data.stats;
      $("#statBestWpm").textContent = data.stats.bestWpm || 0;
      $("#statAvgWpm").textContent = data.stats.avgWpm || 0;
      $("#statAccuracy").textContent = data.stats.avgAccuracy || 0;
      $("#statTests").textContent = data.stats.totalTests || 0;
      $("#profileTests").textContent = data.stats.totalTests || 0;
      $("#profileBest").textContent = `${data.stats.bestWpm || 0} WPM`;

      const target = Math.max(20, (data.stats.bestWpm || 30) + 5);
      $("#challengeTarget").textContent = target;
      $("#challengeText").textContent = data.stats.totalTests
        ? `Target berikutnya: capai ${target} WPM dengan akurasi minimal 95%.`
        : "Selesaikan test pertamamu dan mulai bangun statistik.";

      renderRecent(data.recent || []);
    } catch (err) {
      if (err.message.toLowerCase().includes("session")) logout(false);
      else toast(err.message, "error");
    }
  }

  function renderRecent(items) {
    const box = $("#recentResults");
    if (!items.length) {
      box.className = "recent-results empty-state";
      box.textContent = "Belum ada hasil test.";
      return;
    }
    box.className = "recent-results";
    const max = Math.max(...items.map(x => Number(x.wpm) || 0), 1);
    box.innerHTML = items.slice(0, 5).map(item => `
      <div class="recent-row">
        <div class="wpm">${Number(item.wpm).toFixed(0)} <small>WPM</small></div>
        <div class="bar"><span style="width:${Math.min(100, (item.wpm / max) * 100)}%"></span></div>
        <div class="muted">${Number(item.accuracy).toFixed(1)}% ACC</div>
        <div class="muted">${formatDate(item.createdAt, true)}</div>
      </div>
    `).join("");
  }

  async function prepareTest() {
    const btn = $("#prepareTestBtn");
    setBusy(btn, true, "Generating...");
    try {
      const data = await api("newTest", {
        duration: state.duration,
        language: state.language,
        mode: state.mode
      }, true);

      state.currentTest = data.test;
      state.testStarted = false;
      state.timeLeft = state.currentTest.duration;
      state.elapsed = 0;
      clearInterval(state.timer);
      $("#typingInput").value = "";
      $("#timerValue").textContent = state.timeLeft;
      $("#liveWpm").textContent = "0";
      $("#liveAccuracy").textContent = "100";
      renderPassage("");
      $("#testSetup").classList.add("hidden");
      $("#resultPanel").classList.add("hidden");
      $("#typingArena").classList.remove("hidden");
      setTimeout(() => $("#typingInput").focus(), 50);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(btn, false);
    }
  }

  function renderPassage(typed) {
    if (!state.currentTest) return;
    const target = state.currentTest.passage;
    let html = "";
    for (let i = 0; i < target.length; i++) {
      let cls = "char";
      if (i < typed.length) cls += typed[i] === target[i] ? " correct" : " incorrect";
      else if (i === typed.length) cls += " current";
      html += `<span class="${cls}">${escapeHtml(target[i])}</span>`;
    }
    $("#passageDisplay").innerHTML = html;
    const current = $("#passageDisplay .current");
    if (current) current.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  async function startTestServerSide() {
    try {
      await api("startTest", { testId: state.currentTest.testId }, true);
    } catch (err) {
      toast(`Start sync: ${err.message}`, "error");
    }
  }

  function startLocalTimer() {
    if (state.testStarted) return;
    state.testStarted = true;
    startTestServerSide();

    const startedAt = performance.now();
    state.timer = setInterval(() => {
      state.elapsed = (performance.now() - startedAt) / 1000;
      state.timeLeft = Math.max(0, state.currentTest.duration - state.elapsed);
      $("#timerValue").textContent = Math.ceil(state.timeLeft);
      updateLiveMetrics();

      if (state.timeLeft <= 0) finishTest();
    }, 100);
  }

  function calculateLocal(typed) {
    if (!state.currentTest) return { wpm: 0, raw: 0, accuracy: 100, errors: 0 };
    const target = state.currentTest.passage;
    let correct = 0;
    let errors = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === target[i]) correct++;
      else errors++;
    }
    const seconds = Math.max(state.elapsed, 1);
    const minutes = seconds / 60;
    const raw = (typed.length / 5) / minutes;
    const wpm = Math.max(0, (correct / 5) / minutes);
    const accuracy = typed.length ? (correct / typed.length) * 100 : 100;
    return { wpm, raw, accuracy, errors };
  }

  function updateLiveMetrics() {
    const typed = $("#typingInput").value;
    const m = calculateLocal(typed);
    $("#liveWpm").textContent = Math.round(m.wpm);
    $("#liveAccuracy").textContent = Math.round(m.accuracy);
  }

  function handleTypingInput() {
    if (!state.currentTest) return;
    if (!state.testStarted && $("#typingInput").value.length) startLocalTimer();

    const target = state.currentTest.passage;
    if ($("#typingInput").value.length > target.length) {
      $("#typingInput").value = $("#typingInput").value.slice(0, target.length);
    }

    renderPassage($("#typingInput").value);
    updateLiveMetrics();

    if ($("#typingInput").value.length >= target.length) finishTest();
  }

  async function finishTest() {
    if (!state.currentTest || state.currentTest.finishing) return;
    state.currentTest.finishing = true;
    clearInterval(state.timer);
    $("#typingInput").disabled = true;

    try {
      const data = await api("finishTest", {
        testId: state.currentTest.testId,
        typedText: $("#typingInput").value
      }, true);

      $("#typingArena").classList.add("hidden");
      $("#resultPanel").classList.remove("hidden");
      $("#resultWpm").textContent = Math.round(data.result.wpm);
      $("#resultAccuracy").textContent = `${Number(data.result.accuracy).toFixed(1)}%`;
      $("#resultRaw").textContent = Math.round(data.result.rawWpm);
      $("#resultErrors").textContent = data.result.errors;
      await loadDashboard();
    } catch (err) {
      state.currentTest.finishing = false;
      toast(err.message, "error");
    } finally {
      $("#typingInput").disabled = false;
    }
  }

  function resetTestView() {
    clearInterval(state.timer);
    state.currentTest = null;
    state.testStarted = false;
    $("#typingArena").classList.add("hidden");
    $("#resultPanel").classList.add("hidden");
    $("#testSetup").classList.remove("hidden");
  }

  async function loadLeaderboard() {
    const body = $("#leaderboardBody");
    body.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
    try {
      const data = await api("leaderboard", { limit: 50 });
      const currentId = state.user?.userId?.toLowerCase();
      body.innerHTML = data.items.length ? data.items.map((item, idx) => `
        <tr>
          <td class="rank">${idx + 1}</td>
          <td>
            <div class="user-cell">
              <span class="mini-avatar">${escapeHtml(initials(item.displayName))}</span>
              <div><strong>${escapeHtml(item.displayName)}</strong>
                ${item.userId?.toLowerCase() === currentId ? '<span class="you-chip">YOU</span>' : ''}
              </div>
            </div>
          </td>
          <td><strong>${Math.round(item.wpm)}</strong> WPM</td>
          <td>${Number(item.accuracy).toFixed(1)}%</td>
          <td>${item.duration}s</td>
          <td>${formatDate(item.createdAt, true)}</td>
        </tr>
      `).join("") : `<tr><td colspan="6">Belum ada data leaderboard.</td></tr>`;
    } catch (err) {
      body.innerHTML = `<tr><td colspan="6">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function loadHistory() {
    const body = $("#historyBody");
    body.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;
    try {
      const data = await api("history", { limit: 100 }, true);
      body.innerHTML = data.items.length ? data.items.map(item => `
        <tr>
          <td>${formatDate(item.createdAt)}</td>
          <td><strong>${Math.round(item.wpm)}</strong></td>
          <td>${Math.round(item.rawWpm)}</td>
          <td>${Number(item.accuracy).toFixed(1)}%</td>
          <td>${item.errors}</td>
          <td>${escapeHtml(item.language)} / ${escapeHtml(item.mode)}</td>
          <td>${item.duration}s</td>
        </tr>
      `).join("") : `<tr><td colspan="7">Belum ada hasil test.</td></tr>`;
    } catch (err) {
      body.innerHTML = `<tr><td colspan="7">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function logout(showMessage = true) {
    localStorage.removeItem(TOKEN_KEY);
    state.user = null;
    state.stats = null;
    resetTestView();
    showAuth();
    if (showMessage) toast("Logout berhasil.");
  }

  function wireEvents() {
    $$("[data-auth-tab]").forEach(btn => btn.addEventListener("click", () => setAuthTab(btn.dataset.authTab)));
    $("#loginForm").addEventListener("submit", handleLogin);
    $("#registerForm").addEventListener("submit", handleRegister);

    $$(".toggle-password").forEach(btn => btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      input.type = input.type === "password" ? "text" : "password";
    }));

    $$(".nav-item").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.page)));
    $$("[data-page-link]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.pageLink)));
    $$("[data-go-test]").forEach(btn => btn.addEventListener("click", () => navigate("test")));

    $("#logoutBtn").addEventListener("click", () => logout(true));
    $("#mobileMenuBtn").addEventListener("click", () => $(".sidebar").classList.toggle("open"));

    $$("#durationOptions [data-duration]").forEach(btn => btn.addEventListener("click", () => {
      state.duration = Number(btn.dataset.duration);
      $$("#durationOptions .seg-btn").forEach(b => b.classList.toggle("active", b === btn));
    }));
    $("#languageSelect").addEventListener("change", e => state.language = e.target.value);
    $("#modeSelect").addEventListener("change", e => state.mode = e.target.value);

    $("#prepareTestBtn").addEventListener("click", prepareTest);
    $("#restartTestBtn").addEventListener("click", resetTestView);
    $("#retryBtn").addEventListener("click", () => {
      resetTestView();
      prepareTest();
    });

    $("#typingInput").addEventListener("input", handleTypingInput);
    $("#typingInput").addEventListener("paste", e => {
      e.preventDefault();
      toast("Paste dinonaktifkan pada typing test.", "error");
    });

    $("#refreshLeaderboardBtn").addEventListener("click", loadLeaderboard);
    $("#refreshHistoryBtn").addEventListener("click", loadHistory);
  }

  bootstrap();
})();
