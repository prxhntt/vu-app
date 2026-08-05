// Forgot Password Page Controller
class ForgotPasswordPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initTheme();
        console.log('✅ Forgot Password page initialized');
    }

    initTheme() {
        const savedTheme = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector("#theme-toggle i");
        if (icon) {
            icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
        }
    }

    setupEventListeners() {
        // Step 1: Send OTP
        document.getElementById('forgot-email-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('forgot-email').value.trim();
            
            if (!email) {
                Utils.showToast('Please enter your email', 'warning');
                return;
            }

            try {
                const sendBtn = document.getElementById('send-otp-btn');
                sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                sendBtn.disabled = true;

                const response = await fetch('/api/password/forgot/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (data.success) {
                    document.getElementById('forgot-step-1').style.display = 'none';
                    document.getElementById('forgot-step-2').style.display = 'block';
                    document.getElementById('forgot-email-display').textContent = email;
                    
                    this.startForgotTimer();
                    Utils.showToast('✅ OTP sent to your email!', 'success');
                } else {
                    Utils.showToast('❌ ' + data.message, 'error');
                }
            } catch (error) {
                Utils.showToast('❌ Network error. Please try again.', 'error');
            } finally {
                const sendBtn = document.getElementById('send-otp-btn');
                sendBtn.innerHTML = '<i class="fas fa-envelope"></i> Send OTP';
                sendBtn.disabled = false;
            }
        });

        // Step 2: Reset Password with OTP
        document.getElementById('forgot-reset-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('forgot-email').value.trim();
            const otp = document.getElementById('forgot-otp').value.trim();
            const newPassword = document.getElementById('forgot-new-password').value;
            const confirmPassword = document.getElementById('forgot-confirm-password').value;

            if (newPassword !== confirmPassword) {
                Utils.showToast('Passwords do not match', 'error');
                return;
            }

            if (newPassword.length < 6) {
                Utils.showToast('Password must be at least 6 characters', 'error');
                return;
            }

            if (!otp || otp.length < 6) {
                Utils.showToast('Please enter valid 6-digit OTP', 'warning');
                return;
            }

            try {
                const resetBtn = document.getElementById('reset-password-btn');
                resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
                resetBtn.disabled = true;

                const response = await fetch('/api/password/forgot/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp, newPassword, confirmPassword })
                });

                const data = await response.json();

                if (data.success) {
                    Utils.showToast('✅ Password reset successfully! Please login.', 'success');
                    
                    if (window.forgotTimerInterval) {
                        clearInterval(window.forgotTimerInterval);
                    }
                    
                    // Redirect to login page after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/admin';
                    }, 2000);
                } else {
                    Utils.showToast('❌ ' + data.message, 'error');
                }
            } catch (error) {
                Utils.showToast('❌ Network error. Please try again.', 'error');
            } finally {
                const resetBtn = document.getElementById('reset-password-btn');
                resetBtn.innerHTML = '<i class="fas fa-check"></i> Reset Password';
                resetBtn.disabled = false;
            }
        });

        // Resend OTP
        document.getElementById('forgot-resend-btn')?.addEventListener('click', async () => {
            const email = document.getElementById('forgot-email').value.trim();
            
            try {
                const resendBtn = document.getElementById('forgot-resend-btn');
                resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                resendBtn.disabled = true;

                const response = await fetch('/api/password/forgot/resend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (data.success) {
                    this.startForgotTimer();
                    Utils.showToast('✅ New OTP sent!', 'success');
                } else {
                    Utils.showToast('❌ ' + data.message, 'error');
                }
            } catch (error) {
                Utils.showToast('❌ Network error. Please try again.', 'error');
            } finally {
                const resendBtn = document.getElementById('forgot-resend-btn');
                resendBtn.innerHTML = '<i class="fas fa-redo"></i> Resend OTP';
                resendBtn.disabled = false;
            }
        });

        // Back to login
        document.getElementById('forgot-back-btn')?.addEventListener('click', () => {
            window.location.href = '/admin';
        });
    }

    // ✅ Forgot Password Timer
    startForgotTimer() {
        let timeLeft = 300;
        const timerDisplay = document.getElementById('forgot-timer-text');
        
        if (window.forgotTimerInterval) {
            clearInterval(window.forgotTimerInterval);
        }
        
        window.forgotTimerInterval = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            if (timerDisplay) {
                timerDisplay.textContent = `OTP expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                if (timeLeft < 60) {
                    timerDisplay.style.color = '#dc2626';
                    timerDisplay.style.fontWeight = 'bold';
                }
            }
            
            if (timeLeft <= 0) {
                clearInterval(window.forgotTimerInterval);
                if (timerDisplay) {
                    timerDisplay.textContent = '⏰ OTP expired!';
                    timerDisplay.style.color = '#dc2626';
                }
            }
        }, 1000);
    }
}

// ✅ Toggle Password Visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = input.parentElement.querySelector('.password-toggle i');
    if (!icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    window.forgotPasswordPage = new ForgotPasswordPage();
});