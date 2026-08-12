// Admin Page Controller
class AdminPage {
  constructor() {
    this.currentAdmin = null;
    this.courses = [];
    this.allSyllabi = [];
    this.init();
  }

  async init() {
    await this.checkAuth();
    this.initTheme();
    await this.loadCourses();
    this.setupEventListeners();
    this.setupAdminFunctionality();
    this.setupInactivityTimer();
    this.setupBeforeUnload();
    console.log("✅ Admin page initialized");
  }

  async checkAuth() {
    const token = localStorage.getItem("adminToken");
    const tokenTimestamp = localStorage.getItem("tokenTimestamp");

    if (!token) {
      this.showLoginSection();
      return;
    }

    const currentTime = Date.now();
    const tokenAge = currentTime - parseInt(tokenTimestamp);
    const maxAge = 24 * 60 * 60 * 1000;

    if (tokenAge > maxAge) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("tokenTimestamp");
      this.showLoginSection();
      Utils.showToast("Session expired. Please login again.", "warning");
      return;
    }

    try {
      const response = await api.verifyToken();
      this.currentAdmin = response.admin;
      this.showAdminDashboard();
    } catch (error) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("tokenTimestamp");
      this.showLoginSection();
    }
  }

  setupInactivityTimer() {
    let inactivityTime = 0;
    const maxInactivity = 30 * 60 * 1000;

    const resetTimer = () => {
      inactivityTime = 0;
    };

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((event) => {
      document.addEventListener(event, resetTimer, true);
    });

    setInterval(() => {
      if (this.currentAdmin) {
        inactivityTime += 1000;
        if (inactivityTime >= maxInactivity) {
          this.handleLogout();
          Utils.showToast("Auto logged out due to inactivity", "warning");
        }
      }
    }, 1000);
  }

  setupBeforeUnload() {
    window.addEventListener("beforeunload", (e) => {
      if (this.currentAdmin) {
        localStorage.setItem("tokenTimestamp", Date.now().toString());
      }
    });
  }

  showLoginSection() {
    document.getElementById("login-section").style.display = "block";
    document.getElementById("admin-dashboard").style.display = "none";
  }

  showAdminDashboard() {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("admin-dashboard").style.display = "block";
    this.updateUIForAdmin();
  }

  updateUIForAdmin() {
    const adminNav = document.getElementById("admin-nav");
    const loginNav = document.getElementById("login-nav");
    const logoutNav = document.getElementById("logout-nav");

    if (adminNav) adminNav.style.display = "block";
    if (loginNav) loginNav.style.display = "none";
    if (logoutNav) logoutNav.style.display = "block";
  }

  updateUIForLogout() {
    const adminNav = document.getElementById("admin-nav");
    const loginNav = document.getElementById("login-nav");
    const logoutNav = document.getElementById("logout-nav");
    const adminControls = document.getElementById("admin-controls");

    if (adminNav) adminNav.style.display = "none";
    if (loginNav) loginNav.style.display = "block";
    if (logoutNav) logoutNav.style.display = "none";
    if (adminControls) adminControls.style.display = "none";
  }

  initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    this.updateThemeIcon(newTheme);
  }

  updateThemeIcon(theme) {
    const icon = document.querySelector("#theme-toggle i");
    if (icon) {
      icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
    }
  }

  async loadCourses() {
    try {
      this.courses = await api.getCourses();
      this.populateAdminFormSelects();
    } catch (error) {
      console.error("Error loading courses:", error);
    }
  }

  async handleLogin(email, password) {
    try {
      const response = await api.login(email, password);

      if (response.success && response.token) {
        api.setToken(response.token);
        this.currentAdmin = response.admin;

        localStorage.setItem("adminToken", response.token);
        localStorage.setItem("tokenTimestamp", Date.now().toString());

        this.showAdminDashboard();
        Utils.showToast("Login successful!", "success");
      }
    } catch (error) {
      Utils.showToast("Login failed: " + error.message, "error");
    }
  }

  handleLogout() {
    api.setToken(null);
    localStorage.removeItem("adminToken");
    localStorage.removeItem("tokenTimestamp");
    this.currentAdmin = null;
    this.updateUIForLogout();
    Utils.showToast("Logged out successfully", "success");
    window.location.href = "/";
  }

  // ============================================
  // OTP LOGIN FUNCTIONS
  // ============================================

  setupOTPLogin() {
    console.log("🔐 Setting up OTP login...");

    const loginForm = document.getElementById("login-form");
    const otpForm = document.getElementById("otp-form");
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const otpInput = document.getElementById("login-otp");

    if (!loginForm) {
      console.log("❌ login-form not found");
      return;
    }

    console.log("✅ OTP forms found");

    // Step 1: Login with Email + Password -> Send OTP
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("📤 Login button clicked");

      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
        Utils.showToast("Please enter email and password", "warning");
        return;
      }

      try {
        const loginBtn = document.getElementById("login-btn");
        loginBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Sending...';
        loginBtn.disabled = true;

        const response = await fetch("/api/otp/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        console.log("📥 Response:", data);

        if (data.success) {
          document.getElementById("login-step-1").style.display = "none";
          document.getElementById("login-step-2").style.display = "block";
          document.getElementById("otp-email-display").textContent = email;

          if (window.adminPage && window.adminPage.startOTPTimer) {
            window.adminPage.startOTPTimer();
          }

          Utils.showToast(
            "✅ OTP sent to your email! Check your inbox.",
            "success",
          );
        } else {
          Utils.showToast("❌ " + (data.message || "Login failed"), "error");
        }
      } catch (error) {
        console.error("❌ Error:", error);
        Utils.showToast("❌ Network error. Check server.", "error");
      } finally {
        const loginBtn = document.getElementById("login-btn");
        loginBtn.innerHTML = '<i class="fas fa-envelope"></i> Login & Send OTP';
        loginBtn.disabled = false;
      }
    });

    // Step 2: Verify OTP
    otpForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("🔑 Verify OTP clicked");

      const email = emailInput.value.trim();
      const otp = otpInput.value.trim();

      if (!otp || otp.length < 6) {
        Utils.showToast("Please enter valid 6-digit OTP", "warning");
        return;
      }

      try {
        const verifyBtn = document.getElementById("verify-otp-btn");
        verifyBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        verifyBtn.disabled = true;

        const response = await fetch("/api/otp/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp }),
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem("adminToken", data.token);
          localStorage.setItem("adminEmail", data.admin.email);
          localStorage.setItem("tokenTimestamp", Date.now().toString());

          if (api && api.setToken) {
            api.setToken(data.token);
          }

          if (window.adminPage) {
            window.adminPage.currentAdmin = data.admin;
            window.adminPage.showAdminDashboard();
          }

          Utils.showToast("✅ Login successful! Welcome back!", "success");

          document.getElementById("login-section").style.display = "none";
          document.getElementById("admin-dashboard").style.display = "block";

          setTimeout(() => {
            if (window.adminPage && window.adminPage.loadAdminSyllabi) {
              window.adminPage.loadAdminSyllabi();
              window.adminPage.loadAnalytics();
            }
          }, 500);
        } else {
          Utils.showToast("❌ " + (data.message || "Invalid OTP"), "error");
        }
      } catch (error) {
        console.error("❌ Error:", error);
        Utils.showToast("❌ Network error. Please try again.", "error");
      } finally {
        const verifyBtn = document.getElementById("verify-otp-btn");
        verifyBtn.innerHTML = '<i class="fas fa-check"></i> Verify & Login';
        verifyBtn.disabled = false;
      }
    });

    // Resend OTP
    document
      .getElementById("resend-otp-btn")
      ?.addEventListener("click", async function () {
        const email = emailInput.value.trim();

        if (!email) {
          Utils.showToast("Email is required", "warning");
          return;
        }

        try {
          this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
          this.disabled = true;

          const response = await fetch("/api/otp/resend", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
          });

          const data = await response.json();

          if (data.success) {
            if (window.adminPage && window.adminPage.startOTPTimer) {
              window.adminPage.startOTPTimer();
            }
            Utils.showToast("✅ New OTP sent successfully!", "success");
          } else {
            Utils.showToast(
              "❌ " + (data.message || "Failed to resend"),
              "error",
            );
          }
        } catch (error) {
          console.error("❌ Error:", error);
          Utils.showToast("❌ Network error.", "error");
        } finally {
          this.innerHTML = '<i class="fas fa-redo"></i> Resend OTP';
          this.disabled = false;
        }
      });

    // Back to login
    document
      .getElementById("back-to-login-btn")
      ?.addEventListener("click", function () {
        document.getElementById("login-step-1").style.display = "block";
        document.getElementById("login-step-2").style.display = "none";

        if (window.otpTimerInterval) {
          clearInterval(window.otpTimerInterval);
        }

        document.getElementById("timer-display").textContent =
          "OTP expires in 5:00";
        document.getElementById("timer-display").style.color = "";
        document.getElementById("verify-otp-btn").disabled = false;
        document.getElementById("login-otp").value = "";

        Utils.showToast("Back to login", "info");
      });

    // Password toggle for OTP login
    document
      .getElementById("login-password-toggle")
      ?.addEventListener("click", function () {
        const passwordInput = document.getElementById("login-password");
        const type = passwordInput.type === "password" ? "text" : "password";
        passwordInput.type = type;
        this.querySelector("i").className =
          type === "text" ? "fas fa-eye-slash" : "fas fa-eye";
      });
  }

  startOTPTimer() {
    let timeLeft = 300;
    const timerDisplay = document.getElementById("timer-display");
    const verifyBtn = document.getElementById("verify-otp-btn");

    if (window.otpTimerInterval) {
      clearInterval(window.otpTimerInterval);
    }

    window.otpTimerInterval = setInterval(() => {
      timeLeft--;
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;

      if (timerDisplay) {
        timerDisplay.textContent = `OTP expires in ${minutes}:${seconds.toString().padStart(2, "0")}`;

        if (timeLeft < 60) {
          timerDisplay.style.color = "#dc2626";
          timerDisplay.style.fontWeight = "bold";
        }
      }

      if (timeLeft <= 0) {
        clearInterval(window.otpTimerInterval);
        if (timerDisplay) {
          timerDisplay.textContent = "⏰ OTP expired!";
          timerDisplay.style.color = "#dc2626";
        }
        if (verifyBtn) {
          verifyBtn.disabled = true;
          Utils.showToast("⏰ OTP expired. Please request new OTP.", "warning");
        }
      }
    }, 1000);
  }

  // ============================================
  // FORGOT PASSWORD FUNCTIONS (Login Page)
  // ============================================

  setupForgotPassword() {
    // 1️⃣ Open Forgot Password Modal
    document
      .getElementById("forgot-password-link")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("forgot-modal").style.display = "flex";
        document.getElementById("forgot-step-1").style.display = "block";
        document.getElementById("forgot-step-2").style.display = "none";
        document.getElementById("forgot-email").value = "";
        document.getElementById("forgot-timer").textContent =
          "OTP expires in 5:00";
        document.getElementById("forgot-timer").style.color = "";
      });

    // Close modal on outside click
    document.getElementById("forgot-modal")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        e.target.style.display = "none";
        if (window.forgotTimerInterval) {
          clearInterval(window.forgotTimerInterval);
        }
      }
    });

    // 2️⃣ Send OTP
    document
      .getElementById("forgot-email-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("forgot-email").value.trim();

        if (!email) {
          Utils.showToast("Please enter your email", "warning");
          return;
        }

        try {
          const response = await fetch("/api/password/forgot/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });

          const data = await response.json();

          if (data.success) {
            document.getElementById("forgot-step-1").style.display = "none";
            document.getElementById("forgot-step-2").style.display = "block";
            document.getElementById("forgot-email-display").textContent = email;

            this.startForgotTimer();
            Utils.showToast("✅ OTP sent to your email!", "success");
          } else {
            Utils.showToast("❌ " + data.message, "error");
          }
        } catch (error) {
          Utils.showToast("❌ Network error. Please try again.", "error");
        }
      });

    // 3️⃣ Reset Password with OTP
    document
      .getElementById("forgot-reset-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("forgot-email").value.trim();
        const otp = document.getElementById("forgot-otp").value.trim();
        const newPassword = document.getElementById(
          "forgot-new-password",
        ).value;
        const confirmPassword = document.getElementById(
          "forgot-confirm-password",
        ).value;

        if (newPassword !== confirmPassword) {
          Utils.showToast("Passwords do not match", "error");
          return;
        }

        if (newPassword.length < 6) {
          Utils.showToast("Password must be at least 6 characters", "error");
          return;
        }

        if (!otp || otp.length < 6) {
          Utils.showToast("Please enter valid 6-digit OTP", "warning");
          return;
        }

        try {
          const response = await fetch("/api/password/forgot/reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
          });

          const data = await response.json();

          if (data.success) {
            Utils.showToast(
              "✅ Password reset successfully! Please login.",
              "success",
            );
            document.getElementById("forgot-modal").style.display = "none";

            if (window.forgotTimerInterval) {
              clearInterval(window.forgotTimerInterval);
            }
          } else {
            Utils.showToast("❌ " + data.message, "error");
          }
        } catch (error) {
          Utils.showToast("❌ Network error. Please try again.", "error");
        }
      });

    // 4️⃣ Resend OTP
    document
      .getElementById("forgot-resend-btn")
      ?.addEventListener("click", async () => {
        const email = document.getElementById("forgot-email").value.trim();

        try {
          const response = await fetch("/api/password/forgot/resend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });

          const data = await response.json();

          if (data.success) {
            this.startForgotTimer();
            Utils.showToast("✅ New OTP sent!", "success");
          } else {
            Utils.showToast("❌ " + data.message, "error");
          }
        } catch (error) {
          Utils.showToast("❌ Network error. Please try again.", "error");
        }
      });

    // 5️⃣ Back to email step
    document
      .getElementById("forgot-back-btn")
      ?.addEventListener("click", () => {
        document.getElementById("forgot-step-1").style.display = "block";
        document.getElementById("forgot-step-2").style.display = "none";
        if (window.forgotTimerInterval) {
          clearInterval(window.forgotTimerInterval);
        }
        document.getElementById("forgot-timer").textContent =
          "OTP expires in 5:00";
        document.getElementById("forgot-timer").style.color = "";
      });
  }

  // ✅ Forgot Password Timer
  startForgotTimer() {
    let timeLeft = 300;
    const timerDisplay = document.getElementById("forgot-timer");

    if (window.forgotTimerInterval) {
      clearInterval(window.forgotTimerInterval);
    }

    window.forgotTimerInterval = setInterval(() => {
      timeLeft--;
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;

      if (timerDisplay) {
        timerDisplay.textContent = `OTP expires in ${minutes}:${seconds.toString().padStart(2, "0")}`;

        if (timeLeft < 60) {
          timerDisplay.style.color = "#dc2626";
          timerDisplay.style.fontWeight = "bold";
        }
      }

      if (timeLeft <= 0) {
        clearInterval(window.forgotTimerInterval);
        if (timerDisplay) {
          timerDisplay.textContent = "⏰ OTP expired!";
          timerDisplay.style.color = "#dc2626";
        }
      }
    }, 1000);
  }

  // ============================================
  // CHANGE PASSWORD FUNCTIONS (Admin Settings)
  // ============================================

  setupChangePassword() {
    const changeForm = document.getElementById("change-password-form");
    if (!changeForm) return;

    changeForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const oldPassword = document.getElementById("old-password").value;
      const newPassword = document.getElementById("new-password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      if (newPassword !== confirmPassword) {
        Utils.showToast("New passwords do not match", "error");
        return;
      }

      if (newPassword.length < 6) {
        Utils.showToast("Password must be at least 6 characters", "error");
        return;
      }

      try {
        const token = localStorage.getItem("adminToken");
        const response = await fetch("/api/password/change", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
        });

        const data = await response.json();

        if (data.success) {
          Utils.showToast("✅ Password changed successfully!", "success");
          changeForm.reset();
        } else {
          Utils.showToast("❌ " + data.message, "error");
        }
      } catch (error) {
        Utils.showToast("❌ Network error. Please try again.", "error");
      }
    });
  }

  // ============================================
  // TOGGLE PASSWORD VISIBILITY
  // ============================================

  togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = input.parentElement.querySelector(".password-toggle i");
    if (!icon) return;

    if (input.type === "password") {
      input.type = "text";
      icon.className = "fas fa-eye-slash";
    } else {
      input.type = "password";
      icon.className = "fas fa-eye";
    }
  }

  // ============================================
  // SETUP EVENT LISTENERS
  // ============================================

  setupEventListeners() {
    // Mobile menu
    document
      .getElementById("mobile-menu-trigger")
      ?.addEventListener("click", () => {
        this.toggleMobileMenu();
      });

    // Theme toggle
    document.getElementById("theme-toggle")?.addEventListener("click", () => {
      this.toggleTheme();
    });

    // Logout
    document.getElementById("logout-btn")?.addEventListener("click", () => {
      this.handleLogout();
    });

    // Password toggle for login page
    this.setupPasswordToggle();

    // Nav overlay close
    document.getElementById("nav-overlay")?.addEventListener("click", () => {
      this.closeMobileMenu();
    });

    // ✅ OTP Login Setup
    this.setupOTPLogin();

    // ✅ Forgot Password (Login Page)
    this.setupForgotPassword();

    // ✅ Change Password (Admin Settings)
    this.setupChangePassword();

    // ✅ Timetable Form - WITH PREVENT DEFAULT
const ttForm = document.getElementById("timetable-form");
if (ttForm) {
    ttForm.addEventListener("submit", async function(e) {
        e.preventDefault();  // ✅ Page reload rokne ke liye
        console.log("📅 Timetable form submitted");
        
        // ✅ Button disable karo
        const btn = document.getElementById("tt-submit-btn");
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        btn.disabled = true;
        
        await addTimetable();
        
        btn.innerHTML = '<i class="fas fa-upload"></i> Add Timetable';
        btn.disabled = false;
    });
}
  }

  setupPasswordToggle() {
    const passwordToggle = document.getElementById("password-toggle");
    const passwordInput = document.getElementById("password");

    if (passwordToggle && passwordInput) {
      passwordToggle.addEventListener("click", function () {
        const type =
          passwordInput.getAttribute("type") === "password"
            ? "text"
            : "password";
        passwordInput.setAttribute("type", type);

        const icon = this.querySelector("i");
        icon.className = type === "text" ? "fas fa-eye-slash" : "fas fa-eye";
      });
    }
  }

  toggleMobileMenu() {
    const nav = document.getElementById("nav");
    const overlay = document.getElementById("nav-overlay");

    nav.classList.toggle("active");
    document.body.classList.toggle("nav-open");

    if (overlay) overlay.classList.toggle("active");
  }

  closeMobileMenu() {
    const nav = document.getElementById("nav");
    const overlay = document.getElementById("nav-overlay");

    if (nav) nav.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    document.body.classList.remove("nav-open");
  }

  setupAdminFunctionality() {
    const uploadForm = document.getElementById("upload-form");
    if (uploadForm) {
      uploadForm.addEventListener("submit", (e) => this.handleFileUpload(e));
    }

    document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchAdminTab(btn.dataset.tab);
      });
    });

    this.setupAdminSearch();
  }

  setupAdminSearch() {
    const adminSearch = document.getElementById("admin-search");
    const adminCourseFilter = document.getElementById("admin-course-filter");

    if (!adminSearch) return;

    const performSearch = () => {
      const query = adminSearch.value.toLowerCase().trim();
      const courseFilter = adminCourseFilter ? adminCourseFilter.value : "";

      if (!query && !courseFilter) {
        this.displayAdminSyllabi(this.allSyllabi);
        return;
      }

      const filteredSyllabi = this.allSyllabi.filter((syllabus) => {
        const matchesCourse =
          !courseFilter || syllabus.courseCode === courseFilter;
        const matchesSearch =
          !query ||
          syllabus.title.toLowerCase().includes(query) ||
          syllabus.subject.toLowerCase().includes(query) ||
          syllabus.courseCode.toLowerCase().includes(query) ||
          (syllabus.description &&
            syllabus.description.toLowerCase().includes(query));

        return matchesCourse && matchesSearch;
      });

      if (query) {
        filteredSyllabi.sort((a, b) => {
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();
          const aSubject = a.subject.toLowerCase();
          const bSubject = b.subject.toLowerCase();
          const aCourse = a.courseCode.toLowerCase();
          const bCourse = b.courseCode.toLowerCase();

          if (aTitle === query && bTitle !== query) return -1;
          if (bTitle === query && aTitle !== query) return 1;

          if (aSubject === query && bSubject !== query) return -1;
          if (bSubject === query && aSubject !== query) return 1;

          if (aCourse === query && bCourse !== query) return -1;
          if (bCourse === query && aCourse !== query) return 1;

          const aTitleStartsWith = aTitle.startsWith(query);
          const bTitleStartsWith = bTitle.startsWith(query);
          if (aTitleStartsWith && !bTitleStartsWith) return -1;
          if (bTitleStartsWith && !aTitleStartsWith) return 1;

          const aSubjectStartsWith = aSubject.startsWith(query);
          const bSubjectStartsWith = bSubject.startsWith(query);
          if (aSubjectStartsWith && !bSubjectStartsWith) return -1;
          if (bSubjectStartsWith && !aSubjectStartsWith) return 1;

          const aTitleContains = aTitle.includes(query);
          const bTitleContains = bTitle.includes(query);
          if (aTitleContains && !bTitleContains) return -1;
          if (bTitleContains && !aTitleContains) return 1;

          const aSubjectContains = aSubject.includes(query);
          const bSubjectContains = bSubject.includes(query);
          if (aSubjectContains && !bSubjectContains) return -1;
          if (bSubjectContains && !aSubjectContains) return 1;

          return 0;
        });
      }

      this.displayAdminSyllabi(filteredSyllabi);
    };

    adminSearch.addEventListener("input", performSearch);
    adminSearch.addEventListener("keypress", (e) => {
      if (e.key === "Enter") performSearch();
    });

    if (adminCourseFilter) {
      adminCourseFilter.addEventListener("change", performSearch);
    }
  }

  switchAdminTab(tabName) {
    document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    document.querySelectorAll(".admin-tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.getElementById(`${tabName}-tab`).classList.add("active");

    if (tabName === "manage") {
      this.loadAdminSyllabi();
    } else if (tabName === "analytics") {
      this.loadAnalytics();
    } else if (tabName === "timetable") {
      // ✅ ADD THIS
      loadTimetables();
    }
  }

  async handleFileUpload(e) {
    e.preventDefault();

    if (!this.currentAdmin) {
      Utils.showToast("Please log in as admin", "error");
      return;
    }

    const courseCode = document.getElementById("upload-course").value;
    const semester = document.getElementById("upload-semester").value;
    const subject = document.getElementById("upload-subject").value;
    const title = document.getElementById("upload-title").value;
    const description = document.getElementById("upload-description").value;
    const version = document.getElementById("upload-version").value;
    const fileInput = document.getElementById("upload-file");
    const file = fileInput.files[0];

    if (!file) {
      Utils.showToast("Please select a PDF file", "error");
      return;
    }

    if (!Utils.isPDFFile(file)) {
      Utils.showToast("Only PDF files are allowed", "error");
      return;
    }

    const convertToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
    };

    try {
      Utils.showLoading(true);

      const base64File = await convertToBase64(file);

      const uploadData = {
        courseCode: courseCode,
        semester: semester,
        subject: subject,
        title: title,
        description: description,
        version: version || 1,
        fileData: base64File,
        fileName: file.name,
      };

      const response = await fetch("/api/syllabi/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify(uploadData),
      });

      const result = await response.json();

      if (response.ok) {
        Utils.showToast("File uploaded successfully!", "success");
        e.target.reset();

        if (
          document.getElementById("manage-tab").classList.contains("active")
        ) {
          this.loadAdminSyllabi();
        }
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (error) {
      Utils.showToast("Upload failed: " + error.message, "error");
      console.error("Upload error:", error);
    } finally {
      Utils.showLoading(false);
    }
  }

  async loadAdminSyllabi() {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        console.log("⚠️ No token found");
        return false;
      }

      console.log("📚 Loading admin syllabi...");
      const syllabi = await api.getAdminSyllabi();
      this.allSyllabi = syllabi;
      this.displayAdminSyllabi(syllabi);
      console.log("✅ Admin syllabi loaded:", syllabi.length);
      return true;
    } catch (error) {
      console.error("❌ Error loading admin syllabi:", error);
      return false;
    }
  }

  displayAdminSyllabi(syllabi) {
    const container = document.getElementById("admin-syllabus-list");
    if (!container) return;

    if (syllabi.length === 0) {
      container.innerHTML = '<p class="no-data">No files found.</p>';
      return;
    }

    container.innerHTML = syllabi
      .map(
        (syllabus) => `
                    <div class="syllabus-item">
                        <div class="syllabus-header">
                            <div class="syllabus-title">
                                <h4>${Utils.sanitizeHTML(syllabus.title)}</h4>
                                <p>${Utils.sanitizeHTML(
                                  syllabus.description || "",
                                )} - ${syllabus.courseCode}</p>
                            </div>
                            <div class="syllabus-actions">
                                <button class="btn btn-danger delete-syllabus-admin" data-id="${syllabus._id}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                        <div class="syllabus-meta">
                            <span>Semester ${syllabus.semester}</span>
                            <span>Subject: ${Utils.sanitizeHTML(syllabus.subject)}</span>
                            <span>Version: ${syllabus.version}</span>
                            <span>Downloads: ${syllabus.downloadCount}</span>
                            <span>Views: ${syllabus.viewCount}</span>
                            <span>Uploaded: ${Utils.formatDate(syllabus.createdAt)}</span>
                        </div>
                    </div>
                `,
      )
      .join("");

    container.querySelectorAll(".delete-syllabus-admin").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.deletePdfAdmin(btn.dataset.id);
      });
    });
  }

  async deletePdfAdmin(syllabusId) {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await api.deleteSyllabus(syllabusId);
      Utils.showToast("File deleted successfully", "success");
      this.loadAdminSyllabi();
    } catch (error) {
      Utils.showToast("Failed to delete file", "error");
      console.error("Error deleting file:", error);
    }
  }

  async loadAnalytics() {
    try {
      const analytics = await api.getAnalytics();
      this.displayAnalytics(analytics);
    } catch (error) {
      Utils.showToast("Failed to load analytics", "error");
      console.error("Error loading analytics:", error);
    }
  }

  displayAnalytics(analytics) {
    document.getElementById("total-files").textContent =
      analytics.totalFiles || 0;
    document.getElementById("total-downloads").textContent =
      analytics.totalDownloads || 0;
    document.getElementById("total-views").textContent =
      analytics.totalViews || 0;

    const topFilesList = document.getElementById("top-downloaded-list");
    if (topFilesList) {
      if (!analytics.topDownloaded || analytics.topDownloaded.length === 0) {
        topFilesList.innerHTML =
          '<p class="no-data">No data available yet.</p>';
        return;
      }

      topFilesList.innerHTML = analytics.topDownloaded
        .map(
          (file, index) => `
                        <div class="top-file-item">
                            <div>
                                <strong>${index + 1}. ${Utils.sanitizeHTML(file.title)}</strong>
                                <div>${file.courseCode} - ${Utils.sanitizeHTML(file.subject)}</div>
                            </div>
                            <div class="file-stats">
                                <span>Downloads: ${file.downloadCount}</span>
                                <span>Views: ${file.viewCount}</span>
                            </div>
                        </div>
                    `,
        )
        .join("");
    }
  }

  populateAdminFormSelects() {
    const courseSelect = document.getElementById("upload-course");
    const adminCourseFilter = document.getElementById("admin-course-filter");

    if (courseSelect) {
      courseSelect.innerHTML =
        '<option value="">Select Course</option>' +
        this.courses
          .map(
            (course) =>
              `<option value="${course.code}">${Utils.sanitizeHTML(course.name)}</option>`,
          )
          .join("");
    }

    if (adminCourseFilter) {
      adminCourseFilter.innerHTML =
        '<option value="">All Courses</option>' +
        this.courses
          .map(
            (course) =>
              `<option value="${course.code}">${Utils.sanitizeHTML(course.name)}</option>`,
          )
          .join("");
    }

    const semesterSelect = document.getElementById("upload-semester");
    if (semesterSelect) {
      semesterSelect.innerHTML =
        '<option value="">Select Semester</option>' +
        Array.from(
          { length: 8 },
          (_, i) => `<option value="${i + 1}">Semester ${i + 1}</option>`,
        ).join("");
    }
  }
}

