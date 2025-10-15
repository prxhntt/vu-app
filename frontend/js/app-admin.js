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
        
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        activityEvents.forEach(event => {
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
        window.addEventListener('beforeunload', (e) => {
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
        this.showSection("home");
    }

    setupEventListeners() {
        document.getElementById("mobile-menu-trigger")?.addEventListener("click", () => {
            this.toggleMobileMenu();
        });

        document.getElementById("theme-toggle")?.addEventListener("click", () => {
            this.toggleTheme();
        });

        document.getElementById("admin-login-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            this.handleLogin(email, password);
        });

        document.getElementById("logout-btn")?.addEventListener("click", () => {
            this.handleLogout();
        });

        this.setupPasswordToggle();

        document.getElementById('nav-overlay')?.addEventListener('click', () => {
            this.closeMobileMenu();
        });
    }

    setupPasswordToggle() {
        const passwordToggle = document.getElementById("password-toggle");
        const passwordInput = document.getElementById("password");

        if (passwordToggle && passwordInput) {
            passwordToggle.addEventListener("click", function () {
                const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
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
            const courseFilter = adminCourseFilter ? adminCourseFilter.value : '';

            if (!query && !courseFilter) {
                this.displayAdminSyllabi(this.allSyllabi);
                return;
            }

            const filteredSyllabi = this.allSyllabi.filter(syllabus => {
                const matchesCourse = !courseFilter || syllabus.courseCode === courseFilter;
                const matchesSearch = !query || 
                    syllabus.title.toLowerCase().includes(query) ||
                    syllabus.subject.toLowerCase().includes(query) ||
                    syllabus.courseCode.toLowerCase().includes(query) ||
                    (syllabus.description && syllabus.description.toLowerCase().includes(query));
                
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
            reader.onerror = error => reject(error);
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
            fileName: file.name
        };

        const response = await fetch('/api/syllabi/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(uploadData)
        });

        const result = await response.json();

        if (response.ok) {
            Utils.showToast("File uploaded successfully to cloud!", "success");
            e.target.reset();
            
            if (document.getElementById("manage-tab").classList.contains("active")) {
                this.loadAdminSyllabi();
            }
        } else {
            throw new Error(result.message || 'Upload failed');
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
            this.allSyllabi = syllabi;
            this.displayAdminSyllabi(syllabi);
        } catch (error) {
            Utils.showToast('Failed to load admin syllabi', 'error');
            console.error('Error loading admin syllabi:', error);
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
                                    syllabus.description || ""
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
        document.getElementById("total-files").textContent = analytics.totalFiles || 0;
        document.getElementById("total-downloads").textContent = analytics.totalDownloads || 0;
        document.getElementById("total-views").textContent = analytics.totalViews || 0;

        const topFilesList = document.getElementById("top-downloaded-list");
        if (topFilesList) {
            if (!analytics.topDownloaded || analytics.topDownloaded.length === 0) {
                topFilesList.innerHTML = '<p class="no-data">No data available yet.</p>';
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
                    `
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
                this.courses.map(course => 
                    `<option value="${course.code}">${Utils.sanitizeHTML(course.name)}</option>`
                ).join("");
        }

        if (adminCourseFilter) {
            adminCourseFilter.innerHTML = 
                '<option value="">All Courses</option>' +
                this.courses.map(course => 
                    `<option value="${course.code}">${Utils.sanitizeHTML(course.name)}</option>`
                ).join("");
        }

        const semesterSelect = document.getElementById("upload-semester");
        if (semesterSelect) {
            semesterSelect.innerHTML = 
                '<option value="">Select Semester</option>' +
                Array.from({ length: 8 }, (_, i) => 
                    `<option value="${i + 1}">Semester ${i + 1}</option>`
                ).join("");
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.adminPage = new AdminPage();
});