(function () {
  const $ = (id) => (window.SMB && SMB.$ ? SMB.$(id) : document.getElementById(id));
  const toast = (msg) => (window.SMB && SMB.toast ? SMB.toast(msg) : console.log(msg));

  // ✅ 他ツールと衝突しないキーに変更（ここが移植で一番大事）
  const KEY_PREFIX = "tool_moji_counter_";
  const LS_OPTS = KEY_PREFIX + "opts_v1";
  const LS_HIST = KEY_PREFIX + "history_v1";

  const elText = $("text");
  const optNormalizeNL = $("optNormalizeNL");

  const out = {
    grapheme: $("cGrapheme"),
    noNL: $("cNoNL"),
    noNLNoSpace: $("cNoNLNoSpace"),
    lines: $("cLines"),
    bytes: $("cBytes"),
  };

  const elHistoryList = $("historyList");

  function normalizeNewlines(s) { return s.replace(/\r\n?/g, "\n"); }
  function removeNewlines(s) { return s.replace(/\n/g, ""); }
  function removeSpaces(s) { return s.replace(/[ \t\u3000]/g, ""); }

  function countGraphemes(s) {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const seg = new Intl.Segmenter("ja", { granularity: "grapheme" });
      let n = 0;
      for (const _ of seg.segment(s)) n++;
      return n;
    }
    return Array.from(s).length;
  }

  function countLines(s) { return s.length === 0 ? 0 : s.split("\n").length; }
  function utf8Bytes(s) { return new TextEncoder().encode(s).length; }

  function nowLabel() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function loadOpts() {
    try {
      const raw = localStorage.getItem(LS_OPTS);
      if (!raw) return;
      const o = JSON.parse(raw);
      if (typeof o.normalizeNL === "boolean") optNormalizeNL.checked = o.normalizeNL;
    } catch {}
  }

  function saveOpts() {
    try {
      localStorage.setItem(LS_OPTS, JSON.stringify({
        normalizeNL: optNormalizeNL.checked,
      }));
    } catch {}
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(LS_HIST);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function saveHistory(arr) {
    try { localStorage.setItem(LS_HIST, JSON.stringify(arr)); } catch {}
  }

  function renderHistory() {
    const hist = loadHistory();
    elHistoryList.innerHTML = "";

    if (hist.length === 0) {
      const li = document.createElement("li");
      li.style.color = "var(--mut)";
      li.style.fontSize = "13px";
      li.textContent = "履歴はまだありません（「履歴に保存」で追加）";
      elHistoryList.appendChild(li);
      return;
    }

    for (const item of hist) {
      const li = document.createElement("li");
      li.className = "histItem";

      const main = document.createElement("div");
      main.className = "histMain";

      const top = document.createElement("div");
      top.className = "histTop";

      const time = document.createElement("span");
      time.className = "histTime";
      time.textContent = item.time || "";

      const meta = document.createElement("span");
      meta.className = "histMeta";
      meta.textContent = `見た目:${item.g || 0} / 行:${item.l || 0}`;

      top.appendChild(time);
      top.appendChild(meta);

      const text = document.createElement("div");
      text.className = "histText";
      text.textContent = item.preview || "(空)";

      main.appendChild(top);
      main.appendChild(text);

      const btns = document.createElement("div");
      btns.className = "histBtns";

      const bUse = document.createElement("button");
      bUse.className = "mini";
      bUse.type = "button";
      bUse.textContent = "復元";
      bUse.addEventListener("click", () => {
        elText.value = item.text || "";
        scheduleCompute(true);
        toast("復元しました");
        elText.focus();
      });

      const bDel = document.createElement("button");
      bDel.className = "mini";
      bDel.type = "button";
      bDel.textContent = "削除";
      bDel.addEventListener("click", () => {
        const cur = loadHistory().filter(x => x.id !== item.id);
        saveHistory(cur);
        renderHistory();
      });

      btns.appendChild(bUse);
      btns.appendChild(bDel);

      li.appendChild(main);
      li.appendChild(btns);

      elHistoryList.appendChild(li);
    }
  }

  function pushHistory() {
    const text = elText.value;
    if (!text || text.trim().length === 0) {
      toast("空なので保存しません");
      return;
    }

    let s = text;
    if (optNormalizeNL.checked) s = normalizeNewlines(s);

    const g = countGraphemes(s);
    const l = countLines(s);
    const preview = s.replace(/\s+/g, " ").slice(0, 60);

    const item = {
      id: (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
      time: nowLabel(),
      text,
      preview,
      g,
      l,
    };

    const hist = loadHistory();
    if (hist[0] && hist[0].text === item.text) {
      hist[0] = item;
    } else {
      hist.unshift(item);
    }

    saveHistory(hist.slice(0, 5));
    renderHistory();
    toast("履歴に保存しました");
  }

  let lastInput = null;
  let timer = null;

  function compute() {
    let s = elText.value;
    if (optNormalizeNL.checked) s = normalizeNewlines(s);

    if (s === lastInput) return;
    lastInput = s;

    out.grapheme.textContent = countGraphemes(s);

    const sNoNL = removeNewlines(s);
    out.noNL.textContent = countGraphemes(sNoNL);

    const sNoNLNoSpace = removeSpaces(sNoNL);
    out.noNLNoSpace.textContent = countGraphemes(sNoNLNoSpace);

    out.lines.textContent = countLines(s);
    out.bytes.textContent = utf8Bytes(s);
  }

  function scheduleCompute(force = false) {
    if (force) lastInput = null;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      requestAnimationFrame(compute);
    }, 70);
  }

  $("btnClear").addEventListener("click", () => {
    elText.value = "";
    scheduleCompute(true);
    elText.focus();
  });

  $("btnSave").addEventListener("click", pushHistory);

  $("btnHistoryClear").addEventListener("click", () => {
    try { localStorage.removeItem(LS_HIST); } catch {}
    renderHistory();
    toast("履歴をクリアしました");
  });

  elText.addEventListener("input", () => scheduleCompute(false));

  optNormalizeNL.addEventListener("change", () => {
    saveOpts();
    scheduleCompute(true);
  });

  loadOpts();
  renderHistory();
  scheduleCompute(true);
})();
