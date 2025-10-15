
class HomePage {
    constructor() {
        this.courses = [];
        this.init();
    }

    async init() {
        this.initTheme();
        await this.loadCourses();
        this.setupEventListeners();
        this.setupSearch();
        console.log("✅ Home page initialized");
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
                    <a href="/course/${course.code}" class="course-card-link">
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
                    </a>
                `
            )
            .join("");
    }

    setupSearch() {
    const searchInput = document.getElementById("global-search");
    const searchBtn = document.getElementById("search-btn");
    const branchFilter = document.getElementById("branch-filter");
    const semesterFilter = document.getElementById("semester-filter");

    if (!searchInput) return;

    const performSearch = () => {
        const query = searchInput.value.toLowerCase().trim();
        const branch = branchFilter ? branchFilter.value : '';
        const semester = semesterFilter ? semesterFilter.value : '';

        const grid = document.getElementById("courses-grid");
        
      
        const existingMessage = grid.querySelector('.no-results');
        if (existingMessage) {
            existingMessage.remove();
        }

        if (!query && !branch && !semester) {
          
            this.displayCourses();
            return;
        }

       
        const filteredCourses = this.courses.filter(course => {
            const matchesBranch = !branch || course.branch === branch;
            const matchesSemester = !semester || course.semesters.includes(parseInt(semester));
            const matchesSearch = !query || 
                course.name.toLowerCase().includes(query) ||
                course.code.toLowerCase().includes(query) ||
                (course.description && course.description.toLowerCase().includes(query));
            
            return matchesBranch && matchesSemester && matchesSearch;
        });

      
        if (query) {
            filteredCourses.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aCode = a.code.toLowerCase();
                const bCode = b.code.toLowerCase();

           
                if (aName === query && bName !== query) return -1;
                if (bName === query && aName !== query) return 1;

                
                if (aCode === query && bCode !== query) return -1;
                if (bCode === query && aCode !== query) return 1;

               
                const aStartsWith = aName.startsWith(query);
                const bStartsWith = bName.startsWith(query);
                if (aStartsWith && !bStartsWith) return -1;
                if (bStartsWith && !aStartsWith) return 1;

              
                const aCodeStartsWith = aCode.startsWith(query);
                const bCodeStartsWith = bCode.startsWith(query);
                if (aCodeStartsWith && !bCodeStartsWith) return -1;
                if (bCodeStartsWith && !aCodeStartsWith) return 1;

               
                const aWordMatch = this.hasWordBoundaryMatch(aName, query);
                const bWordMatch = this.hasWordBoundaryMatch(bName, query);
                if (aWordMatch && !bWordMatch) return -1;
                if (bWordMatch && !aWordMatch) return 1;

               
                const aContains = aName.includes(query);
                const bContains = bName.includes(query);
                if (aContains && !bContains) return -1;
                if (bContains && !aContains) return 1;

              
                const aCodeContains = aCode.includes(query);
                const bCodeContains = bCode.includes(query);
                if (aCodeContains && !bCodeContains) return -1;
                if (bCodeContains && !aCodeContains) return 1;

             
                return 0;
            });
        }

        
        this.displayFilteredCourses(filteredCourses);

     
        if (filteredCourses.length === 0) {
            this.showNoResultsMessage(grid, query);
        }
    };

   
    if (searchBtn) {
        searchBtn.addEventListener("click", performSearch);
    }

    searchInput.addEventListener("input", performSearch);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") performSearch();
    });

    if (branchFilter) {
        branchFilter.addEventListener("change", performSearch);
    }
    if (semesterFilter) {
        semesterFilter.addEventListener("change", performSearch);
    }
}


hasWordBoundaryMatch(text, query) {
    const words = text.split(/\s+/);
    return words.some(word => word === query || word.startsWith(query));
}


displayFilteredCourses(courses) {
    const grid = document.getElementById("courses-grid");
    if (!grid) return;

    if (courses.length === 0) {
        grid.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><h3>No courses found</h3></div>';
        return;
    }

    grid.innerHTML = courses
        .map(
            (course) => `
                <a href="/course/${course.code}" class="course-card-link">
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
                </a>
            `
        )
        .join("");
}


showNoResultsMessage(grid, query) {
    let message = 'No courses found';
    if (query) {
        message = `No courses found for "${query}"`;
    }
    
    
}

    setupEventListeners() {
       
        document.getElementById("mobile-menu-trigger")?.addEventListener("click", () => {
            this.toggleMobileMenu();
        });

       
        document.getElementById("theme-toggle")?.addEventListener("click", () => {
            this.toggleTheme();
        });

       
        document.getElementById("logout-btn")?.addEventListener("click", () => {
            this.handleLogout();
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

    handleLogout() {
        localStorage.removeItem("adminToken");
        window.location.href = "/";
    }
}


document.addEventListener("DOMContentLoaded", () => {
    window.homePage = new HomePage();
});