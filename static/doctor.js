const container = document.getElementById("doctor-cards");
const toast = document.getElementById("doctor-message");

document.getElementById("logout-btn").addEventListener("click", async () => {
  await fetch("/doctor/logout", { method: "POST" });
  window.location.href = "/";
});

async function fetchMigrants() {
  const res = await fetch("/doctor/migrants");
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
    container.innerHTML = "<p>No applications found.</p>";
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
      <p>Email: ${m.email}</p>
      <p>Status: ${m.doctor_approval}</p>
      <div class="actions">
        <a href="/doctor/medical-report/${m.id}" class="secondary" download>Medical Report</a>
        <button data-id="${m.id}" data-d="APPROVED">Approve</button>
        <button data-id="${m.id}" data-d="REJECTED" class="danger">Reject</button>
      </div>
    `;
    card.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => decide(btn.dataset.id, btn.dataset.d));
    });
    container.appendChild(card);
  });
}

async function decide(id, decision) {
  const res = await fetch(`/doctor/decision/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  const data = await res.json();
  toast.textContent = res.ok ? data.message : data.error || "Update failed";
  toast.classList.toggle("error", !res.ok);
  fetchMigrants();
}

fetchMigrants();
setInterval(fetchMigrants, 8000);
