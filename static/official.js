const container = document.getElementById("official-cards");
const toast = document.getElementById("official-message");
const createForm = document.getElementById("create-doctor-form");
const createMsg = document.getElementById("create-doctor-msg");

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await fetch("/official/logout", { method: "POST" });
  window.location.href = "/";
});

async function fetchMigrants() {
  try {
    const res = await fetch("/official/migrants");
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
        <h2 style="margin-bottom: 12px;">📋 No Approved Migrants</h2>
        <p class="muted">No doctor-approved migrants yet. They will appear here once doctors approve their medical clearance.</p>
      </div>
    `;
    return;
  }
  list.forEach((m, index) => {
    const card = document.createElement("div");
    card.className = "card-item";
    card.style.animationDelay = `${index * 0.1}s`;
    
    const doctorStatus = m.doctor_approval.toLowerCase();
    const officialStatus = m.official_approval.toLowerCase();
    
    card.innerHTML = `
      <h3>👤 ${m.name}</h3>
      <p><strong>🆔 Aadhar:</strong> ${m.aadhar}</p>
      <p><strong>📍 Route:</strong> ${m.source} ➜ ${m.destination}</p>
      <p><strong>🚗 Travel:</strong> ${m.medium_of_travel}</p>
      <div style="margin: 12px 0; display: flex; flex-wrap: wrap; gap: 8px;">
        <span class="pill ${doctorStatus}">Doctor: ${m.doctor_approval}</span>
        <span class="pill ${officialStatus}">Official: ${m.official_approval}</span>
      </div>
      <form class="approve-form" data-id="${m.id}" enctype="multipart/form-data" style="margin-top: 16px;">
        <label>📄 Upload Approval Letter (PDF/Image)</label>
        <input type="file" name="approval_letter" accept=".pdf,.png,.jpg,.jpeg" required>
        <div class="actions">
          <button type="submit" data-decision="APPROVED" class="primary" ${m.official_approval === "APPROVED" ? "disabled" : ""}>
            ✓ Approve & Send Letter
          </button>
          <button type="button" data-decision="REJECTED" class="danger" ${m.official_approval === "REJECTED" ? "disabled" : ""}>
            ✗ Reject
          </button>
        </div>
      </form>
    `;
    
    const form = card.querySelector("form");
    const submitBtn = form.querySelector('button[type="submit"]');
    
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submitBtn.disabled) return;
      const confirmMsg = `Approve ${m.name} and send approval letter?`;
      if (!confirm(confirmMsg)) return;
      await submitDecision(form.dataset.id, "APPROVED", new FormData(form));
    });
    
    form.querySelector('button[data-decision="REJECTED"]').addEventListener("click", async () => {
      if (form.querySelector('button[data-decision="REJECTED"]').disabled) return;
      const confirmMsg = `Reject ${m.name}'s application?`;
      if (!confirm(confirmMsg)) return;
      const fd = new FormData();
      fd.append("decision", "REJECTED");
      await submitDecision(form.dataset.id, "REJECTED", fd);
    });
    
    container.appendChild(card);
  });
}

async function submitDecision(id, decision, formData) {
  const card = container.querySelector(`form[data-id="${id}"]`).closest(".card-item");
  const btn = card.querySelector(`button[data-decision="${decision}"]`);
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> Processing...';
  
  try {
    formData.append("decision", decision);
    const res = await fetch(`/official/decision/${id}`, { method: "POST", body: formData });
    const data = await res.json();
    
    if (res.ok) {
      toast.textContent = "✓ " + (data.message || "Decision updated successfully");
      toast.classList.remove("error");
      toast.classList.add("success");
    } else {
      toast.textContent = "✗ " + (data.error || "Failed");
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

if (createForm) {
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = createForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Creating...';
    
    try {
      const payload = Object.fromEntries(new FormData(createForm).entries());
      const res = await fetch("/official/create-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (res.ok) {
        createMsg.textContent = "✓ " + (data.message || "Doctor account created successfully");
        createMsg.classList.remove("error");
        createMsg.classList.add("success");
        createForm.reset();
      } else {
        createMsg.textContent = "✗ " + (data.error || "Failed to create doctor");
        createMsg.classList.remove("success");
        createMsg.classList.add("error");
      }
    } catch (err) {
      createMsg.textContent = "✗ Network error. Please try again.";
      createMsg.classList.add("error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}
