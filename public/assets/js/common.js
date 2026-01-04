// 共通：トースト + Cloudflare Web Analytics（任意）
// 他ツールでも使い回す想定。

(function () {
  window.SMB = window.SMB || {};

  SMB.$ = (id) => document.getElementById(id);

  SMB.toast = (msg, ms = 1200) => {
    const t = SMB.$("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), ms);
  };

  SMB.isLocal = () => {
    const host = location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "";
  };

  // ここにトークンを入れたら全ページで有効化される
  const CF_TOKEN = ""; // ← Cloudflare Web Analytics token（空なら無効）

  if (CF_TOKEN && !SMB.isLocal()) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = "https://static.cloudflareinsights.com/beacon.min.js";
    s.setAttribute("data-cf-beacon", JSON.stringify({ token: CF_TOKEN }));
    document.head.appendChild(s);
  }
})();
