const container = document.getElementById("doctor-cards");
const toast = document.getElementById("doctor-message");
let expandedCard = null;

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await fetch("/doctor/logout", { method: "POST" });
  window.location.href = "/";
});

async function fetchMigrants() {
  try {
    const res = await fetch("/doctor/migrants");
    const data = await res.json();
    if (!res.ok) {
      toast.textContent = "✗ " + (data.error || "Failed to load migrants");
      toast.classList.add("error");
      toast.classList.remove("success");
      return;
    }
    renderCards(data.migrants || []);
  } catch (err) {
    toast.textContent = "✗ Network error. Please refresh.";
    toast.classList.add("error");
  }
}

function renderCards(list) {
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <h2 style="margin-bottom: 12px;">📋 No Applications</h2>
        <p class="muted">No migrant applications found. Check back later.</p>
      </div>
    `;
    return;
  }
  list.forEach((m, index) => {
    const card = document.createElement("div");
    card.className = "card-item";
    card.style.animationDelay = `${index * 0.1}s`;
    
    const isExpanded = expandedCard === m.id;
    const statusClass = m.doctor_approval.toLowerCase();
    
    card.innerHTML = `
      <h3>👤 ${m.name}</h3>
      <p><strong>🆔 Aadhar:</strong> ${m.aadhar}</p>
      <p><strong>📍 Route:</strong> ${m.source} ➜ ${m.destination}</p>
      <p><strong>🚗 Travel:</strong> ${m.medium_of_travel}</p>
      <p><strong>📧 Email:</strong> ${m.email}</p>
      <div style="margin: 12px 0;">
        <span class="pill ${statusClass}">Status: ${m.doctor_approval}</span>
      </div>
      ${isExpanded ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
          <p class="muted" style="font-size: 0.85rem; margin-bottom: 12px;">
            <strong>Application ID:</strong> ${m.id}<br>
            <strong>Created:</strong> ${m.created_at ? new Date(m.created_at).toLocaleString() : "N/A"}
          </p>
        </div>
      ` : ''}
      <div class="actions">
        <a href="/doctor/medical-report/${m.id}" class="secondary" download style="text-decoration: none; display: inline-block; text-align: center;">
          📄 Medical Report
        </a>
        <button data-id="${m.id}" data-d="APPROVED" class="primary" ${m.doctor_approval === "APPROVED" ? "disabled" : ""}>
          ✓ Approve
        </button>
        <button data-id="${m.id}" data-d="REJECTED" class="danger" ${m.doctor_approval === "REJECTED" ? "disabled" : ""}>
          ✗ Reject
        </button>
      </div>
    `;
    
    if (isExpanded) {
      card.classList.add("expanded");
    }
    
    card.addEventListener("click", (e) => {
      if (!e.target.closest("button") && !e.target.closest("a")) {
        expandedCard = expandedCard === m.id ? null : m.id;
        renderCards(list);
      }
    });
    
    card.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        const decision = btn.dataset.d;
        const confirmMsg = decision === "APPROVED" 
          ? `Approve ${m.name}'s medical clearance?`
          : `Reject ${m.name}'s medical clearance?`;
        if (!confirm(confirmMsg)) return;
        await decide(btn.dataset.id, decision);
      });
    });
    
    container.appendChild(card);
  });
}

async function decide(id, decision) {
  const btn = container.querySelector(`button[data-id="${id}"][data-d="${decision}"]`);
  if (!btn) return;
  
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> Processing...';
  
  try {
    const res = await fetch(`/doctor/decision/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json();
    
    if (res.ok) {
      toast.textContent = "✓ " + (data.message || "Decision updated successfully");
      toast.classList.remove("error");
      toast.classList.add("success");
    } else {
      toast.textContent = "✗ " + (data.error || "Update failed");
      toast.classList.remove("success");
      toast.classList.add("error");
    }
    await fetchMigrants();
  } catch (err) {
    toast.textContent = "✗ Network error. Please try again.";
    toast.classList.add("error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

fetchMigrants();
setInterval(fetchMigrants, 8000);