// ✅ Global togglePassword function for all password fields
window.togglePassword = function (inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = input.parentElement.querySelector(".password-toggle i");
  if (!icon) return;

  if (input.type === "password") {
    input.type = "text";
    icon.className = "fas fa-eye-slash";
  } else {
    input.type = "password";
    icon.className = "fas fa-eye";
  }
};

// ============================================
// ✅ TIMETABLE MANAGEMENT FUNCTIONS
// ============================================

// Image Preview
// ============================================
// ✅ TIMETABLE MANAGEMENT FUNCTIONS
// ============================================

// Add Timetable
async function addTimetable() {
    const branch = document.getElementById("tt-branch").value;
    const branchName = document.getElementById("tt-branchname").value.trim();
    const semester = document.getElementById("tt-semester").value;
    const imageFile = document.getElementById("tt-image-file").files[0];

    if (!branch || !branchName || !semester || !imageFile) {
        Utils.showToast("All fields including image are required", "error");
        return;
    }

    try {
        const formData = new FormData();
        formData.append("branch", branch);
        formData.append("branchName", branchName);
        formData.append("semester", semester);
        formData.append("image", imageFile);

        const response = await fetch('/api/timetable', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: formData
        });

        const data = await response.json();
        console.log("📅 Add response:", data);

        if (data.success) {
            Utils.showToast("Timetable added successfully!", "success");
            document.getElementById("timetable-form").reset();
            document.getElementById("tt-image-preview").innerHTML = '';
            await loadTimetables();  // ✅ Load after add
        } else {
            Utils.showToast(data.message || "Failed to add timetable", "error");
        }
    } catch (error) {
        console.error("Add timetable error:", error);
        Utils.showToast("Network error", "error");
    }
}

