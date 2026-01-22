const container = document.getElementById("travelers-list");
const toast = document.getElementById("health-admin-message");
const modal = document.getElementById("traveler-modal");
const closeModalBtn = document.getElementById("close-modal");
let selectedTravelerId = null;

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await fetch("/health-admin/logout", { method: "POST" });
  window.location.href = "/";
});

closeModalBtn?.addEventListener("click", () => {
  modal.style.display = "none";
});

async function fetchTravelers() {
  try {
    const res = await fetch("/health-admin/disapproved-travelers");
    const data = await res.json();
    if (!res.ok) {
      toast.textContent = "✗ " + (data.error || "Failed to load travelers");
      toast.classList.add("error");
      toast.classList.remove("success");
      return;
    }
    renderTravelers(data.travelers || []);
  } catch (err) {
    toast.textContent = "✗ Network error. Please refresh.";
    toast.classList.add("error");
  }
}

function renderTravelers(list) {
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <h2 style="margin-bottom: 12px;">📋 No Disapproved Travelers</h2>
        <p class="muted">No disapproved travelers found. They will appear here once doctors reject applications with health information.</p>
      </div>
    `;
    return;
  }
  list.forEach((t, index) => {
    const card = document.createElement("div");
    card.className = "card-item";
    card.style.animationDelay = `${index * 0.1}s`;
    
    const tierColors = {1: "#ff9800", 2: "#f44336", 3: "#d32f2f"};
    const tierColor = tierColors[t.tier] || "#666";
    
    card.innerHTML = `
      <h3>👤 ${t.name}</h3>
      <p><strong>🆔 Aadhar:</strong> ${t.aadhar}</p>
      <p><strong>🏥 Disease:</strong> ${t.disease_name || "N/A"}</p>
      <div style="margin: 12px 0;">
        <span class="pill" style="background: ${tierColor}; color: white;">Tier: ${t.tier}</span>
        ${t.qr_generated ? '<span class="pill success">QR Generated</span>' : '<span class="pill pending">QR Pending</span>'}
      </div>
      <div class="actions">
        <button data-id="${t.id}" class="primary" onclick="viewTravelerDetails('${t.id}')">
          👁️ View Details
        </button>
      </div>
    `;
    
    container.appendChild(card);
  });
}

async function viewTravelerDetails(travelerId) {
  selectedTravelerId = travelerId;
  try {
    const res = await fetch(`/health-admin/traveler/${travelerId}`);
    const data = await res.json();
    if (!res.ok) {
      toast.textContent = "✗ " + (data.error || "Failed to load details");
      toast.classList.add("error");
      return;
    }
    
    const t = data.traveler;
    const tierColors = {1: "#ff9800", 2: "#f44336", 3: "#d32f2f"};
    const tierColor = tierColors[t.tier] || "#666";
    
    document.getElementById("traveler-details-content").innerHTML = `
      <div style="display: grid; gap: 16px;">
        <div><strong>Name:</strong> ${t.name}</div>
        <div><strong>Age:</strong> ${t.age}</div>
        <div><strong>Aadhar Number:</strong> ${t.aadhar}</div>
        <div><strong>Email:</strong> ${t.email}</div>
        <div><strong>Phone Number:</strong> ${t.phone_number}</div>
        <div><strong>Current Address:</strong> ${t.current_address}</div>
        <div><strong>Disease Name:</strong> ${t.disease_name}</div>
        <div><strong>Tier:</strong> <span style="background: ${tierColor}; color: white; padding: 4px 12px; border-radius: 4px;">${t.tier}</span></div>
        <div><strong>Expected Recovery Date:</strong> ${t.expected_recovery_date}</div>
        <div><strong>Doctor ID:</strong> ${t.doctor_id}</div>
        <div><strong>Created At:</strong> ${t.created_at ? new Date(t.created_at).toLocaleString() : "N/A"}</div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;">
          <button onclick="updateQR('${travelerId}')" class="primary" style="width: 100%; padding: 12px; font-size: 16px;" ${t.qr_generated ? 'disabled' : ''}>
            ${t.qr_generated ? '✓ QR Already Generated' : '📱 UPDATE QR & Send Health Warning Letter'}
          </button>
          ${t.qr_generated ? `
            <button onclick="downloadWarningLetter('${travelerId}')" class="secondary" style="width: 100%; padding: 12px; font-size: 16px; margin-top: 12px;">
              📥 Download Warning Letter
            </button>
          ` : ''}
        </div>
      </div>
    `;
    
    modal.style.display = "flex";
  } catch (err) {
    toast.textContent = "✗ Network error. Please try again.";
    toast.classList.add("error");
  }
}

async function updateQR(travelerId) {
  const btn = document.querySelector(`button[onclick="updateQR('${travelerId}')"]`);
  if (!btn || btn.disabled) return;
  
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> Generating QR & Sending Letter...';
  
  try {
    const res = await fetch(`/health-admin/update-qr/${travelerId}`, {
      method: "POST",
    });
    const data = await res.json();
    
    if (res.ok) {
      toast.textContent = "✓ " + (data.message || "QR generated and letter sent successfully");
      toast.classList.remove("error");
      toast.classList.add("success");
      await fetchTravelers();
      if (selectedTravelerId === travelerId) {
        await viewTravelerDetails(travelerId);
      }
    } else {
      toast.textContent = "✗ " + (data.error || "Failed to generate QR");
      toast.classList.remove("success");
      toast.classList.add("error");
    }
  } catch (err) {
    toast.textContent = "✗ Network error. Please try again.";
    toast.classList.add("error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function downloadWarningLetter(travelerId) {
  try {
    const res = await fetch(`/health-admin/download-warning-letter/${travelerId}`);
    if (!res.ok) {
      const data = await res.json();
      toast.textContent = "✗ " + (data.error || "Failed to download");
      toast.classList.add("error");
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health_warning_${new Date().getTime()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    toast.textContent = "✓ PDF downloaded successfully!";
    toast.classList.remove("error");
    toast.classList.add("success");
  } catch (err) {
    toast.textContent = "✗ Download failed. Please try again.";
    toast.classList.add("error");
  }
}

fetchTravelers();
setInterval(fetchTravelers, 10000);
