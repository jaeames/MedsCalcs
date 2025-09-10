window.MedsCalc = (function () {
  // Simple helpers
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const withinTol = (a, b, tol) => Math.abs(a - b) <= tol;

  async function fetchTopic(topic) {
    const res = await fetch(`./data/${topic}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Cannot load topic: ${topic}`);
    return res.json();
  }

  function saveLastResult(payload) {
    sessionStorage.setItem("lastResult", JSON.stringify(payload));
  }
  function readLastResult() {
    const raw = sessionStorage.getItem("lastResult");
    return raw ? JSON.parse(raw) : null;
  }

  // QUESTION PAGE
  async function loadQuestionPage() {
    const topic = qs("topic");
    const idx = parseInt(qs("idx") || "0", 10);

    const bank = await fetchTopic(topic);
    const q = bank.questions[idx];
    if (!q) {
      document.getElementById("q-stem").innerHTML = "<p>No more questions in this topic.</p>";
      document.getElementById("answer-form").style.display = "none";
      return;
    }

    // Render
    document.getElementById("q-stem").innerHTML = `
      <h2>${q.title || topic}</h2>
      <p>${q.stem}</p>
      ${q.units ? `<p><em>Answer units: ${q.units}</em></p>` : ""}
    `;
    document.getElementById("q-hint").innerHTML = `
      <p><strong>Formula:</strong> ${q.formula}</p>
      ${q.hint ? `<p>${q.hint}</p>` : ""}
      <p><small>Rounding: ${q.rounding || "as stated"}</small></p>
    `;

    document.getElementById("answer-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const working = document.getElementById("working").value.trim();
      const ansStr = document.getElementById("answer").value.trim();
      const userAnswer = ansStr === "" ? NaN : Number(ansStr);

      const correct = !Number.isNaN(userAnswer) && withinTol(userAnswer, q.answer, q.tolerance ?? 0);
      const payload = {
        topic,
        idx,
        correct,
        userAnswer,
        working,
        requiredAnswer: q.answer,
        units: q.units || "",
        explanation: q.explanation || "",
        correctWorking: q.correct_working || "",
        nextIdx: idx + 1,
      };
      saveLastResult(payload);
      location.href = `./feedback.html`;
    });
  }

  // FEEDBACK PAGE
  function loadFeedbackPage() {
    const r = readLastResult();
    const box = document.getElementById("result");
    if (!r) {
      box.innerHTML = `<p>No result found. Try a topic first.</p>`;
      return;
    }

    box.innerHTML = `
      <h2>${r.correct ? "✅ Correct!" : "❌ Incorrect"}</h2>
      <p><strong>Your answer:</strong> ${r.userAnswer} ${r.units}</p>
      <p><strong>Expected:</strong> ${r.requiredAnswer} ${r.units}</p>
      ${r.correctWorking ? `<pre style="white-space:pre-wrap;">${r.correctWorking}</pre>` : ""}
      ${r.explanation ? `<p>${r.explanation}</p>` : ""}
      ${r.working ? `<details style="margin-top:8px;"><summary>Your working</summary><pre style="white-space:pre-wrap;">${r.working}</pre></details>` : ""}
    `;

    const nextLink = document.getElementById("next");
    nextLink.href = `./question.html?topic=${encodeURIComponent(r.topic)}&idx=${r.nextIdx}`;
  }

  return { loadQuestionPage, loadFeedbackPage };
})();