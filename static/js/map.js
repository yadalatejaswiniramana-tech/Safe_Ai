// Leaflet Map Initialization and Operations

document.addEventListener('DOMContentLoaded', () => {
    const mapElement = document.getElementById('map-element');
    if (!mapElement) return; // not on map page

    // Map Center coordinates (Connaught Place, Delhi)
    let userLat = 28.6304;
    let userLng = 77.2177;

    // Load coordinates from cache if available
    const cachedLat = localStorage.getItem('safezone_last_lat');
    const cachedLng = localStorage.getItem('safezone_last_lng');
    if (cachedLat && cachedLng) {
        userLat = parseFloat(cachedLat);
        userLng = parseFloat(cachedLng);
    }

    // Initialize Leaflet Map
    const map = L.map('map-element').setView([userLat, userLng], 14);

    // CartoDB Dark Matter tile layer for premium dark theme design
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Custom Icon for User's Location (pulsing cyan point)
    const userIcon = L.divIcon({
        className: 'user-marker-container',
        html: '<div class="user-pulse-dot"></div><div class="user-dot-core"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    // Add user marker
    const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map)
        .bindPopup("<strong>You are here</strong><br>GPS coordinates streaming live.")
        .openPopup();

    // Hotspot overlays arrays
    let hotspotCircles = [];
    let hotspotDataList = [];

    // Fetch and render Crime Hotspots
    async function loadHotspots() {
        try {
            const response = await fetch('/api/hotspots');
            if (!response.ok) throw new Error("Could not load hotspots index");
            
            const hotspots = await response.json();
            hotspotDataList = hotspots;

            hotspots.forEach(hs => {
                let color = 'var(--cyan-accent)';
                let radius = 250; // in meters

                if (hs.risk_level === 'high') {
                    color = 'var(--danger)';
                    radius = 350;
                } else if (hs.risk_level === 'medium') {
                    color = 'var(--warning)';
                    radius = 280;
                }

                // Draw circle indicating risk proximity limits
                const circle = L.circle([hs.lat, hs.lng], {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.15,
                    radius: radius,
                    weight: 1.5,
                    dashArray: hs.risk_level === 'high' ? '5, 5' : 'none'
                }).addTo(map);

                // Add a marker in center of circle with warning icon
                let iconClass = hs.risk_level === 'high' ? 'fa-solid fa-triangle-exclamation text-danger' : 
                                hs.risk_level === 'medium' ? 'fa-solid fa-circle-exclamation text-warning' : 
                                'fa-solid fa-circle-info text-safe';
                                
                const hsIcon = L.divIcon({
                    className: 'hotspot-icon-container',
                    html: `<i class="${iconClass}" style="font-size:1.1rem; filter: drop-shadow(0 0 4px rgba(0,0,0,0.8));"></i>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                L.marker([hs.lat, hs.lng], { icon: hsIcon }).addTo(map)
                    .bindPopup(`<strong>${hs.name}</strong><br>Risk level: <span class="text-${hs.risk_level}">${hs.risk_level.toUpperCase()}</span><br>${hs.description}`);

                // Store reference
                hotspotCircles.push({
                    id: hs._id,
                    lat: hs.lat,
                    lng: hs.lng,
                    circle: circle
                });
            });

            // If focused on specific hotspot from Hotspot page redirect
            if (window.focusHotspotOnLoad) {
                map.flyTo([window.focusHotspotOnLoad.lat, window.focusHotspotOnLoad.lng], 15, { duration: 1.5 });
                // find corresponding hotspot circle
                const matchingHs = hotspots.find(h => 
                    Math.abs(h.lat - window.focusHotspotOnLoad.lat) < 0.0001 && 
                    Math.abs(h.lng - window.focusHotspotOnLoad.lng) < 0.0001
                );
                if (matchingHs) {
                    setTimeout(() => {
                        L.popup()
                            .setLatLng([matchingHs.lat, matchingHs.lng])
                            .setContent(`<strong>${matchingHs.name}</strong><br>Risk level: <span class="text-${matchingHs.risk_level}">${matchingHs.risk_level.toUpperCase()}</span><br>${matchingHs.description}`)
                            .openOn(map);
                    }, 1600);
                }
            } else {
                // Initialize default safety statistics calculation
                updateLocationOnServer(userLat, userLng);
            }
        } catch (error) {
            console.error("Hotspot rendering failure:", error);
        }
    }

    // Call load hotspots
    loadHotspots();

    // Map control updates
    const liveLat = document.getElementById('live-lat');
    const liveLng = document.getElementById('live-lng');
    const recenterBtn = document.getElementById('recenter-btn');

    function updateCoordinateLabel(lat, lng) {
        if (liveLat) {
            liveLat.textContent = lat.toFixed(5);
            liveLng.textContent = lng.toFixed(5);
        }
    }
    
    // Set initial label
    updateCoordinateLabel(userLat, userLng);

    recenterBtn.addEventListener('click', () => {
        map.setView(userMarker.getLatLng(), 15);
        userMarker.openPopup();
    });

    // Location Simulator Buttons click handler
    const simButtons = document.querySelectorAll('.btn-sim');
    const slider = document.getElementById('sim-slider');
    const offsetVal = document.getElementById('offset-val');

    let baseLat = userLat;
    let baseLng = userLng;

    simButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lat = parseFloat(btn.getAttribute('data-lat'));
            const lng = parseFloat(btn.getAttribute('data-lng'));
            
            // Reset slider offset
            if (slider) {
                slider.value = 0;
                offsetVal.textContent = '0.0000°';
            }

            baseLat = lat;
            baseLng = lng;
            moveUserMarker(lat, lng);
            map.flyTo([lat, lng], 15, { duration: 1.2 });
        });
    });

    // Simulator Range Slider movement
    if (slider) {
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            const degreeOffset = val * 0.00015; // scalar multiplier
            offsetVal.textContent = `${degreeOffset.toFixed(4)}°`;

            // Adjust marker position relative to starting base point
            const targetLat = baseLat + degreeOffset;
            const targetLng = baseLng + (degreeOffset * 0.5); // move diagonally slightly
            
            moveUserMarker(targetLat, targetLng);
        });
    }

    function moveUserMarker(lat, lng) {
        userMarker.setLatLng([lat, lng]);
        updateCoordinateLabel(lat, lng);
        
        // Sync position details with backend api
        updateLocationOnServer(lat, lng);
    }

    // Dynamic routing path simulator
    let routePolyline = null;
    const calcRouteBtn = document.getElementById('calc-route-btn');
    const routeSelect = document.getElementById('route-target-select');

    // Preset route vectors
    const routesMap = {
        // CP path towards destinations
        india_gate: [
            [28.6304, 77.2177], // CP
            [28.6250, 77.2200], // radial bypass
            [28.6180, 77.2250], // radial bypass 2
            [28.6129, 77.2295]  // India Gate
        ],
        connaught_place: [
            [28.6432, 77.2148], // Paharganj
            [28.6380, 77.2155], // bypass CP boundary
            [28.6330, 77.2170],
            [28.6304, 77.2177]  // CP
        ],
        karol_bagh: [
            [28.6304, 77.2177], // CP
            [28.6350, 77.2050], // west link
            [28.6400, 77.1950],
            [28.6450, 77.1900]  // Karol Bagh
        ],
        gb_road: [
            [28.6304, 77.2177], // CP
            [28.6360, 77.2210], // approach lanes
            [28.6415, 77.2244]  // GB Road
        ]
    };

    calcRouteBtn.addEventListener('click', () => {
        const target = routeSelect.value;
        const startPoint = userMarker.getLatLng();
        
        // Clear previous polylines
        if (routePolyline) {
            map.removeLayer(routePolyline);
        }

        // Retrieve predefined coordinate arrays
        let pathPoints = routesMap[target] || [];
        
        if (pathPoints.length === 0) return;

        // Anchor the path start point to the user's actual simulated coordinate
        pathPoints = [[startPoint.lat, startPoint.lng], ...pathPoints.slice(1)];

        // Draw green routing paths that bypass High risk zones
        // Make the line look glowing
        routePolyline = L.polyline(pathPoints, {
            color: '#10b981', // Emerald green
            weight: 6,
            opacity: 0.8,
            dashArray: '10, 10',
            lineJoin: 'round'
        }).addTo(map);

        map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

        // Evaluate safety of the generated path coordinates
        let containsHighRisk = false;
        let warningText = "";

        // Check if any point on path intersects a high/medium risk zone
        pathPoints.forEach(pt => {
            hotspotDataList.forEach(hs => {
                if (hs.risk_level === 'high') {
                    const dist = calculateHaversineDistance(pt[0], pt[1], hs.lat, hs.lng);
                    if (dist <= 350) {
                        containsHighRisk = true;
                        warningText = `Warning: Planned path approaches high-risk zone (${hs.name}) within 350m! Bypasses recommended.`;
                    }
                }
            });
        });

        // Visual alerts depending on route analysis
        if (containsHighRisk) {
            routePolyline.setStyle({ color: 'var(--danger)' }); // red color line
            
            // alert toast
            const alertToast = document.getElementById('danger-alert-toast');
            const alertToastText = document.getElementById('alert-toast-text');
            if (alertToast) {
                alertToastText.textContent = warningText;
                alertToast.classList.remove('hide');
            }
        } else {
            // Safe green routing banner success
            const alertToast = document.getElementById('danger-alert-toast');
            if (alertToast) {
                alertToast.classList.add('hide');
            }
        }
    });

    // Local Haversine formula calculation for path intersection checks
    function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const r = 6371000; // in meters
        return r * c;
    }
});
