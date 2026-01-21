const modal = document.getElementById("login-modal");
const openBtn = document.getElementById("open-login");
const closeBtn = document.getElementById("close-login");
const backdrop = document.getElementById("modal-backdrop");
const roleSelect = document.getElementById("role-select");
const roleFields = document.getElementById("role-fields");
const roleForm = document.getElementById("role-form");
const roleMessage = document.getElementById("role-message");

function showModal() {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  renderRoleFields(roleSelect.value);
  document.body.style.overflow = "hidden";
}

function hideModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  roleMessage.textContent = "";
  roleMessage.classList.remove("error", "success");
  roleForm.reset();
  document.body.style.overflow = "";
}

openBtn?.addEventListener("click", showModal);
closeBtn?.addEventListener("click", hideModal);
backdrop?.addEventListener("click", hideModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) hideModal();
});

roleSelect?.addEventListener("change", () => {
  renderRoleFields(roleSelect.value);
  roleMessage.textContent = "";
});

function renderRoleFields(role) {
  if (role === "migrant") {
    roleFields.innerHTML = `
      <label>📧 Email</label>
      <input type="email" name="email" required placeholder="your.email@example.com">
      <label>🆔 Aadhar</label>
      <input type="text" name="aadhar" required placeholder="12-digit Aadhar number">
      <p class="muted" style="margin:12px 0 0; font-size:0.85rem;">New applicant? Use "Apply Here" button above.</p>
    `;
    return;
  }
  if (role === "doctor") {
    roleFields.innerHTML = `
      <label>👨‍⚕️ Doctor ID</label>
      <input type="text" name="doctor_id" required placeholder="e.g., 0010">
      <label>🔒 Password</label>
      <input type="password" name="password" required placeholder="Enter your password">
    `;
    return;
  }
  roleFields.innerHTML = `
    <label>🏛️ Official ID</label>
    <input type="text" name="official_id" required placeholder="e.g., 0010">
    <label>🔒 Password</label>
    <input type="password" name="password" required placeholder="Enter your password">
  `;
}

roleForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  roleMessage.textContent = "";
  roleMessage.classList.remove("error", "success");

  const submitBtn = roleForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading"></span> Logging in...';

  const role = roleSelect.value;
  const formData = new FormData(roleForm);

  let url = "";
  let redirect = "";
  
  try {
    if (role === "migrant") {
      url = "/migrant/login";
      redirect = "/migrant-dashboard";
      const payload = Object.fromEntries(formData.entries());
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        roleMessage.textContent = data.error || "Login failed";
        roleMessage.classList.add("error");
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      roleMessage.textContent = "✓ Login successful! Redirecting...";
      roleMessage.classList.add("success");
      setTimeout(() => window.location.href = redirect, 800);
      return;
    } else if (role === "doctor") {
      url = "/doctor/login";
      redirect = "/doctor-dashboard";
      // Doctor login uses JSON (no file)
      const payload = Object.fromEntries(formData.entries());
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        roleMessage.textContent = data.error || "Login failed";
        roleMessage.classList.add("error");
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      roleMessage.textContent = "✓ Login successful! Redirecting...";
      roleMessage.classList.add("success");
      setTimeout(() => window.location.href = redirect, 800);
      return;
    } else {
      url = "/official/login";
      redirect = "/official-dashboard";
      // Official login uses JSON (no file)
      const payload = Object.fromEntries(formData.entries());
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        roleMessage.textContent = data.error || "Login failed";
        roleMessage.classList.add("error");
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      roleMessage.textContent = "✓ Login successful! Redirecting...";
      roleMessage.classList.add("success");
      setTimeout(() => window.location.href = redirect, 800);
      return;
    }

    const res = await fetch(url, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      roleMessage.textContent = data.error || "Login failed";
      roleMessage.classList.add("error");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }
    roleMessage.textContent = "✓ Login successful! Redirecting...";
    roleMessage.classList.add("success");
    setTimeout(() => window.location.href = redirect, 800);
  } catch (err) {
    roleMessage.textContent = "Network error. Please try again.";
    roleMessage.classList.add("error");
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Add entrance animations
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".card");
  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
  });
});
