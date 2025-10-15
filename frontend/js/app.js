class SyllabusPortal {
  constructor() {
    this.currentAdmin = null;
    this.currentCourse = null;
    this.courses = [];
    this.syllabi = [];

    this.init();
  }

  async init() {
    this.initTheme();
    await this.checkAuthStatus();
    await this.loadCourses();
    this.setupEventListeners();
    this.showSection("home");
    console.log("✅ Vikrant University Syllabus Portal initialized");
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

  async checkAuthStatus() {
    try {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        console.log("🔐 No token found - requiring login");
        this.updateUIForLogout();
        return;
      }

      const response = await fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.currentAdmin = data.admin;
        this.updateUIForAdmin();
        console.log("✅ Auto-login successful:");
      } else {
        localStorage.removeItem("adminToken");
        this.updateUIForLogout();
        console.log("❌ Token invalid - cleared");
      }
    } catch (error) {
      console.log("⚠️ Auth check failed:", error);
      this.updateUIForLogout();
    }
  }

  updateUIForAdmin() {
    try {
      const adminNav = document.getElementById("admin-nav");
      const loginNav = document.getElementById("login-nav");
      const logoutNav = document.getElementById("logout-nav");
      const adminControls = document.getElementById("admin-controls");

      if (adminNav) adminNav.style.display = "block";
      if (loginNav) loginNav.style.display = "none";
      if (logoutNav) logoutNav.style.display = "block";
      if (adminControls) adminControls.style.display = "block";

      console.log("🔓 Admin UI activated");
    } catch (error) {
      console.log("UI update error:", error);
    }
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

  async handleLogin(email, password) {
    try {
      localStorage.removeItem("adminToken");

      const response = await api.login(email, password);

      if (response.success && response.token) {
        api.setToken(response.token);
        this.currentAdmin = response.admin;
        this.updateUIForAdmin();
        Utils.showToast("Login successful!", "success");
        setTimeout(() => this.showSection("home"), 1000);
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error.message.includes("credentials")) {
        Utils.showToast("Wrong email or password", "error");
      } else if (error.message.includes("network")) {
        Utils.showToast("Network error. Check server connection.", "error");
      } else {
        Utils.showToast("Login failed: " + error.message, "error");
      }

      localStorage.removeItem("adminToken");
    }
  }

  handleLogout() {
    api.setToken(null);
    this.currentAdmin = null;
    this.updateUIForLogout();
    Utils.showToast("Logged out successfully", "success");
    this.showSection("home");
  }

  showSection(sectionId) {
    document.querySelectorAll(".section").forEach((section) => {
      section.classList.remove("active");
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.add("active");
    }

    this.updateActiveNav(sectionId);
    this.closeMobileMenu();
  }

  updateActiveNav(activeSection) {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });

    const activeLink = document.querySelector(`[href="#${activeSection}"]`);
    if (activeLink) {
      activeLink.classList.add("active");
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
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
  }

  async loadCourses() {
    try {
      Utils.showLoading(true);
      this.courses = await api.getCourses();
      this.displayCourses();
    } catch (error) {
      Utils.showToast("Failed to load courses", "error");
      console.error("Error loading courses:", error);
    } finally {
      Utils.showLoading(false);
    }
  }

  displayCourses() {
    const grid = document.getElementById("courses-grid");
    if (!grid) return;

    if (this.courses.length === 0) {
      grid.innerHTML = '<p class="no-data">No courses available</p>';
      return;
    }

    grid.innerHTML = this.courses
      .map(
        (course) => `
            <div class="course-card" data-course="${course.code}">
                <h3>${Utils.sanitizeHTML(course.name)}</h3>
                <p>${Utils.sanitizeHTML(
                  course.description || "B.Tech program syllabus and notes"
                )}</p>
                <div class="course-meta">
                    <span>Code: ${Utils.sanitizeHTML(course.code)}</span>
                    <span>${course.semesters} Semesters</span>
                </div>
            </div>
        `
      )
      .join("");

    grid.querySelectorAll(".course-card").forEach((card) => {
      card.addEventListener("click", () => {
        const courseCode = card.dataset.course;
        this.showCourseDetails(courseCode);
      });
    });
  }

  async showCourseDetails(courseCode) {
    try {
      Utils.showLoading(true);

      this.currentCourse = await api.getCourse(courseCode);
      this.syllabi = await api.getCourseSyllabi(courseCode);

      document.getElementById("course-title").textContent =
        this.currentCourse.name;
      document.getElementById("course-description").textContent =
        this.currentCourse.description || "";

      this.displaySyllabi();
      this.showSection("course-details");
    } catch (error) {
      Utils.showToast("Failed to load course details", "error");
      console.error("Error loading course details:", error);
    } finally {
      Utils.showLoading(false);
    }
  }

  displaySyllabi() {
    const list = document.getElementById("syllabus-list");
    if (!list) return;

    const semesterFilter = document.getElementById("course-semester-filter");
    const selectedSemester = semesterFilter ? semesterFilter.value : "";

    let filteredSyllabi = this.syllabi;
    if (selectedSemester) {
      filteredSyllabi = this.syllabi.filter(
        (s) => s.semester === parseInt(selectedSemester)
      );
    }

    if (filteredSyllabi.length === 0) {
      list.innerHTML =
        '<p class="no-data">No syllabus files available for this course yet.</p>';
      return;
    }

    list.innerHTML = filteredSyllabi
      .map(
        (syllabus) => `
            <div class="syllabus-item" data-id="${syllabus._id}">
                <div class="syllabus-header">
                    <div class="syllabus-title">
                        <h4>${Utils.sanitizeHTML(syllabus.title)}</h4>
                        <p>${Utils.sanitizeHTML(syllabus.description || "")}</p>
                    </div>
                    <div class="syllabus-actions">
                        <button class="btn btn-primary view-pdf" data-id="${
                          syllabus._id
                        }">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-secondary download-pdf" data-id="${
                          syllabus._id
                        }">
                            <i class="fas fa-download"></i> Download
                        </button>
                        ${
                          this.currentAdmin
                            ? `
                            <button class="btn btn-danger delete-pdf" data-id="${syllabus._id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        `
                            : ""
                        }
                    </div>
                </div>
                <div class="syllabus-meta">
                    <span>Semester ${syllabus.semester}</span>
                    <span>Subject: ${Utils.sanitizeHTML(
                      syllabus.subject
                    )}</span>
                    <span>Version: ${syllabus.version}</span>
                    <span>Size: ${Utils.formatFileSize(
                      syllabus.fileSize
                    )}</span>
                    <span>Uploaded: ${Utils.formatDate(
                      syllabus.createdAt
                    )}</span>
                    <span>Downloads: ${syllabus.downloadCount}</span>
                    <span>Views: ${syllabus.viewCount}</span>
                </div>
            </div>
        `
      )
      .join("");

    this.attachSyllabusEventListeners();
  }

  attachSyllabusEventListeners() {
    document.querySelectorAll(".view-pdf").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.viewPdf(btn.dataset.id);
      });
    });

    document.querySelectorAll(".download-pdf").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.downloadPdf(btn.dataset.id);
      });
    });

    document.querySelectorAll(".delete-pdf").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deletePdf(btn.dataset.id);
      });
    });
  }

  async viewPdf(syllabusId) {
    try {
      const syllabus =
        this.syllabi.find((s) => s._id === syllabusId) ||
        (await api.getSyllabus(syllabusId));

      document.getElementById("pdf-title").textContent = syllabus.title;
      document.getElementById("pdf-viewer").src = await api.previewSyllabus(
        syllabusId
      );

      const modal = document.getElementById("pdf-modal");
      modal.classList.add("active");

      const downloadBtn = document.getElementById("download-pdf");
      downloadBtn.onclick = () => this.downloadPdf(syllabusId);
    } catch (error) {
      Utils.showToast("Failed to open PDF", "error");
      console.error("Error viewing PDF:", error);
    }
  }

  async downloadPdf(syllabusId) {
    try {
      const downloadUrl = await api.downloadSyllabus(syllabusId);
      window.open(downloadUrl, "_blank");
    } catch (error) {
      Utils.showToast("Failed to download PDF", "error");
      console.error("Error downloading PDF:", error);
    }
  }

  async deletePdf(syllabusId) {
    if (!this.currentAdmin) return;

    if (!confirm("Are you sure you want to delete this syllabus file?")) {
      return;
    }

    try {
      Utils.showLoading(true);
      await api.deleteSyllabus(syllabusId);

      this.syllabi = this.syllabi.filter((s) => s._id !== syllabusId);

      this.displaySyllabi();
      Utils.showToast("Syllabus deleted successfully", "success");
    } catch (error) {
      Utils.showToast("Failed to delete syllabus", "error");
      console.error("Error deleting syllabus:", error);
    } finally {
      Utils.showLoading(false);
    }
  }

  setupSearch() {
    const searchInput = document.getElementById("global-search");
    const searchBtn = document.getElementById("search-btn");
    const branchFilter = document.getElementById("branch-filter");
    const semesterFilter = document.getElementById("semester-filter");

    if (!searchInput) return;

    const performUniversalSearch = () => {
      const query = searchInput.value.toLowerCase().trim();
      const branch = branchFilter ? branchFilter.value : '';
      const semester = semesterFilter ? semesterFilter.value : '';

      console.log("🔍 Universal search:", query);

      let allMatches = [];

      const courseCards = document.querySelectorAll(".course-card");
      if (courseCards.length > 0) {
        courseCards.forEach((card) => {
          const courseName = card.querySelector("h3")?.textContent?.toLowerCase() || '';
          const courseCode = card.querySelector(".course-meta span:first-child")?.textContent?.toLowerCase() || '';
          const courseDesc = card.querySelector("p")?.textContent?.toLowerCase() || '';

          let score = 0;

          if (courseName === query) score += 1000;
          if (courseCode === query) score += 900;

          if (courseName.startsWith(query)) score += 800;
          if (courseCode.startsWith(query)) score += 700;

          if (courseName.includes(query)) score += 600;
          if (courseDesc.includes(query)) score += 500;
          if (courseCode.includes(query)) score += 400;

          const matchesBranch = !branch || courseCode.includes(branch.toLowerCase());

          if (score > 0 && matchesBranch) {
            allMatches.push({ 
              element: card, 
              score, 
              type: 'course',
              displayText: courseName
            });
          }
        });
      }

      const syllabusItems = document.querySelectorAll(".syllabus-item");
      if (syllabusItems.length > 0) {
        syllabusItems.forEach((item) => {
          const title = item.querySelector('.syllabus-title h4')?.textContent?.toLowerCase() || '';
          const description = item.querySelector('.syllabus-title p')?.textContent?.toLowerCase() || '';
          const meta = item.querySelector('.syllabus-meta')?.textContent?.toLowerCase() || '';

          let score = 0;

          if (title === query) score += 1000;
          if (description === query) score += 900;

          if (title.startsWith(query)) score += 800;
          if (description.startsWith(query)) score += 700;

          if (title.includes(query)) score += 600;
          if (description.includes(query)) score += 500;
          if (meta.includes(query)) score += 400;

          const matchesSemester = !semester || meta.includes(`semester ${semester}`) || meta.includes(`sem${semester}`);

          if (score > 0 && matchesSemester) {
            allMatches.push({ 
              element: item, 
              score, 
              type: 'syllabus',
              displayText: title
            });
          }
        });
      }

      if (!query) {
        courseCards.forEach((card) => {
          card.style.display = "block";
          card.style.order = "0";
        });
        syllabusItems.forEach((item) => {
          item.style.display = "block";
          item.style.order = "0";
        });
        return;
      }

      courseCards.forEach((card) => { card.style.display = "none"; });
      syllabusItems.forEach((item) => { item.style.display = "none"; });

      allMatches.sort((a, b) => b.score - a.score);

      allMatches.forEach((match, index) => {
        match.element.style.display = "block";
        match.element.style.order = index;
        
        const container = match.element.parentElement;
        if (container && container.firstChild !== match.element) {
          container.insertBefore(match.element, container.firstChild);
        }
      });

      console.log(`✅ Found ${allMatches.length} matches for "${query}"`);
      
      if (query && allMatches.length === 0) {
        this.showToast(`No results found for "${query}"`, 'warning');
      }
    };

    if (searchBtn) {
      searchBtn.addEventListener("click", performUniversalSearch);
    }

    searchInput.addEventListener("input", performUniversalSearch);
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") performUniversalSearch();
    });

    if (branchFilter) {
      branchFilter.addEventListener("change", performUniversalSearch);
    }
    if (semesterFilter) {
      semesterFilter.addEventListener("change", performUniversalSearch);
    }

    console.log("🌐 Universal search activated - Courses + Syllabus together");
  }

  displaySearchResults(results) {
    const grid = document.getElementById("courses-grid");
    if (!grid) return;

    const courseCards = grid.querySelectorAll(".course-card");
    courseCards.forEach((card) => {
      const courseCode = card.dataset.course;
      const course = this.courses.find((c) => c.code === courseCode);

      if (course) {
        const matchesBranch = !branch || course.branch === branch;
        const shouldShow = matchesBranch;
        card.style.display = shouldShow ? "block" : "none";
      }
    });
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

    const semesterFilter = document.getElementById("course-semester-filter");
    if (semesterFilter) {
      semesterFilter.addEventListener("change", () => {
        this.displaySyllabi();
      });
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
       setTimeout(() => this.setupAdminSearch(), 100);
    } else if (tabName === "analytics") {
      this.loadAnalytics();
    }
  }

  async handleFileUpload(e) {
    e.preventDefault();

    if (!this.currentAdmin) {
      Utils.showToast("Please log in as admin", "error");
      return;
    }

    const formData = new FormData();
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

    if (file.size > CONFIG.MAX_FILE_SIZE) {
      Utils.showToast("File size must be less than 50MB", "error");
      return;
    }

    formData.append("semester", semester);
    formData.append("subject", subject);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("version", version);
    formData.append("file", file);

    try {
      Utils.showLoading(true);
      await api.uploadSyllabus(courseCode, formData);

      Utils.showToast("File uploaded successfully!", "success");
      e.target.reset();

      if (this.currentCourse && this.currentCourse.code === courseCode) {
        await this.showCourseDetails(courseCode);
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
        const syllabi = await api.getAdminSyllabi();
        this.displayAdminSyllabi(syllabi);
        this.populateAdminCourseFilter();
        
    } catch (error) {
        Utils.showToast('Failed to load admin syllabi', 'error');
        console.error('Error loading admin syllabi:', error);
    }
}

  setupAdminSearch() {
    const adminSearch = document.getElementById('admin-search');
    const adminCourseFilter = document.getElementById('admin-course-filter');
    
    if (!adminSearch) return;
    
    const performAdminSearch = () => {
        const query = adminSearch.value.toLowerCase().trim();
        const selectedCourse = adminCourseFilter ? adminCourseFilter.value : '';
        const syllabusItems = document.querySelectorAll('#admin-syllabus-list .syllabus-item');
        
        let matches = [];
        
        syllabusItems.forEach(item => {
            const title = item.querySelector('h4').textContent.toLowerCase();
            const subject = item.querySelector('.syllabus-meta span:nth-child(2)').textContent.toLowerCase();
            const courseCode = item.querySelector('.syllabus-title p').textContent.toLowerCase();
            
            const courseMatch = !selectedCourse || courseCode.includes(selectedCourse.toLowerCase());
            
            if (!courseMatch) {
                item.style.display = 'none';
                return;
            }
            
            let score = 0;
            
            if (!query) {
                matches.push({ item, score: 1 });
                return;
            }
            
            if (title === query) score += 100;
            if (subject.includes(query)) score += 90;
            if (courseCode.includes(query)) score += 80;
            
            if (title.includes(query)) score += 70;
            if (subject.includes(query)) score += 60;
            
            query.split(' ').forEach(word => {
                if (word.length > 2) {
                    if (title.includes(word)) score += 50;
                    if (subject.includes(word)) score += 40;
                    if (courseCode.includes(word)) score += 30;
                }
            });
            
            if (score > 0) {
                matches.push({ item, score });
            }
        });
        
        syllabusItems.forEach(item => {
            item.style.display = 'none';
        });
        
        matches.sort((a, b) => b.score - a.score);
        matches.forEach((match, index) => {
            match.item.style.display = 'block';
            match.item.style.order = index;
        });
        
        console.log(`🔍 Admin search: ${matches.length} files found for "${query}" in course "${selectedCourse || 'All'}"`);
    };
    
    adminSearch.addEventListener('input', performAdminSearch);
    
    if (adminCourseFilter) {
        adminCourseFilter.addEventListener('change', performAdminSearch);
    }
    
    this.populateAdminCourseFilter();
}

populateAdminCourseFilter() {
    const adminCourseFilter = document.getElementById('admin-course-filter');
    
    if (!adminCourseFilter) return;
    
    const courses = [...new Set(this.courses.map(course => course.code))];
    
    adminCourseFilter.innerHTML = '<option value="">All Courses</option>' +
        courses.map(course => 
            `<option value="${course}">${course}</option>`
        ).join('');
    
    console.log('✅ Admin course filter populated');
}

  displayAdminSyllabi(syllabi) {
    const container = document.getElementById("admin-syllabus-list");
    if (!container) return;

    if (syllabi.length === 0) {
      container.innerHTML = '<p class="no-data">No files uploaded yet.</p>';
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
                          syllabus.description || ""
                        )} - ${syllabus.courseCode}</p>
                    </div>
                    <div class="syllabus-actions">
                        <button class="btn btn-danger delete-syllabus-admin" data-id="${
                          syllabus._id
                        }">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="syllabus-meta">
                    <span>Semester ${syllabus.semester}</span>
                    <span>Subject: ${Utils.sanitizeHTML(
                      syllabus.subject
                    )}</span>
                    <span>Version: ${syllabus.version}</span>
                    <span>Downloads: ${syllabus.downloadCount}</span>
                    <span>Views: ${syllabus.viewCount}</span>
                    <span>Uploaded: ${Utils.formatDate(
                      syllabus.createdAt
                    )}</span>
                </div>
            </div>
        `
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
                        <strong>${index + 1}. ${Utils.sanitizeHTML(
            file.title
          )}</strong>
                        <div>${file.courseCode} - ${Utils.sanitizeHTML(
            file.subject
          )}</div>
                    </div>
                    <div class="file-stats">
                        <span>Downloads: ${file.downloadCount}</span>
                        <span>Views: ${file.viewCount}</span>
                    </div>
                </div>
            `
        )
        .join("");
    }
  }

  setupMobileAdminPanel() {
  const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
  
  adminTabBtns.forEach(btn => {
    btn.addEventListener('touchstart', function(e) {
      this.style.transform = 'scale(0.98)';
    });
    
    btn.addEventListener('touchend', function(e) {
      this.style.transform = 'scale(1)';
    });
  });
  
  const formInputs = document.querySelectorAll('input, select, textarea');
  formInputs.forEach(input => {
    input.addEventListener('touchstart', function(e) {
      this.style.fontSize = '16px';
    });
  });
}

  setupEventListeners() {
    document.getElementById("mobile-menu-trigger")?.addEventListener("click", () => this.toggleMobileMenu());

    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = e.target.getAttribute("href").substring(1);
        this.showSection(target);
      });
    });

    document.addEventListener('click', (e) => {
        const nav = document.getElementById('nav');
        const logo = document.getElementById('mobile-menu-trigger');
        
        if (nav && nav.classList.contains('active') && 
            !nav.contains(e.target) && 
            e.target !== logo && 
            !logo.contains(e.target)) {
            this.closeMobileMenu();
        }
    });

    const overlay = document.getElementById('nav-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => this.closeMobileMenu());
    }

    document
      .getElementById("theme-toggle")
      ?.addEventListener("click", () => this.toggleTheme());

    document
      .getElementById("back-to-courses")
      ?.addEventListener("click", () => this.showSection("home"));
      this.setupPasswordToggle();

    this.setupCoursesDropdown();

    this.setupMobileAdminPanel();

    document
      .getElementById("admin-login-form")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        this.handleLogin(email, password);
      });

    document
      .getElementById("logout-btn")
      ?.addEventListener("click", () => this.handleLogout());

    document.getElementById("close-pdf")?.addEventListener("click", () => {
      document.getElementById("pdf-modal").classList.remove("active");
    });

    document.getElementById("pdf-modal")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        document.getElementById("pdf-modal").classList.remove("active");
      }
    });

    this.setupSearch();

    this.setupAdminFunctionality();

    document
      .getElementById("upload-syllabus-btn")
      ?.addEventListener("click", () => {
        this.showSection("admin");
        this.switchAdminTab("upload");
      });

    this.populateAdminFormSelects();
  }

setupCoursesDropdown() {
    const coursesLink = document.getElementById('courses-link');
    const navDropdown = coursesLink?.closest('.nav-dropdown');
    
    if (!coursesLink || !navDropdown) return;
    
    coursesLink.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            navDropdown.classList.toggle('active');
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!navDropdown.contains(e.target)) {
            navDropdown.classList.remove('active');
        }
    });
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
        if (type === "text") {
          icon.className = "fas fa-eye-slash";
          this.title = "Hide password";
        } else {
          icon.className = "fas fa-eye";
          this.title = "Show password";
        }
      });
    }
  }

  async populateAdminFormSelects() {
    const courseSelect = document.getElementById("upload-course");
    const adminCourseFilter = document.getElementById("admin-course-filter");

    if (courseSelect) {
      courseSelect.innerHTML =
        '<option value="">Select Course</option>' +
        this.courses
          .map(
            (course) =>
              `<option value="${course.code}">${Utils.sanitizeHTML(
                course.name
              )}</option>`
          )
          .join("");
    }

    if (adminCourseFilter) {
      adminCourseFilter.innerHTML =
        '<option value="">All Courses</option>' +
        this.courses
          .map(
            (course) =>
              `<option value="${course.code}">${Utils.sanitizeHTML(
                course.name
              )}</option>`
          )
          .join("");
    }

    const semesterSelect = document.getElementById("upload-semester");
    if (semesterSelect) {
      semesterSelect.innerHTML =
        '<option value="">Select Semester</option>' +
        Array.from(
          { length: 8 },
          (_, i) => `<option value="${i + 1}">Semester ${i + 1}</option>`
        ).join("");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new SyllabusPortal();
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = SyllabusPortal;
}