// Load Timetables
async function loadTimetables() {
    console.log("📅 loadTimetables called...");
    try {
        const token = localStorage.getItem('adminToken');
        console.log("🔑 Token exists:", token ? "✅ Yes" : "❌ No");
        
        const response = await fetch('/api/timetable', {
            headers: { 
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        console.log("📅 Response:", data);
        
        if (data.success) {
            displayTimetables(data.data);
        } else {
            console.log("❌ No data:", data.message);
            document.getElementById("timetable-list").innerHTML = '<p class="no-data">' + (data.message || 'No timetables found') + '</p>';
        }
    } catch (error) {
        console.error("❌ Load timetables error:", error);
        document.getElementById("timetable-list").innerHTML = '<p class="no-data">Error loading timetables</p>';
    }
}

// Display Timetables
function displayTimetables(timetables) {
    const container = document.getElementById("timetable-list");
    console.log("📅 Container found:", container ? "✅ Yes" : "❌ No");
    
    if (!container) {
        console.log("❌ timetable-list container not found!");
        return;
    }
    
    if (!timetables || timetables.length === 0) {
        container.innerHTML = '<p class="no-data">No timetables found. Add one using the form above.</p>';
        return;
    }
    
    container.innerHTML = timetables.map(tt => `
        <div class="syllabus-item">
            <div class="syllabus-header">
                <div class="syllabus-title">
                    <h4>${tt.branchName}</h4>
                    <p>Semester ${tt.semester}</p>
                    <div style="font-size:0.7rem;color:var(--text-muted);">
                        ${tt.isActive ? ' ✅ Active' : ' ❌ Inactive'}
                    </div>
                </div>
                <div class="syllabus-actions">
                    <button class="btn btn-danger delete-timetable" data-id="${tt._id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            ${tt.imageUrl ? `<div style="margin-top:0.5rem;"><img src="${tt.imageUrl}" style="max-width:100px; max-height:80px; border-radius:4px; object-fit:cover;" /></div>` : ''}
        </div>
    `).join("");

    // Delete event listeners
    container.querySelectorAll(".delete-timetable").forEach(btn => {
        btn.addEventListener("click", () => deleteTimetable(btn.dataset.id));
    });
}

// Delete Timetable
async function deleteTimetable(id) {
    if (!confirm("Delete this timetable?")) return;
    try {
        const response = await fetch(`/api/timetable/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        const data = await response.json();
        if (data.success) {
            Utils.showToast("Timetable deleted", "success");
            await loadTimetables();
        }
    } catch (error) {
        Utils.showToast("Delete failed", "error");
    }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  window.adminPage = new AdminPage();
});

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = AdminPage;
}
