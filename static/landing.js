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
}

function hideModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  roleMessage.textContent = "";
  roleMessage.classList.remove("error");
}

openBtn.addEventListener("click", showModal);
closeBtn.addEventListener("click", hideModal);
backdrop.addEventListener("click", hideModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideModal();
});

roleSelect.addEventListener("change", () => renderRoleFields(roleSelect.value));

function renderRoleFields(role) {
  if (role === "migrant") {
    roleFields.innerHTML = `
      <label>Email</label>
      <input type="email" name="email" required>
      <label>Aadhar</label>
      <input type="text" name="aadhar" required>
      <p class="muted" style="margin:8px 0 0;">New applicant? Use “Apply Here”.</p>
    `;
    return;
  }
  if (role === "doctor") {
    roleFields.innerHTML = `
      <label>Doctor ID</label>
      <input type="text" name="doctor_id" required>
      <label>Password</label>
      <input type="password" name="password" required>
      <label>Verification Card (PDF/Image)</label>
      <input type="file" name="verification_card" accept=".pdf,.png,.jpg,.jpeg" required>
    `;
    return;
  }
  roleFields.innerHTML = `
    <label>Official ID</label>
    <input type="text" name="official_id" required>
    <label>Password</label>
    <input type="password" name="password" required>
    <label>Verification Card (PDF/Image)</label>
    <input type="file" name="verification_card" accept=".pdf,.png,.jpg,.jpeg" required>
  `;
}

roleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  roleMessage.textContent = "";
  roleMessage.classList.remove("error");

  const role = roleSelect.value;
  const formData = new FormData(roleForm);

  let url = "";
  let redirect = "";
  if (role === "migrant") {
    url = "/migrant/login";
    redirect = "/migrant-dashboard";
    // Migrant login uses JSON (no file)
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
      return;
    }
    roleMessage.textContent = "Login successful. Redirecting...";
    window.location.href = redirect;
    return;
  } else if (role === "doctor") {
    url = "/doctor/login";
    redirect = "/doctor-dashboard";
  } else {
    url = "/official/login";
    redirect = "/official-dashboard";
  }

  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) {
    roleMessage.textContent = data.error || "Login failed";
    roleMessage.classList.add("error");
    return;
  }
  roleMessage.textContent = "Login successful. Redirecting...";
  window.location.href = redirect;
});

