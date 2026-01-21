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
  } catch (err) {
    statusPanel.innerHTML = `<p class="muted">Failed to load status. Please refresh.</p>`;
  }
}

(async () => {
  await startFreshIfRequested();
  await loadStatus();
  setInterval(loadStatus, 8000);
})();
