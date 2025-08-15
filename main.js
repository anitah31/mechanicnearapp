
import { authManager } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // Modal & tab DOM elements
  const authModal = document.getElementById("authModal");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const closeModal = document.querySelector(".close");
  const authTabs = document.querySelectorAll(".auth-tab");
  const authForms = document.querySelectorAll(".auth-form");

  // Homepage buttons you mentioned
  const findMechanicsBtn = document.getElementById("findMechanicsBtn");
  const startHelpingBtn = document.getElementById("startHelpingBtn");

  // Function to switch modal tabs (login/signup)
  function switchTab(tabName) {
    authTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.tab === tabName));
    authForms.forEach(form => form.classList.toggle("active", form.id === tabName + "Form"));
    
    if (!authModal.classList.contains("active")) {
      authModal.classList.add("active");
    }
  }

  // Show login modal tab when login button clicked
  loginBtn && loginBtn.addEventListener("click", () => {
    switchTab("login");
  });

  // Show signup modal tab when signup button clicked
  signupBtn && signupBtn.addEventListener("click", () => {
    switchTab("signup");
  });

  // Close modal when close button clicked
  closeModal && closeModal.addEventListener("click", () => {
    authModal.classList.remove("active");
  });

  // Close modal if clicking outside modal content
  authModal && authModal.addEventListener("click", (e) => {
    if (e.target === authModal) {
      authModal.classList.remove("active");
    }
  });

  // Allow tab clicking inside modal to switch views
  authTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Signup form submission handler
  document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const role = document.getElementById("signupRole").value;
    if (!role) return alert("Please select a role");

    const result = await authManager.signUp(
      document.getElementById("signupEmail").value,
      document.getElementById("signupPassword").value,
      {
        name: document.getElementById("signupName").value,
        phone: document.getElementById("signupPhone").value,
        role
      }
    );

    if (result.success) {
      alert("Signup successful! Please log in now.");
      switchTab("login");  // Switch modal to login tab after signup
    } else {
      alert("Signup failed: " + result.error);
    }
  });

  // Login form submission handler
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const result = await authManager.signIn(email, password);
    if (result.success) {
      await authManager.loadUserData();
      const role = authManager.currentUser ?.role;

      if (role === "driver" || role === "mechanic") {
        authManager.redirectToDashboard(role);
      } else {
        alert("User  role not found. Please contact support.");
        await authManager.signOut();
        // Stay in modal; user can retry login
      }
    } else {
      alert("Login failed: " + result.error);
    }
  });

  // Handle both buttons with role detection  
  document.querySelectorAll('.auth-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const role = btn.dataset.role;
      
      // Preselect role in signup form if available
      const signupRoleSelect = document.getElementById("signupRole");
      if (signupRoleSelect) {
        signupRoleSelect.value = role;
      }
      
      // Store target dashboard in session to redirect after login
      sessionStorage.setItem('targetDashboard', role);
      
      // Show auth modal with signup tab
      switchTab("signup");
      
      // Optional: Focus on the role select after modal opens
      setTimeout(() => {
        if (signupRoleSelect) signupRoleSelect.focus();
      }, 300);
    });
  });
});
