const container = document.getElementById("doctor-cards");
const toast = document.getElementById("doctor-message");
const searchInput = document.getElementById("aadhar-search");
const clearBtn = document.getElementById("clear-search");
let expandedCard = null;
let allMigrants = [];

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await fetch("/doctor/logout", { method: "POST" });
  window.location.href = "/";
});

searchInput?.addEventListener("input", () => {
  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    const filtered = allMigrants.filter(m => m.aadhar.includes(searchTerm));
    renderCards(filtered);
  } else {
    renderCards(allMigrants);
  }
});

clearBtn?.addEventListener("click", () => {
  searchInput.value = "";
  renderCards(allMigrants);
});

async function fetchMigrants() {
  try {
    const searchTerm = searchInput?.value.trim() || "";
    const url = searchTerm ? `/doctor/migrants?aadhar=${encodeURIComponent(searchTerm)}` : "/doctor/migrants";
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      toast.textContent = "✗ " + (data.error || "Failed to load migrants");
      toast.classList.add("error");
      toast.classList.remove("success");
      return;
    }
    allMigrants = data.migrants || [];
    renderCards(allMigrants);
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
        if (decision === "APPROVED") {
          const confirmMsg = `Approve ${m.name}'s medical clearance?`;
          if (!confirm(confirmMsg)) return;
          await decide(btn.dataset.id, decision);
        } else if (decision === "REJECTED") {
          // Show health form modal for rejection
          showHealthForm(m, btn.dataset.id);
        }
      });
    });
    
    container.appendChild(card);
  });
}

function showHealthForm(migrant, migrantId) {
  // Create modal
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h2 style="margin-bottom: 20px;">🏥 Health Form - Disapproved Traveler</h2>
      <p class="muted" style="margin-bottom: 20px;">Please fill in the health information for ${migrant.name}</p>
      <form id="health-form" style="display: grid; gap: 16px;">
        <div>
          <label style="display: block; margin-bottom: 6px; font-weight: 600;">Name</label>
          <input type="text" name="name" value="${migrant.name}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 6px; font-weight: 600;">Age</label>
          <input type="number" name="age" required min="1" max="120" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 6px; font-weight: 600;">Current Address</label>
          <textarea name="current_address" required rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: vertical;"></textarea>
        </div>
        <div>
          <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email ID</label>
          <input type="email" name="email" value="${migrant.email}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 6px; font-weight: 600;">Phone Number</label>
          <input type="tel" name="phone_number" required pattern="[0-9]{10}" placeholder="10-digit phone number" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 6px; font-weight: 600;">Disease Name</label>
          <input type="text" name="disease_name" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 6px; font-weight: 600;">Tier</label>
          <select name="tier" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            <option value="">Select Tier</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
          </select>
        </div>
        <div>
          <label style="display: block; margin-bottom: 6px; font-weight: 600;">Expected Recovery Date</label>
          <input type="date" name="expected_recovery_date" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <div style="display: flex; gap: 12px; margin-top: 10px;">
          <button type="submit" class="danger" style="flex: 1; padding: 12px;">Submit & Reject</button>
          <button type="button" id="cancel-health-form" class="secondary" style="flex: 1; padding: 12px;">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const form = modal.querySelector("#health-form");
  const cancelBtn = modal.querySelector("#cancel-health-form");
  
  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(modal);
  });
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const healthData = {
      name: formData.get("name"),
      age: formData.get("age"),
      current_address: formData.get("current_address"),
      email: formData.get("email"),
      phone_number: formData.get("phone_number"),
      disease_name: formData.get("disease_name"),
      tier: formData.get("tier"),
      expected_recovery_date: formData.get("expected_recovery_date"),
    };
    
    document.body.removeChild(modal);
    await decide(migrantId, "REJECTED", healthData);
  });
}

async function decide(id, decision, healthData = null) {
  const btn = container.querySelector(`button[data-id="${id}"][data-d="${decision}"]`);
  if (!btn) return;
  
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> Processing...';
  
  try {
    const payload = { decision };
    if (healthData) {
      payload.health_data = healthData;
    }
    
    const res = await fetch(`/doctor/decision/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
