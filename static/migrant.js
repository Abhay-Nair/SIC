const statusPanel = document.getElementById("status-panel");
const downloadBtn = document.getElementById("download-clearance");
const applyMessage = document.getElementById("apply-message");
const form = document.getElementById("application-form");

async function startFreshIfRequested() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("new") === "1") {
    // Clear any previous migrant session so old status never shows for a new applicant.
    await fetch("/migrant/logout", { method: "POST" });
    statusPanel.innerHTML = `<p class="muted">Not logged in yet. Submit a new application above to start tracking status.</p>`;
    downloadBtn.disabled = true;
    // clean URL
    url.searchParams.delete("new");
    window.history.replaceState({}, "", url.toString());
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Validate Aadhar
  const aadharInput = form.querySelector('input[name="aadhar"]');
  const aadhar = aadharInput.value.trim();
  if (!/^\d{12}$/.test(aadhar)) {
    applyMessage.textContent = "✗ Aadhar must be exactly 12 digits (numbers only)";
    applyMessage.classList.add("error");
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading"></span> Submitting...';

  try {
    const formData = new FormData(form);
    const res = await fetch("/migrant/apply", { method: "POST", body: formData });
    const data = await res.json();
    
    if (res.ok) {
      applyMessage.textContent = "✓ " + (data.message || "Application submitted successfully!");
      applyMessage.classList.remove("error");
      applyMessage.classList.add("success");
      loadStatus();
      form.reset();
    } else {
      applyMessage.textContent = "✗ " + (data.error || "Failed to submit");
      applyMessage.classList.remove("success");
      applyMessage.classList.add("error");
    }
  } catch (err) {
    applyMessage.textContent = "✗ Network error. Please try again.";
    applyMessage.classList.add("error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await fetch("/migrant/logout", { method: "POST" });
  window.location.href = "/";
});

downloadBtn?.addEventListener("click", async () => {
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = '<span class="loading"></span> Generating PDF...';
  
  try {
    const res = await fetch("/migrant/download-clearance");
    if (!res.ok) {
      const data = await res.json();
      applyMessage.textContent = "✗ " + (data.error || "Cannot download yet");
      applyMessage.classList.add("error");
      downloadBtn.disabled = false;
      downloadBtn.textContent = "Download Clearance PDF";
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `travel_clearance_${new Date().getTime()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    applyMessage.textContent = "✓ PDF downloaded successfully!";
    applyMessage.classList.remove("error");
    applyMessage.classList.add("success");
    downloadBtn.disabled = false;
    downloadBtn.textContent = "Download Clearance PDF";
  } catch (err) {
    applyMessage.textContent = "✗ Download failed. Please try again.";
    applyMessage.classList.add("error");
    downloadBtn.disabled = false;
    downloadBtn.textContent = "Download Clearance PDF";
  }
});

async function loadStatus() {
  try {
    const res = await fetch("/migrant/status");
    const data = await res.json();
    if (!res.ok || !data.migrant) {
      statusPanel.innerHTML = `<p class="muted">Not logged in for status. Submit an application (or login) to see your own status.</p>`;
      downloadBtn.disabled = true;
      return;
    }
    const m = data.migrant;
    const createdDate = m.created_at ? new Date(m.created_at).toLocaleDateString() : "N/A";
    
    statusPanel.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
        <div class="pill ${m.doctor_approval.toLowerCase()}">Doctor: ${m.doctor_approval}</div>
        <div class="pill ${m.official_approval.toLowerCase()}">Official: ${m.official_approval}</div>
      </div>
      <p class="muted" style="font-size: 0.9rem;">Application ID: <strong>${m.id}</strong></p>
      <p class="muted" style="font-size: 0.9rem;">Submitted: ${createdDate}</p>
    `;
    
    const ready = m.doctor_approval === "APPROVED" && m.official_approval === "APPROVED";
    downloadBtn.disabled = !ready;
    if (ready) {
      downloadBtn.classList.add("primary");
      downloadBtn.style.background = "linear-gradient(135deg, var(--success) 0%, var(--accent) 100%)";
    } else {
      downloadBtn.classList.remove("primary");
      downloadBtn.style.background = "";
    }
    
    // Show health warning letter button if disapproved
    let healthWarningBtn = document.getElementById("download-health-warning");
    if (!healthWarningBtn) {
      healthWarningBtn = document.createElement("button");
      healthWarningBtn.id = "download-health-warning";
      healthWarningBtn.className = "danger";
      healthWarningBtn.style.cssText = "margin-top: 20px; padding: 12px; font-size: 16px;";
      healthWarningBtn.textContent = "⚠️ Download Health Warning Letter";
      downloadBtn.parentElement.appendChild(healthWarningBtn);
      
      healthWarningBtn.addEventListener("click", async () => {
        healthWarningBtn.disabled = true;
        healthWarningBtn.innerHTML = '<span class="loading"></span> Generating PDF...';
        
        try {
          const res = await fetch("/migrant/download-health-warning");
          if (!res.ok) {
            const data = await res.json();
            applyMessage.textContent = "✗ " + (data.error || "Cannot download yet");
            applyMessage.classList.add("error");
            healthWarningBtn.disabled = false;
            healthWarningBtn.textContent = "⚠️ Download Health Warning Letter";
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
          
          applyMessage.textContent = "✓ Health warning letter downloaded successfully!";
          applyMessage.classList.remove("error");
          applyMessage.classList.add("success");
          healthWarningBtn.disabled = false;
          healthWarningBtn.textContent = "⚠️ Download Health Warning Letter";
        } catch (err) {
          applyMessage.textContent = "✗ Download failed. Please try again.";
          applyMessage.classList.add("error");
          healthWarningBtn.disabled = false;
          healthWarningBtn.textContent = "⚠️ Download Health Warning Letter";
        }
      });
    }
    
    // Show/hide health warning button based on status
    if (m.has_health_warning && m.doctor_approval === "REJECTED") {
      healthWarningBtn.style.display = "block";
    } else {
      healthWarningBtn.style.display = "none";
    }
  } catch (err) {
    statusPanel.innerHTML = `<p class="muted">Failed to load status. Please refresh.</p>`;
  }
}

(async () => {
  await startFreshIfRequested();
  await loadStatus();
  setInterval(loadStatus, 8000);
})();
