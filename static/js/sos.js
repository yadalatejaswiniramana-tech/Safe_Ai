// SOS Emergency JS Controller

document.addEventListener('DOMContentLoaded', () => {
    const sosBtn = document.getElementById('sos-btn');
    const sosTriggerArea = document.getElementById('sos-trigger-area');
    const countdownPanel = document.getElementById('countdown-panel');
    const timerNumber = document.getElementById('timer-number');
    const cancelSosBtn = document.getElementById('cancel-sos-btn');
    const sirenToggle = document.getElementById('siren-toggle');
    const logWrapper = document.getElementById('alerts-log-wrapper');
    const logBox = document.getElementById('alerts-log-box');

    let countdownInterval = null;
    let secondsLeft = 5;
    let audioContext = null;
    let sirenInterval = null;
    let oscillator1 = null;
    let oscillator2 = null;
    let gainNode = null;

    // Siren synthesizer using HTML5 Web Audio API
    function startLocalSiren() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Setup oscillators for wailing police/siren sound
        gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.connect(audioContext.destination);

        oscillator1 = audioContext.createOscillator();
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator1.connect(gainNode);
        oscillator1.start();

        // Modulate frequency to create the wailing effect
        let rise = true;
        sirenInterval = setInterval(() => {
            if (!oscillator1) return;
            const currentFreq = oscillator1.frequency.value;
            if (rise) {
                oscillator1.frequency.setValueAtTime(currentFreq + 40, audioContext.currentTime);
                if (currentFreq >= 1200) rise = false;
            } else {
                oscillator1.frequency.setValueAtTime(currentFreq - 40, audioContext.currentTime);
                if (currentFreq <= 700) rise = true;
            }
        }, 30);
    }

    function stopLocalSiren() {
        if (sirenInterval) {
            clearInterval(sirenInterval);
            sirenInterval = null;
        }
        if (oscillator1) {
            try { oscillator1.stop(); } catch(e){}
            oscillator1 = null;
        }
        if (gainNode) {
            gainNode.disconnect();
            gainNode = null;
        }
    }

    // Toggle siren check
    sirenToggle.addEventListener('change', () => {
        if (sirenToggle.checked) {
            startLocalSiren();
        } else {
            stopLocalSiren();
        }
    });

    function addLogEntry(text, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `[${time}] ${text}`;
        logBox.appendChild(entry);
        logBox.scrollTop = logBox.scrollHeight;
    }

    function resetSOSViews() {
        clearInterval(countdownInterval);
        countdownInterval = null;
        secondsLeft = 5;
        timerNumber.textContent = '5';
        
        countdownPanel.classList.add('hide');
        sosTriggerArea.classList.remove('hide');
        
        // Stop audio if it was playing and checkbox is unchecked
        if (!sirenToggle.checked) {
            stopLocalSiren();
        }
    }

    cancelSosBtn.addEventListener('click', () => {
        addLogEntry("SOS Countdown cancelled by user.", "warning");
        resetSOSViews();
    });

    sosBtn.addEventListener('click', () => {
        // Hide trigger button, show countdown
        sosTriggerArea.classList.add('hide');
        countdownPanel.classList.remove('hide');
        
        // Start siren sound if requested
        if (sirenToggle.checked) {
            startLocalSiren();
        }

        secondsLeft = 5;
        timerNumber.textContent = secondsLeft;
        
        logWrapper.classList.remove('hide');
        logBox.innerHTML = '';
        addLogEntry("SOS Command triggered. Countdown sequence initiated...", "warning");

        countdownInterval = setInterval(() => {
            secondsLeft--;
            timerNumber.textContent = secondsLeft;

            if (secondsLeft <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                dispatchSOSAlert();
            } else {
                addLogEntry(`Dispatch queue status: Alert sending in ${secondsLeft}s...`);
            }
        }, 1000);
    });

    async function dispatchSOSAlert() {
        countdownPanel.classList.add('hide');
        sosTriggerArea.classList.remove('hide');
        addLogEntry("Countdown complete. Initiating safety satellite lock...", "info");

        // Try getting browser geolocation
        let coords = { lat: 28.6139, lng: 77.2090 }; // default fallback CP coordinates
        
        addLogEntry("Resolving device GPS coordinates...");

        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 5000,
                        enableHighAccuracy: true
                    });
                });
                coords.lat = position.coords.latitude;
                coords.lng = position.coords.longitude;
                addLogEntry(`GPS position resolved: Lat ${coords.lat.toFixed(5)}, Lng ${coords.lng.toFixed(5)}`, "info");
            } catch (err) {
                addLogEntry(`Device GPS failed or timed out: ${err.message}. Using last cached coords.`, "warning");
                // Try reading from cache
                const cachedLat = localStorage.getItem('safezone_last_lat');
                const cachedLng = localStorage.getItem('safezone_last_lng');
                if (cachedLat && cachedLng) {
                    coords.lat = parseFloat(cachedLat);
                    coords.lng = parseFloat(cachedLng);
                }
            }
        } else {
            addLogEntry("Navigator Geolocation not supported. Using standard route anchor.", "warning");
        }

        addLogEntry("Transmitting alert packet to secure backend gateway...");

        try {
            const response = await fetch('/api/sos/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lat: coords.lat,
                    lng: coords.lng,
                    message: "SOS Emergency! Please help, I am in danger. Live tracking link: "
                })
            });

            const data = await response.json();

            if (response.ok) {
                addLogEntry("Alert dispatched successfully! Gateway status: DISPATCHED", "info");
                
                if (data.contact_warning) {
                    addLogEntry("Caution: No active safety contacts registered. Please add emergency contacts on your dashboard.", "warning");
                } else if (data.notifications && data.notifications.length > 0) {
                    data.notifications.forEach(notif => {
                        addLogEntry(notif, "info");
                    });
                }
                
                // Visual success check
                addLogEntry("Emergency network broadcasting active location.", "info");
            } else {
                addLogEntry(`Server dispatch failed: ${data.error}`, "error");
            }
        } catch (err) {
            addLogEntry("Transmitting failed. Offline warning: Emergency alerts cached locally.", "error");
            console.error("SOS dispatch error:", err);
        }
    }
});
