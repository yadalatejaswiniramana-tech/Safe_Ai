// Location & Proximity Tracker

// Updates user location coordinates on server and syncs the safety score indicators in UI
async function updateLocationOnServer(lat, lng) {
    try {
        const response = await fetch('/api/location/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lat, lng })
        });

        const data = await response.json();
        
        if (response.ok) {
            const safetyInfo = data.safety_info;
            
            // Cache details in localStorage for Dashboard status widget
            localStorage.setItem('safezone_last_lat', lat);
            localStorage.setItem('safezone_last_lng', lng);
            localStorage.setItem('safezone_last_status', safetyInfo.status);
            localStorage.setItem('safezone_last_msg', safetyInfo.message);

            // Trigger UI updates
            updateSafetyUI(safetyInfo);
            
            return safetyInfo;
        } else {
            console.error("Location sync failed:", data.error);
        }
    } catch (err) {
        console.error("Error connecting to location sync gateway:", err);
    }
    return null;
}

// Dynamically updates UI elements representing safety status
function updateSafetyUI(safetyInfo) {
    const scoreVal = document.getElementById('safety-score-val');
    const ring = document.getElementById('safety-ring');
    const levelTitle = document.getElementById('safety-level-title');
    const levelDesc = document.getElementById('safety-level-desc');
    const alertToast = document.getElementById('danger-alert-toast');
    const alertToastText = document.getElementById('alert-toast-text');

    if (!scoreVal) return; // not on map view page

    scoreVal.textContent = safetyInfo.score;
    levelTitle.textContent = safetyInfo.status;
    levelDesc.textContent = safetyInfo.message;

    // Apply color modifications depending on safety level
    // Safe: Green, Moderate: Orange/Yellow, Danger: Red
    let accentColor = 'var(--safe)';
    let glowShadow = '0 0 15px rgba(16, 185, 129, 0.35)';

    if (safetyInfo.status === 'High Risk') {
        accentColor = 'var(--danger)';
        glowShadow = '0 0 20px rgba(239, 68, 68, 0.6)';
        
        // Show floating danger alert toast
        if (alertToast) {
            alertToastText.textContent = safetyInfo.message;
            alertToast.classList.remove('hide');
        }
    } else if (safetyInfo.status === 'Moderate Risk') {
        accentColor = 'var(--warning)';
        glowShadow = '0 0 15px rgba(245, 158, 11, 0.45)';
        
        if (alertToast) {
            alertToastText.textContent = safetyInfo.message;
            alertToast.classList.remove('hide');
        }
    } else {
        // Safe or Low Risk
        accentColor = (safetyInfo.status === 'Low Risk') ? 'var(--cyan-accent)' : 'var(--safe)';
        glowShadow = (safetyInfo.status === 'Low Risk') ? '0 0 12px rgba(6, 182, 212, 0.3)' : '0 0 12px rgba(16, 185, 129, 0.2)';
        
        if (alertToast) {
            alertToast.classList.add('hide');
        }
    }

    ring.style.borderColor = accentColor;
    ring.style.boxShadow = glowShadow;
    scoreVal.style.color = accentColor;
    levelTitle.style.color = accentColor;
}
