// /js/app.js  — CLEAN VERSION
window.MedsCalc = window.MedsCalc || {};

(function (ns) {
  // helpers
  const qs = (k) => new URLSearchParams(location.search).get(k);

  async function fetchTopic(topic) {
    const res = await fetch(`./data/${topic}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Cannot load topic: ${topic}`);
    return res.json();
  }

  function saveLastResult(payload) {
    sessionStorage.setItem("lastResult", JSON.stringify(payload));
  }

  // QUESTION PAGE (SafeMedicate-style)
  ns.loadQuestionPage = async function () {
    const topic = qs("topic");
    const idx = parseInt(qs("idx") || "0", 10);
    const bank = await fetchTopic(topic);
    const q = bank.questions[idx];

    // Titles/progress
    document.getElementById("topic-title").textContent = bank.topic;
    document.getElementById("qnum").textContent = (idx + 1).toString();
    document.getElementById("qtotal").textContent = bank.questions.length.toString();

    // Patient panel
    const p = q.patient || {};
    document.getElementById("patient-card").innerHTML = `
      <h2 class="h2-tight">${q.title || "Question"}</h2>
      <dl>
        <dt>Patient</dt><dd>${p.name || "-"}</dd>
        <dt>Sex</dt><dd>${p.sex || "-"}</dd>
        <dt>Age</dt><dd>${p.age || "-"}</dd>
        <dt>Height</dt><dd>${p.height || "-"}</dd>
        <dt>Bodyweight</dt><dd>${p.weight || "-"}</dd>
        <dt>Diagnosis</dt><dd>${p.diagnosis || "-"}</dd>
        <dt>Allergies</dt><dd>${p.allergies || "-"}</dd>
      </dl>
    `;

    // Monograph panel
    const m = q.monograph || {};
    document.getElementById("monograph-card").innerHTML = `
      <h2 class="h2-tight">Drug Monograph</h2>
      <dl>
        <dt>Medication Name</dt><dd>${m.medication || "-"}</dd>
        <dt>Indication</dt><dd>${m.indication || "-"}</dd>
        <dt>Administration Route</dt><dd>${m.route || "-"}</dd>
        <dt>Dose Calculation</dt><dd>${m.dose_calc || "-"}</dd>
        <dt>Maximum Dose</dt><dd>${m.max_dose || "-"}</dd>
        <dt>Dispensed Dose</dt><dd>${m.dispensed_dose || "-"}</dd>
      </dl>
    `;

    // Rounding banner
    document.getElementById("rounding-banner").textContent = q.rounding || "";

    // Units badge for final answer
    document.getElementById("answer-units").textContent =
      q.equation?.units || q.units || "";

    // Clear
    document.getElementById("clear").addEventListener("click", () => {
      ["n1", "n2", "answer"].forEach((id) => (document.getElementById(id).value = ""));
      ["u1", "u2", "op"].forEach((id) => (document.getElementById(id).selectedIndex = 0));
    });

    // Submit → judge by final numeric answer (with tolerance)
    document.getElementById("submit").addEventListener("click", (e) => {
      e.preventDefault();
      const ansStr = document.getElementById("answer").value.trim();
      const userAnswer = ansStr === "" ? NaN : Number(ansStr);

      const expected = q.equation?.answer ?? q.answer;
      const tol = q.equation?.tolerance ?? q.tolerance ?? 0;
      const correct =
        !Number.isNaN(userAnswer) && Math.abs(userAnswer - expected) <= tol;

      const working = `
        ${document.getElementById("n1").value} ${document.getElementById("u1").value}
        ${document.getElementById("op").value}
        ${document.getElementById("n2").value} ${document.getElementById("u2").value}
        = ${ansStr} ${q.equation?.units || q.units || ""}
      `.replace(/\s+/g, " ").trim();

      saveLastResult({
        topic,
        idx,
        correct,
        userAnswer,
        requiredAnswer: expected,
        units: q.equation?.units || q.units || "",
        explanation: q.explanation || "",
        correctWorking: q.correct_working || "",
        working,
        nextIdx: idx + 1,
      });

      location.href = "./feedback.html";
    });
  };

  // FEEDBACK PAGE
  ns.loadFeedbackPage = function () {
    const raw = sessionStorage.getItem("lastResult");
    const r = raw ? JSON.parse(raw) : null;
    const box = document.getElementById("result");
    if (!r) {
      box.innerHTML = `<p>No result found.</p>`;
      return;
    }
    box.innerHTML = `
      <h2>${r.correct ? "✅ Correct!" : "❌ Incorrect"}</h2>
      <p><strong>Your answer:</strong> ${r.userAnswer} ${r.units}</p>
      <p><strong>Expected:</strong> ${r.requiredAnswer} ${r.units}</p>
      ${r.correctWorking ? `<pre style="white-space:pre-wrap;">${r.correctWorking}</pre>` : ""}
      ${r.explanation ? `<p>${r.explanation}</p>` : ""}
      ${r.working ? `<details style="margin-top:8px;"><summary>Your working</summary>
        <pre style="white-space:pre-wrap;">${r.working}</pre></details>` : ""}
    `;
    document.getElementById("next").href =
      `./question.html?topic=${encodeURIComponent(r.topic)}&idx=${r.nextIdx}`;
  };
})(window.MedsCalc);
