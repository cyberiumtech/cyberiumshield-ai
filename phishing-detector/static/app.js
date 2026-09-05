(function () {
  const form = document.getElementById("scan-form");
  const input = document.getElementById("url-input");
  const btn = document.getElementById("scan-btn");
  const resultBox = document.getElementById("result");
  const errorBox = document.getElementById("error");
  const chips = document.querySelectorAll(".sample-chip");

  const RISK_COLORS = {
    critical: "var(--danger-strong)",
    high: "var(--danger)",
    low: "var(--warn)",
    minimal: "var(--safe)",
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.dataset.url;
      input.focus();
      form.requestSubmit();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = input.value.trim();
    if (!url) return;

    setLoading(true);
    hideError();

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Something went wrong scanning that URL.");
        resultBox.hidden = true;
        return;
      }

      renderResult(data);
    } catch (err) {
      showError("Couldn't reach the scanner. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    btn.disabled = isLoading;
    btn.classList.toggle("loading", isLoading);
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function renderResult(data) {
    resultBox.hidden = false;

    const badge = document.getElementById("verdict-badge");
    badge.textContent = data.prediction === "phishing"
      ? "Likely phishing"
      : "Looks legitimate";
    badge.className = "verdict-badge " + data.prediction;

    document.getElementById("verdict-url").textContent = data.url;

    const pct = Math.round(data.phishing_probability * 100);
    const ring = document.getElementById("score-ring");
    const color = RISK_COLORS[data.risk_level] || "var(--safe)";
    ring.style.setProperty("--pct", pct);
    ring.style.setProperty("--ring-color", color);
    document.getElementById("score-number").textContent = pct + "%";

    const meter = document.getElementById("meter-fill");
    meter.style.width = pct + "%";
    meter.style.background = color;

    const list = document.getElementById("signals-list");
    list.innerHTML = "";
    data.signals.forEach((sig) => {
      const li = document.createElement("li");
      li.className = sig.flagged ? "flagged" : "";
      const label = document.createElement("span");
      label.className = "sig-label";
      label.textContent = sig.label;
      const value = document.createElement("span");
      value.className = "sig-value";
      value.textContent = typeof sig.value === "boolean"
        ? (sig.value ? "yes" : "no")
        : sig.value;
      li.appendChild(label);
      li.appendChild(value);
      list.appendChild(li);
    });

    resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
})();
