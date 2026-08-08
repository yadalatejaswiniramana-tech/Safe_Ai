// Registration Page JS Controller

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('register-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const errorAlert = document.getElementById('error-alert');
    const errorMessage = document.getElementById('error-message');
    const successAlert = document.getElementById('success-alert');

    function showError(msg) {
        errorMessage.textContent = msg;
        errorAlert.classList.remove('hide');
        successAlert.classList.add('hide');
        submitBtn.disabled = false;
        btnText.textContent = "Register Account";
        btnSpinner.classList.add('hide');
    }

    function showSuccess() {
        errorAlert.classList.add('hide');
        successAlert.classList.remove('hide');
        form.reset();
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Clear previous alerts
        errorAlert.classList.add('hide');
        successAlert.classList.add('hide');

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        // Validations
        if (!username || !email || !phone || !password || !confirmPassword) {
            showError("Please fill out all fields.");
            return;
        }

        if (password.length < 6) {
            showError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            showError("Passwords do not match.");
            return;
        }

        // Phone check
        if (!/^\d{10}$/.test(phone)) {
            showError("Please enter a valid 10-digit phone number.");
            return;
        }

        // Disable submit button & show loading state
        submitBtn.disabled = true;
        btnText.textContent = "Registering...";
        btnSpinner.classList.remove('hide');

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, phone, password })
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess();
            } else {
                showError(data.error || "An error occurred during registration.");
            }
        } catch (error) {
            showError("Server unreachable. Please check connection and try again.");
            console.error("Register error:", error);
        }
    });
});
