const container = document.getElementById("travelers-list");
const toast = document.getElementById("authorities-message");
const scanBtn = document.getElementById("scan-btn");
const qrInput = document.getElementById("qr-input");
const scanResult = document.getElementById("scan-result");

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await fetch("/authorities/logout", { method: "POST" });
  window.location.href = "/";
});

scanBtn?.addEventListener("click", async () => {
  const qrData = qrInput.value.trim();
  if (!qrData) {
    toast.textContent = "✗ Please enter QR code data";
    toast.classList.add("error");
    return;
  }
  
  await scanQR(qrData);
});

async function scanQR(qrData) {
  scanBtn.disabled = true;
  scanBtn.innerHTML = '<span class="loading"></span> Scanning...';
  
  try {
    const res = await fetch("/authorities/scan-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_data: qrData }),
    });
    const data = await res.json();
    
    if (!res.ok) {
      toast.textContent = "✗ " + (data.error || "Scan failed");
      toast.classList.add("error");
      scanResult.style.display = "none";
      return;
    }
    
    displayScanResult(data);
  } catch (err) {
    toast.textContent = "✗ Network error. Please try again.";
    toast.classList.add("error");
    scanResult.style.display = "none";
  } finally {
    scanBtn.disabled = false;
    scanBtn.innerHTML = "🔍 Scan QR Code";
  }
}

function displayScanResult(data) {
  scanResult.style.display = "block";
  
  if (data.flag === "RED") {
    // Disapproved traveler
    const tierColors = {1: "#ff9800", 2: "#f44336", 3: "#d32f2f"};
    const tierColor = tierColors[data.tier] || "#666";
    const penaltyAmounts = {1: 5000, 2: 10000, 3: 20000};
    const penalty = penaltyAmounts[data.tier] || 5000;
    
    scanResult.innerHTML = `
      <div style="background: #ffebee; border: 3px solid #f44336; border-radius: 12px; padding: 24px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 72px; margin-bottom: 16px;">🚩</div>
          <h2 style="color: #d32f2f; margin-bottom: 8px;">RED FLAG - DISAPPROVED TRAVELER</h2>
          <p style="color: #c62828; font-weight: 600; font-size: 18px;">${data.message}</p>
        </div>
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-bottom: 16px;">Traveler Information:</h3>
          <div style="display: grid; gap: 12px;">
            <div><strong>Name:</strong> ${data.name}</div>
            <div><strong>Aadhar Number:</strong> ${data.aadhar}</div>
            <div><strong>Tier:</strong> <span style="background: ${tierColor}; color: white; padding: 6px 16px; border-radius: 6px; font-weight: 600;">Tier ${data.tier}</span></div>
            ${data.disease_name ? `<div><strong>Disease:</strong> ${data.disease_name}</div>` : ''}
          </div>
        </div>
        <div style="background: #fff3e0; border: 2px solid #ff9800; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-bottom: 12px; color: #e65100;">⚠️ Penalty Information</h3>
          <p style="font-size: 18px; margin-bottom: 12px;"><strong>Penalty Amount:</strong> <span style="color: #d32f2f; font-size: 24px; font-weight: 700;">₹${penalty}</span></p>
          <p style="color: #666; font-size: 14px;">Higher tier indicates more serious health concern, resulting in heavier penalty.</p>
        </div>
        <button onclick="levyPenalty('${data.aadhar}', ${penalty})" class="danger" style="width: 100%; padding: 14px; font-size: 16px; font-weight: 600;">
          ⚖️ Levy Penalty (₹${penalty})
        </button>
      </div>
    `;
  } else if (data.flag === "GREEN") {
    // Approved traveler
    scanResult.innerHTML = `
      <div style="background: #e8f5e9; border: 3px solid #4caf50; border-radius: 12px; padding: 24px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 72px; margin-bottom: 16px;">✅</div>
          <h2 style="color: #2e7d32; margin-bottom: 8px;">GREEN FLAG - APPROVED TRAVELER</h2>
          <p style="color: #388e3c; font-weight: 600; font-size: 18px;">${data.message}</p>
        </div>
        <div style="background: white; border-radius: 8px; padding: 20px;">
          <h3 style="margin-bottom: 16px;">Traveler Information:</h3>
          <div style="display: grid; gap: 12px;">
            <div><strong>Name:</strong> ${data.name}</div>
            <div><strong>Aadhar Number:</strong> ${data.aadhar}</div>
            ${data.phone_number ? `<div><strong>Phone Number:</strong> ${data.phone_number}</div>` : ''}
            ${data.email ? `<div><strong>Email:</strong> ${data.email}</div>` : ''}
            ${data.source ? `<div><strong>Source:</strong> ${data.source}</div>` : ''}
            ${data.destination ? `<div><strong>Destination:</strong> ${data.destination}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  } else {
    // Pending or other status
    scanResult.innerHTML = `
      <div style="background: #fff9c4; border: 3px solid #fbc02d; border-radius: 12px; padding: 24px;">
        <div style="text-align: center;">
          <div style="font-size: 72px; margin-bottom: 16px;">⚠️</div>
          <h2 style="color: #f57c00; margin-bottom: 8px;">YELLOW FLAG - PENDING STATUS</h2>
          <p style="color: #e65100; font-weight: 600; font-size: 18px;">${data.message}</p>
        </div>
      </div>
    `;
  }
}

async function levyPenalty(aadhar, amount) {
  if (!confirm(`Are you sure you want to levy a penalty of ₹${amount} on Aadhar: ${aadhar}?`)) {
    return;
  }
  
  try {
    const res = await fetch("/authorities/levy-penalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aadhar: aadhar,
        penalty_amount: amount,
        reason: "Violation of health protocols - Found in public while disapproved",
      }),
    });
    const data = await res.json();
    
    if (res.ok) {
      toast.textContent = "✓ " + (data.message || "Penalty levied successfully");
      toast.classList.remove("error");
      toast.classList.add("success");
    } else {
      toast.textContent = "✗ " + (data.error || "Failed to levy penalty");
      toast.classList.remove("success");
      toast.classList.add("error");
    }
  } catch (err) {
    toast.textContent = "✗ Network error. Please try again.";
    toast.classList.add("error");
  }
}

async function fetchTravelers() {
  try {
    const res = await fetch("/authorities/disapproved-travelers");
    const data = await res.json();
    if (!res.ok) {
      toast.textContent = "✗ " + (data.error || "Failed to load travelers");
      toast.classList.add("error");
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
        <p class="muted">No disapproved travelers in database.</p>
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
      <div style="margin: 12px 0;">
        <span class="pill" style="background: ${tierColor}; color: white;">Tier: ${t.tier}</span>
      </div>
    `;
    
    container.appendChild(card);
  });
}

fetchTravelers();
setInterval(fetchTravelers, 15000);
