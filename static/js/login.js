// Login Page JS Controller

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
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
        btnText.textContent = "Authenticate Credentials";
        btnSpinner.classList.add('hide');
    }

    function showSuccess(redirectUrl) {
        errorAlert.classList.add('hide');
        successAlert.classList.remove('hide');
        form.reset();
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1200);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Clear previous alerts
        errorAlert.classList.add('hide');
        successAlert.classList.add('hide');

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showError("Please fill out all fields.");
            return;
        }

        // Disable button & show spinner
        submitBtn.disabled = true;
        btnText.textContent = "Authenticating...";
        btnSpinner.classList.remove('hide');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess(data.redirect || '/verify');
            } else {
                showError(data.error || "Invalid username or password.");
            }
        } catch (error) {
            showError("Connection failure. Check if server is running.");
            console.error("Login error:", error);
        }
    });
});
