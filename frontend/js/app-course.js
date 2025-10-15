
class CourseDetailsPage {
    constructor() {
        this.currentCourse = null;
        this.syllabi = [];
        this.courseCode = this.getCourseCodeFromURL();
        this.init();
    }

    getCourseCodeFromURL() {
        const path = window.location.pathname;
        const parts = path.split('/');
        return parts[parts.length - 1];
    }

    async init() {
        this.initTheme();
        await this.loadCourseDetails();
        this.setupEventListeners();
        console.log("✅ Course details page initialized");
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

    async loadCourseDetails() {
        try {
            Utils.showLoading(true);
            
           
            this.currentCourse = await api.getCourse(this.courseCode);
            
           
            this.syllabi = await api.getCourseSyllabi(this.courseCode);
            
            this.updateCourseUI();
            this.displaySyllabi();
            
        } catch (error) {
            Utils.showToast("Failed to load course details", "error");
            console.error("Error loading course details:", error);
            
           
            document.getElementById("course-title").textContent = "Course Not Found";
            document.getElementById("course-description").textContent = "The requested course could not be found.";
            document.getElementById("syllabus-list").innerHTML = 
                '<p class="no-data">Course not available</p>';
                
        } finally {
            Utils.showLoading(false);
        }
    }

    updateCourseUI() {
        document.getElementById("course-title").textContent = this.currentCourse.name;
        document.getElementById("course-description").textContent = 
            this.currentCourse.description || "B.Tech program syllabus and study materials";
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
            list.innerHTML = '<p class="no-data">No syllabus files available for this course yet.</p>';
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
                                <button class="btn btn-primary view-pdf" data-id="${syllabus._id}">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="btn btn-secondary download-pdf" data-id="${syllabus._id}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                        <div class="syllabus-meta">
                            <span>Semester ${syllabus.semester}</span>
                            <span>Subject: ${Utils.sanitizeHTML(syllabus.subject)}</span>
                            <span>Version: ${syllabus.version}</span>
                            <span>Size: ${Utils.formatFileSize(syllabus.fileSize)}</span>
                            <span>Uploaded: ${Utils.formatDate(syllabus.createdAt)}</span>
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
    }

 async viewPdf(syllabusId) {
    try {
        const syllabus = this.syllabi.find((s) => s._id === syllabusId) || 
        await api.getSyllabus(syllabusId);

        document.getElementById("pdf-title").textContent = syllabus.title;
        
  
        const pdfUrl = `/api/syllabi/${syllabusId}/preview`;
        document.getElementById("pdf-viewer").src = pdfUrl;

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
        
        const downloadUrl = `/api/syllabi/${syllabusId}/download`;
        window.open(downloadUrl, "_blank");
    } catch (error) {
        Utils.showToast("Failed to download PDF", "error");
        console.error("Error downloading PDF:", error);
    }
}

    setupEventListeners() {
      
        document.getElementById("mobile-menu-trigger")?.addEventListener("click", () => {
            this.toggleMobileMenu();
        });

      
        document.getElementById("theme-toggle")?.addEventListener("click", () => {
            this.toggleTheme();
        });

      
        const semesterFilter = document.getElementById("course-semester-filter");
        if (semesterFilter) {
            semesterFilter.addEventListener("change", () => {
                this.displaySyllabi();
            });
        }

       
        document.getElementById("close-pdf")?.addEventListener("click", () => {
            document.getElementById("pdf-modal").classList.remove("active");
        });

        document.getElementById("pdf-modal")?.addEventListener("click", (e) => {
            if (e.target === e.currentTarget) {
                document.getElementById("pdf-modal").classList.remove("active");
            }
        });

     
        document.getElementById('nav-overlay')?.addEventListener('click', () => {
            this.closeMobileMenu();
        });
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
}


document.addEventListener("DOMContentLoaded", () => {
    window.courseDetailsPage = new CourseDetailsPage();
});