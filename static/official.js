const container = document.getElementById("official-cards");
const toast = document.getElementById("official-message");
const createForm = document.getElementById("create-doctor-form");
const createMsg = document.getElementById("create-doctor-msg");

document.getElementById("logout-btn").addEventListener("click", async () => {
  await fetch("/official/logout", { method: "POST" });
  window.location.href = "/";
});

async function fetchMigrants() {
  const res = await fetch("/official/migrants");
  const data = await res.json();
  if (!res.ok) {
    toast.textContent = data.error || "Failed to load migrants";
    toast.classList.add("error");
    return;
  }
  renderCards(data.migrants || []);
}

function renderCards(list) {
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML = "<p>No doctor-approved migrants yet.</p>";
    return;
  }
  list.forEach((m) => {
    const card = document.createElement("div");
    card.className = "card-item";
    card.innerHTML = `
      <h3>${m.name}</h3>
      <p>Aadhar: ${m.aadhar}</p>
      <p>Route: ${m.source} ➜ ${m.destination}</p>
      <p>Travel: ${m.medium_of_travel}</p>
      <p>Doctor: ${m.doctor_approval}</p>
      <p>Official: ${m.official_approval}</p>
      <form class="approve-form" data-id="${m.id}" enctype="multipart/form-data">
        <label>Upload Approval Letter (PDF/Image)</label>
        <input type="file" name="approval_letter" required>
        <div class="actions">
          <button type="submit" data-decision="APPROVED">Approve</button>
          <button type="button" data-decision="REJECTED" class="danger">Reject</button>
        </div>
      </form>
    `;
    const form = card.querySelector("form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitDecision(form.dataset.id, "APPROVED", new FormData(form));
    });
    form.querySelector('button[data-decision="REJECTED"]').addEventListener("click", () => {
      const fd = new FormData();
      fd.append("decision", "REJECTED");
      submitDecision(form.dataset.id, "REJECTED", fd);
    });
    container.appendChild(card);
  });
}

async function submitDecision(id, decision, formData) {
  formData.append("decision", decision);
  const res = await fetch(`/official/decision/${id}`, { method: "POST", body: formData });
  const data = await res.json();
  toast.textContent = res.ok ? data.message : data.error || "Failed";
  toast.classList.toggle("error", !res.ok);
  fetchMigrants();
}

fetchMigrants();
setInterval(fetchMigrants, 8000);

if (createForm) {
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(createForm).entries());
    const res = await fetch("/official/create-doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    createMsg.textContent = res.ok ? data.message : data.error || "Failed to create doctor";
    createMsg.classList.toggle("error", !res.ok);
    if (res.ok) createForm.reset();
  });
}
