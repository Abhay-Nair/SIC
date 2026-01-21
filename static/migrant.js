const statusPanel = document.getElementById("status-panel");
const downloadBtn = document.getElementById("download-clearance");
const applyMessage = document.getElementById("apply-message");

document.getElementById("application-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await fetch("/migrant/apply", { method: "POST", body: formData });
  const data = await res.json();
  applyMessage.textContent = res.ok ? data.message : data.error || "Failed to submit";
  applyMessage.classList.toggle("error", !res.ok);
  if (res.ok) loadStatus();
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await fetch("/migrant/logout", { method: "POST" });
  window.location.href = "/";
});

downloadBtn.addEventListener("click", async () => {
  const res = await fetch("/migrant/download-clearance");
  if (!res.ok) {
    const data = await res.json();
    applyMessage.textContent = data.error || "Cannot download yet";
    applyMessage.classList.add("error");
    return;
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "travel_clearance.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

async function loadStatus() {
  const res = await fetch("/migrant/status");
  const data = await res.json();
  if (!res.ok || !data.migrant) {
    statusPanel.textContent = data.error || "Please login again.";
    return;
  }
  const m = data.migrant;
  statusPanel.innerHTML = `
    <div class="pill ${m.doctor_approval.toLowerCase()}">Doctor: ${m.doctor_approval}</div>
    <div class="pill ${m.official_approval.toLowerCase()}">Official: ${m.official_approval}</div>
    <p class="muted">Application ID: ${m.id}</p>
  `;
  const ready = m.doctor_approval === "APPROVED" && m.official_approval === "APPROVED";
  downloadBtn.disabled = !ready;
}

loadStatus();
setInterval(loadStatus, 8000);
