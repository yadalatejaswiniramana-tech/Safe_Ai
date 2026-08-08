// PIN Verification JS Controller

document.addEventListener('DOMContentLoaded', () => {
    const dots = document.querySelectorAll('#pin-display-dots .pin-dot');
    const numberBtns = document.querySelectorAll('.number-btn');
    const clearBtn = document.getElementById('clear-btn');
    const submitBtn = document.getElementById('submit-pin-btn');
    const errorAlert = document.getElementById('error-alert');
    const successAlert = document.getElementById('success-alert');
    const errorMessage = document.getElementById('error-message');

    let currentPin = [];

    function updateDots() {
        dots.forEach((dot, idx) => {
            if (idx < currentPin.length) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        if (currentPin.length === 4) {
            submitBtn.disabled = false;
            submitBtn.style.background = 'var(--primary)';
            submitBtn.style.borderColor = 'var(--primary)';
            submitBtn.style.color = 'var(--text-inverse)';
            submitBtn.style.boxShadow = '0 0 15px var(--primary)';
        } else {
            submitBtn.disabled = true;
            submitBtn.style.background = 'rgba(255, 255, 255, 0.01)';
            submitBtn.style.borderColor = 'var(--border-glass)';
            submitBtn.style.color = 'var(--text-main)';
            submitBtn.style.boxShadow = 'none';
        }
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorAlert.classList.remove('hide');
        successAlert.classList.add('hide');
        
        // Shake feedback animation on failure
        const display = document.getElementById('pin-display-dots');
        display.classList.add('shake');
        setTimeout(() => display.classList.remove('shake'), 400);

        // Reset pin digits
        currentPin = [];
        updateDots();
    }

    function showSuccess(redirectUrl) {
        errorAlert.classList.add('hide');
        successAlert.classList.remove('hide');
        setTimeout(() => {
            window.location.href = redirectUrl || '/dashboard';
        }, 1200);
    }

    numberBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentPin.length < 4) {
                currentPin.push(btn.getAttribute('data-value'));
                updateDots();
                
                // Auto-submit when 4th digit is entered is a very nice UX enhancement!
                if (currentPin.length === 4) {
                    setTimeout(() => {
                        submitBtn.click();
                    }, 200);
                }
            }
        });
    });

    clearBtn.addEventListener('click', () => {
        if (currentPin.length > 0) {
            currentPin.pop();
            updateDots();
        }
        errorAlert.classList.add('hide');
    });

    submitBtn.addEventListener('click', async () => {
        if (currentPin.length !== 4) return;

        const pinString = currentPin.join('');

        try {
            const response = await fetch('/api/verify-pin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pin: pinString })
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess(data.redirect);
            } else {
                showError(data.error || "Passcode verification failed.");
            }
        } catch (error) {
            showError("Network unreachable. Please retry.");
            console.error("Verify pin error:", error);
        }
    });
});
