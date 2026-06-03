import { plantsData } from './db.js';

// State Management
let plantsState = [];
let careLogs = [];
let gardenTasks = [];
let currentTab = 'plants-section';
let activeMediaIndices = {}; // Track active image carousel index by plant id
let mappedPins = [];
let activeMapFilter = 'all';

const DEFAULT_PINS = [
  { id: 1, plantId: 12, x: 60.5, y: 48.2 }, // Olive Tree
  { id: 2, plantId: 1, x: 45.2, y: 32.8 },  // Slipper Plant
  { id: 3, plantId: 24, x: 35.8, y: 72.1 }  // Mexican Bush Sage
];

// Initial Seed Logs if none exist in localStorage
const DEFAULT_LOGS = [
  {
    id: 1,
    plantName: "Olive Tree",
    plantId: 12,
    type: "Treatment",
    status: "⚠️ SICK",
    notes: "Applied premium organic horticultural dormant oil spray to control scale infestation. Need to check back in one week for leaf drop improvement.",
    date: "May 30, 2026, 10:15 AM"
  },
  {
    id: 2,
    plantName: "Baja Fairy Duster",
    plantId: 3,
    type: "Watering",
    status: "Healthy",
    notes: "Logged light supplementary deep watering. Shrub is showing excellent summer bud development.",
    date: "May 28, 2026, 8:30 AM"
  }
];

// Helper to compress and resize images on the client side
function compressAndResizeImage(file, maxWidth = 800, maxHeight = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to JPEG with quality 0.7 for strong compression
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error("Failed to load image."));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(file);
    });
}

// Initialize Application
function init() {
    // 1. Load Plant States (with localStorage overrides for custom details and statuses)
    const customPlants = JSON.parse(localStorage.getItem('franklin_custom_plants')) || {};
    const savedStatuses = JSON.parse(localStorage.getItem('franklin_plant_statuses')) || {};
    plantsState = plantsData.map(plant => {
        let merged = { ...plant };
        if (customPlants[plant.id]) {
            merged = { ...merged, ...customPlants[plant.id] };
        }
        
        // Ensure the first image is always the generated cover image from db.js
        if (plant.images && plant.images.length > 0) {
            const generatedCover = plant.images[0];
            if (!merged.images) {
                merged.images = [generatedCover];
            } else if (merged.images[0] !== generatedCover) {
                // Remove it from other positions if present, then prepend it
                merged.images = merged.images.filter(img => img !== generatedCover);
                merged.images.unshift(generatedCover);
            }
        }
        
        merged.status = savedStatuses[plant.id] || merged.status;
        return merged;
    });

    // Load any newly created custom plants (where id is not in plantsData)
    const staticIds = new Set(plantsData.map(p => p.id));
    Object.keys(customPlants).forEach(idStr => {
        const id = parseInt(idStr);
        if (!staticIds.has(id)) {
            let customPlant = { ...customPlants[id] };
            customPlant.id = id;
            customPlant.status = savedStatuses[id] || customPlant.status || 'Healthy';
            plantsState.push(customPlant);
        }
    });

    // Publish a slim registry for the D.SAR Sandbox to consume
    publishPlantsRegistry();

    // 2. Load Care Logs
    careLogs = JSON.parse(localStorage.getItem('franklin_care_logs')) || DEFAULT_LOGS;

    // 2.5. Load Mapped Pins
    loadMappedPins();

    // 2.6. Load Garden Tasks Planner
    loadTasks();

    // 3. Initialize media carousel trackers
    plantsState.forEach(p => {
        activeMediaIndices[p.id] = 0;
    });

    // 4. Setup Event Listeners
    setupTabs();
    setupFilters();
    setupNotebook();
    setupMap();
    setupCareForm();
    setupTaskForm();
    setupModal();
    setupEditPlantForm();
    setupMapPinForm();
    setupCreateSpeciesForm();
    setupCardUploadListener();

    // 5. Initial Render
    renderDashboard();
    renderCatalog();
    populatePlantDropdown();
    populateTaskDropdown();
    renderTasks();
    renderCareLogs();
    populateMapFilters();
    renderPins();
    renderCurationGrid();
    renderAnalytics();
    renderFertilizerSchedule();
    renderFertilizerInsights();
}

// ── TAB SYSTEM ──
function setupTabs() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.tab-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            currentTab = targetTab;

            navButtons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            if (targetTab === 'analytics-section') {
                renderAnalytics();
            } else if (targetTab === 'care-section') {
                renderTasks();
                renderCareLogs();
            }
        });
    });
}

// ── DASHBOARD UPDATE ──
function renderDashboard() {
    const totalPlants = plantsState.length;
    const sickCount = plantsState.filter(p => p.status.includes('SICK')).length;

    document.getElementById('stat-total-plants').textContent = totalPlants;
    document.getElementById('stat-sick-plants').textContent = `${sickCount} Sick`;

    const sickAlertCard = document.getElementById('sick-alert-card');
    if (sickCount > 0) {
        sickAlertCard.classList.add('active');
    } else {
        sickAlertCard.classList.remove('active');
    }
}

// ── CATALOG RENDERING ──
function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    const query = document.getElementById('search-input').value.toLowerCase();
    const zoneFilter = document.getElementById('filter-zone').value;
    const sunFilter = document.getElementById('filter-sun').value;
    const statusFilter = document.getElementById('filter-status').value;

    grid.innerHTML = '';

    // Filter plants
    const filteredPlants = plantsState.filter(plant => {
        // Search text filter
        const matchesSearch = 
            plant.name.toLowerCase().includes(query) ||
            plant.description.toLowerCase().includes(query) ||
            plant.flowering.toLowerCase().includes(query) ||
            plant.pruning.toLowerCase().includes(query) ||
            plant.pest.toLowerCase().includes(query) ||
            plant.fact.toLowerCase().includes(query);

        // Zone filter
        const matchesZone = (zoneFilter === 'all') || (plant.group === zoneFilter);

        // Sunlight filter
        let matchesSun = true;
        if (sunFilter !== 'all') {
            const desc = plant.description.toLowerCase();
            if (sunFilter === 'sun') {
                matchesSun = desc.includes('sun') && !desc.includes('part');
            } else if (sunFilter === 'part') {
                matchesSun = desc.includes('part') || desc.includes('shade');
            }
        }

        // Health Status filter
        let matchesStatus = true;
        if (statusFilter === 'healthy') {
            matchesStatus = !plant.status.includes('SICK');
        } else if (statusFilter === 'sick') {
            matchesStatus = plant.status.includes('SICK');
        }

        return matchesSearch && matchesZone && matchesSun && matchesStatus;
    });

    if (filteredPlants.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🍃</span>
                <p>No matching plants found in the estate record.</p>
            </div>
        `;
        return;
    }

    filteredPlants.forEach(plant => {
        const card = document.createElement('div');
        card.className = 'plant-card';
        card.setAttribute('data-id', plant.id);

        const activeImgIdx = activeMediaIndices[plant.id] || 0;
        const currentImgPath = plant.images[activeImgIdx] || 'assets/references/IMG_8314.PNG';

        // Badges setup
        const isSick = plant.status.includes('SICK');
        const statusClass = isSick ? 'sick' : 'healthy';
        const statusText = isSick ? 'Attention' : 'Healthy';
        const groupLabel = `Zone ${plant.group}`;
        const groupClass = `zone-${plant.group.toLowerCase()}`;

        // Carousel buttons visibility
        const showCarousel = plant.images.length > 1;

        card.innerHTML = `
            <div class="card-media">
                <img src="${currentImgPath}" alt="${plant.name}" loading="lazy">
                <div class="media-gradient"></div>
                
                <div class="card-badges">
                    <span class="badge-group ${groupClass}">${groupLabel}</span>
                    <span class="badge-status ${statusClass}">${statusText}</span>
                </div>
                
                <button class="card-edit-btn" title="Edit Plant Details" aria-label="Edit Plant">✏️</button>
                <button class="card-upload-btn" title="Upload Plant Image" aria-label="Upload Image">📷</button>
                ${plant.images.length > 0 ? `
                    <button class="card-delete-btn" title="Delete Current Image" aria-label="Delete Image">🗑️</button>
                ` : ''}

                ${showCarousel ? `
                    <button class="carousel-btn prev" aria-label="Previous image">‹</button>
                    <button class="carousel-btn next" aria-label="Next image">›</button>
                    <div class="carousel-dots">
                        ${plant.images.map((_, idx) => `
                            <span class="carousel-dot ${idx === activeImgIdx ? 'active' : ''}" data-idx="${idx}"></span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="card-content">
                <div class="card-title-row">
                    <h2>${plant.name}</h2>
                    <span class="card-sunlight-icon" title="Sunlight Requirement">${plant.description.includes('Sun') ? '☀️' : '⛅'}</span>
                </div>
                
                <p class="card-desc">${plant.description}</p>
                
                <div class="card-details-panel">
                    <div class="detail-field">
                        <span class="field-lbl">Flowering:</span>
                        <span class="field-val">${plant.flowering}</span>
                    </div>
                    <div class="detail-field">
                        <span class="field-lbl">Watering:</span>
                        <span class="field-val">${plant.water}</span>
                    </div>
                    <div class="detail-field">
                        <span class="field-lbl">Pruning:</span>
                        <span class="field-val">${plant.pruning}</span>
                    </div>
                    <div class="detail-field">
                        <span class="field-lbl">Pest Alert:</span>
                        <span class="field-val">${plant.pest}</span>
                    </div>
                </div>

                <p class="card-fact">💡 ${plant.fact}</p>
                
                <div class="card-actions">
                    ${isSick ? `
                        <button class="primary-btn btn-alert btn-log-quick-cure">💊 Treat & Cure</button>
                        <button class="secondary-btn btn-log-quick-water" title="Quick Water Plant">💦 Water</button>
                        <button class="secondary-btn btn-log-quick-fertilize" title="Quick Fertilize Plant">🧪 Fertilize</button>
                    ` : `
                        <button class="primary-btn btn-log-quick-water">💦 Water Plant</button>
                        <button class="secondary-btn btn-log-journal" title="Open Pruning / Care form">📋 Journal</button>
                        <button class="secondary-btn btn-log-quick-fertilize" title="Quick Fertilize Plant">🧪 Fertilize</button>
                    `}
                </div>
            </div>
        `;

        // Carousel Event Handlers (Optimized to avoid full catalog re-renders)
        if (showCarousel) {
            const nextBtn = card.querySelector('.carousel-btn.next');
            const prevBtn = card.querySelector('.carousel-btn.prev');
            const dots = card.querySelectorAll('.carousel-dot');

            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newIdx = (activeMediaIndices[plant.id] + 1) % plant.images.length;
                activeMediaIndices[plant.id] = newIdx;

                const img = card.querySelector('.card-media img');
                img.src = plant.images[newIdx];

                const dotsList = card.querySelectorAll('.carousel-dot');
                dotsList.forEach((dot, idx) => {
                    if (idx === newIdx) {
                        dot.classList.add('active');
                    } else {
                        dot.classList.remove('active');
                    }
                });
            });

            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newIdx = (activeMediaIndices[plant.id] - 1 + plant.images.length) % plant.images.length;
                activeMediaIndices[plant.id] = newIdx;

                const img = card.querySelector('.card-media img');
                img.src = plant.images[newIdx];

                const dotsList = card.querySelectorAll('.carousel-dot');
                dotsList.forEach((dot, idx) => {
                    if (idx === newIdx) {
                        dot.classList.add('active');
                    } else {
                        dot.classList.remove('active');
                    }
                });
            });

            dots.forEach(dot => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newIdx = parseInt(dot.getAttribute('data-idx'));
                    activeMediaIndices[plant.id] = newIdx;

                    const img = card.querySelector('.card-media img');
                    img.src = plant.images[newIdx];

                    const dotsList = card.querySelectorAll('.carousel-dot');
                    dotsList.forEach((d, idx) => {
                        if (idx === newIdx) {
                            d.classList.add('active');
                        } else {
                            d.classList.remove('active');
                        }
                    });
                });
            });
        }

        // Quick Action Event Handlers
        if (isSick) {
            card.querySelector('.btn-log-quick-cure').addEventListener('click', () => {
                logQuickCure(plant);
            });
            card.querySelector('.btn-log-quick-water').addEventListener('click', () => {
                logQuickWater(plant);
            });
            card.querySelector('.btn-log-quick-fertilize').addEventListener('click', () => {
                logQuickFertilize(plant.id);
            });
        } else {
            card.querySelector('.btn-log-quick-water').addEventListener('click', () => {
                logQuickWater(plant);
            });
            card.querySelector('.btn-log-journal').addEventListener('click', () => {
                openJournalTab(plant.id);
            });
            card.querySelector('.btn-log-quick-fertilize').addEventListener('click', () => {
                logQuickFertilize(plant.id);
            });
        }
        
        // Edit Plant Event Handler
        card.querySelector('.card-edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditPlantModal(plant.id);
        });

        // Upload Plant Image Event Handler
        card.querySelector('.card-upload-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const uploadInput = document.getElementById('card-image-upload-input');
            if (uploadInput) {
                uploadInput.setAttribute('data-target-plant-id', plant.id);
                uploadInput.click();
            }
        });

        // Delete Plant Image Event Handler
        const deleteBtn = card.querySelector('.card-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const activeImgIdx = activeMediaIndices[plant.id] || 0;
                if (plant.images && plant.images.length > 0) {
                    if (confirm(`Are you sure you want to delete the current image from ${plant.name}?`)) {
                        plant.images.splice(activeImgIdx, 1);
                        savePlantToLocalStorage(plant);
                        activeMediaIndices[plant.id] = Math.max(0, activeImgIdx - 1);
                        
                        renderCatalog();
                        renderCurationGrid();
                        renderPins();
                        populatePlantDropdown();
                        showToast(`🗑️ Image removed from ${plant.name}.`);
                    }
                }
            });
        }

        grid.appendChild(card);
    });
}

// ── FILTERS CONTROLLER ──
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const zoneFilter = document.getElementById('filter-zone');
    const sunFilter = document.getElementById('filter-sun');
    const statusFilter = document.getElementById('filter-status');

    searchInput.addEventListener('input', renderCatalog);
    zoneFilter.addEventListener('change', renderCatalog);
    sunFilter.addEventListener('change', renderCatalog);
    statusFilter.addEventListener('change', renderCatalog);
}

// ── PORTABLE CARE ACTION DIALOGS ──
function logQuickWater(plant) {
    const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const newLog = {
        id: Date.now(),
        plantName: plant.name,
        plantId: plant.id,
        type: "Watering",
        status: plant.status, // Keep existing status
        notes: "Logged direct irrigation and foliage spray. Soil moisture levels checked and stabilized.",
        date: timestamp
    };

    careLogs.unshift(newLog);
    localStorage.setItem('franklin_care_logs', JSON.stringify(careLogs));
    
    renderCareLogs();
    
    // Smooth toast notification feedback
    showToast(`💦 Registered watering session for ${plant.name}!`);
}

function logQuickCure(plant) {
    const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const newLog = {
        id: Date.now(),
        plantName: plant.name,
        plantId: plant.id,
        type: "Treatment",
        status: "Healthy", // Instantly cure the status to Healthy
        notes: "Logged diagnostic check and applied curative treatment (pruning affected leaves, soil aeration, and application of neem oil). Plant is fully cured and restored to Healthy state.",
        date: timestamp
    };

    careLogs.unshift(newLog);
    localStorage.setItem('franklin_care_logs', JSON.stringify(careLogs));
    
    // Update plant status in our local state and localStorage
    plant.status = "Healthy";
    const savedStatuses = JSON.parse(localStorage.getItem('franklin_plant_statuses')) || {};
    savedStatuses[plant.id] = "Healthy";
    localStorage.setItem('franklin_plant_statuses', JSON.stringify(savedStatuses));
    
    // Refresh stats counter dashboard and directory listing
    renderDashboard();
    renderCatalog();
    renderCareLogs();
    
    // Smooth toast notification feedback
    showToast(`💊 Curative treatment recorded. ${plant.name} is now Healthy!`);
}

function openJournalTab(plantId) {
    // Switch to care section tab
    document.getElementById('tab-care').click();
    
    // Select the plant in the dropdown
    const select = document.getElementById('care-plant-select');
    select.value = plantId;
}

// ── NESTED WILDLIFE NOTEBOOK ──
function setupNotebook() {
    const tabs = document.querySelectorAll('.notebook-tab-btn');
    const viewerImg = document.getElementById('viewer-img');
    const viewerTitle = document.getElementById('viewer-title');
    const viewerDesc = document.getElementById('viewer-desc');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const imgSrc = tab.getAttribute('data-ref-img');
            const title = tab.getAttribute('data-ref-title');
            const desc = tab.getAttribute('data-ref-desc');

            viewerImg.src = imgSrc;
            viewerTitle.textContent = title;
            viewerDesc.textContent = desc;
        });
    });

    // Setup full-screen zooming
    const zoomBtn = document.getElementById('btn-fullscreen-img');
    zoomBtn.addEventListener('click', () => {
        const currentImg = viewerImg.src;
        const currentTitle = viewerTitle.textContent;
        const currentDesc = viewerDesc.textContent;

        openImageModal(currentImg, `${currentTitle} — ${currentDesc}`);
    });
}

// ── ESTATE MAP VIEWER ──
function setupMap() {
    const zoomMapBtn = document.getElementById('btn-fullscreen-map');
    if (zoomMapBtn) {
        zoomMapBtn.addEventListener('click', () => {
            const img = document.getElementById('map-blueprint-img');
            const caption = "Garden Plot & House Map: 'Karuna House' (Master Blueprint) — 36239 S Cypress Dr, Tucson, AZ 85739";
            openImageModal(img.src, caption);
        });
    }

    const img = document.getElementById('map-blueprint-img');
    const overlay = document.getElementById('pins-overlay');
    
    if (img && overlay) {
        // Run overlay positioning when image loads or on resize
        if (img.complete) {
            resizePinsOverlay();
        } else {
            img.addEventListener('load', resizePinsOverlay);
        }
        window.addEventListener('resize', resizePinsOverlay);
        
        // Listen to tab activation to recalculate sizes (tabs hide/show elements, triggering layout shifts)
        const tabBtn = document.getElementById('tab-map');
        if (tabBtn) {
            tabBtn.addEventListener('click', () => {
                setTimeout(resizePinsOverlay, 150); // delay to allow tab slide animations/display shifts to complete
            });
        }

        // Click to map a plant
        overlay.addEventListener('click', (e) => {
            if (e.target !== overlay) return;
            
            const rect = overlay.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            showMapPinModal(x, y);
        });
    }
}

// ── MAP PINNING OPERATIONS ──
function loadMappedPins() {
    mappedPins = JSON.parse(localStorage.getItem('franklin_mapped_plants'));
    if (!mappedPins || mappedPins.length === 0) {
        mappedPins = DEFAULT_PINS;
        localStorage.setItem('franklin_mapped_plants', JSON.stringify(mappedPins));
    }
}

function resizePinsOverlay() {
    const img = document.getElementById('map-blueprint-img');
    const overlay = document.getElementById('pins-overlay');
    if (img && overlay) {
        overlay.style.width = `${img.offsetWidth}px`;
        overlay.style.height = `${img.offsetHeight}px`;
        overlay.style.left = `${img.offsetLeft}px`;
        overlay.style.top = `${img.offsetTop}px`;
    }
}

function renderPins() {
    const overlay = document.getElementById('pins-overlay');
    if (!overlay) return;
    
    // Clear existing pins
    overlay.innerHTML = '';
    
    // Resize overlay to fit image
    resizePinsOverlay();
    
    // Filter pins
    const filteredPins = mappedPins.filter(pin => {
        if (activeMapFilter === 'all') return true;
        return pin.plantId === parseInt(activeMapFilter);
    });
    
    filteredPins.forEach(pin => {
        const plant = plantsState.find(p => p.id === pin.plantId);
        if (!plant) return;
        
        const pinEl = document.createElement('div');
        pinEl.className = `map-pin zone-${plant.group.toLowerCase()}`;
        pinEl.style.left = `${pin.x}%`;
        pinEl.style.top = `${pin.y}%`;
        pinEl.setAttribute('data-pin-id', pin.id);
        
        // Seeded rotation based on pin id — gives each sticker a hand-placed feel
        const rotations = [-8, -5, -3, 0, 3, 5, 8, -6, 4, -2, 7, -4, 6, -7, 2];
        const rotation = rotations[pin.id % rotations.length];
        pinEl.style.setProperty('--sticker-rotation', `${rotation}deg`);

        // Calculate Grid cell code (A1-J11)
        const gridCode = getGridCell(pin.x, pin.y);
        
        // Short label (first word or first 10 chars)
        const shortName = plant.name.split(' ').slice(0, 2).join(' ');
        
        // Setup tooltip HTML
        const isSick = plant.status.includes('SICK');
        const statusClass = isSick ? 'status-sick' : 'status-healthy';
        const statusText = isSick ? '⚠️ Attention' : '✓ Healthy';
        const firstImg = plant.images[0] || 'assets/references/IMG_8314.PNG';
        
        pinEl.innerHTML = `
            <div class="pin-sticker zone-${plant.group.toLowerCase()}">
                <div class="pin-sticker-ring"></div>
                <img src="assets/generated/avatar_${plant.id}.png"
                     class="pin-sticker-img"
                     alt="${plant.name}"
                     onerror="this.src='assets/references/IMG_8314.PNG'">
                <span class="pin-sticker-label">${shortName}</span>
            </div>
            <div class="pin-tooltip">
                <img src="${firstImg}" alt="${plant.name}" class="tooltip-thumb" onerror="this.src='assets/references/IMG_8314.PNG'">
                <h4 class="tooltip-title">${plant.name}</h4>
                <div class="tooltip-badges">
                    <span class="tooltip-badge zone-${plant.group.toLowerCase()}">Zone ${plant.group}</span>
                    <span class="tooltip-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="tooltip-coords">
                    <span>Grid Cell: ${gridCode}</span>
                    <span>📍 ${pin.x.toFixed(1)}%, ${pin.y.toFixed(1)}%</span>
                </div>
                <div class="tooltip-actions">
                    <button class="btn-tooltip-view" data-plant-id="${plant.id}">Catalog</button>
                    <button class="btn-tooltip-delete" data-pin-id="${pin.id}">Delete Pin</button>
                </div>
            </div>
        `;
        
        // Prevent clicking inside tooltip from mapping a new plant
        pinEl.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Add event listeners inside tooltip
        pinEl.querySelector('.btn-tooltip-view').addEventListener('click', (e) => {
            e.stopPropagation();
            jumpToCatalogPlant(plant.id);
        });
        
        pinEl.querySelector('.btn-tooltip-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deletePin(pin.id);
        });
        
        overlay.appendChild(pinEl);
    });
    
    // Also render the sidebar list of mapped plants
    renderMappedPlantsList();
}

function getGridCell(x, y) {
    // Columns A-J (10 columns)
    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const colIndex = Math.min(Math.floor(x / 10), 9);
    
    // Rows 1-11 (11 rows)
    const rowIndex = Math.min(Math.floor(y / (100 / 11)) + 1, 11);
    
    return `${cols[colIndex]}${rowIndex}`;
}

function deletePin(pinId) {
    if (confirm("Are you sure you want to remove this plant pin location from the map?")) {
        mappedPins = mappedPins.filter(pin => pin.id !== pinId);
        localStorage.setItem('franklin_mapped_plants', JSON.stringify(mappedPins));
        renderPins();
        showToast("📍 Pin removed from estate map.");
    }
}

function jumpToCatalogPlant(plantId) {
    // 1. Switch to plants tab
    const tabBtn = document.getElementById('tab-plants');
    if (tabBtn) tabBtn.click();
    
    // 2. Clear filters so the plant is visible
    document.getElementById('search-input').value = '';
    document.getElementById('filter-zone').value = 'all';
    document.getElementById('filter-sun').value = 'all';
    document.getElementById('filter-status').value = 'all';
    
    // Re-render catalog to apply cleared filters
    renderCatalog();
    
    // 3. Scroll to the plant card
    const card = document.querySelector(`.plant-card[data-id="${plantId}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a temporary highlight glow to the card
        card.style.outline = '3px solid var(--color-green)';
        card.style.boxShadow = '0 0 25px rgba(142, 212, 175, 0.4)';
        setTimeout(() => {
            card.style.outline = 'none';
            card.style.boxShadow = '';
        }, 2500);
    }
}

function populateMapFilters() {
    const filterSelect = document.getElementById('map-filter-plant');
    if (!filterSelect) return;
    
    // Keep the "Show All Species" option
    filterSelect.innerHTML = '<option value="all">📍 Show All Species</option>';
    
    // Sort alphabetically by plant name
    const sortedPlants = [...plantsState].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedPlants.forEach(plant => {
        const option = document.createElement('option');
        option.value = plant.id;
        option.textContent = plant.name;
        filterSelect.appendChild(option);
    });
    
    filterSelect.addEventListener('change', (e) => {
        activeMapFilter = e.target.value;
        renderPins();
    });
}

function renderMappedPlantsList() {
    const listContainer = document.getElementById('mapped-plants-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    // Compute pin counts per plantId
    const pinCounts = {};
    mappedPins.forEach(pin => {
        pinCounts[pin.plantId] = (pinCounts[pin.plantId] || 0) + 1;
    });
    
    // Find all plants that have at least one pin
    const plantsWithPins = plantsState.filter(p => pinCounts[p.id] > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
        
    if (plantsWithPins.length === 0) {
        listContainer.innerHTML = `
            <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 10px 0;">
                No plants mapped yet. Click on the map to add one.
            </div>
        `;
        return;
    }
    
    plantsWithPins.forEach(plant => {
        const count = pinCounts[plant.id];
        
        const item = document.createElement('div');
        item.className = `mapped-plant-item ${activeMapFilter == plant.id ? 'active' : ''}`;
        item.innerHTML = `
            <span>${plant.name}</span>
            <span class="mapped-plant-count">${count}</span>
        `;
        
        // Highlight pins on hover
        item.addEventListener('mouseenter', () => {
            const pins = document.querySelectorAll(`.map-pin[data-pin-id]`);
            pins.forEach(pinEl => {
                const pinId = parseInt(pinEl.getAttribute('data-pin-id'));
                const pinData = mappedPins.find(p => p.id === pinId);
                if (pinData && pinData.plantId === plant.id) {
                    pinEl.classList.add('active');
                }
            });
        });
        
        item.addEventListener('mouseleave', () => {
            const pins = document.querySelectorAll(`.map-pin[data-pin-id]`);
            pins.forEach(pinEl => {
                pinEl.classList.remove('active');
            });
        });
        
        // Filter map on click
        item.addEventListener('click', () => {
            if (activeMapFilter == plant.id) {
                activeMapFilter = 'all';
                document.getElementById('map-filter-plant').value = 'all';
            } else {
                activeMapFilter = plant.id;
                document.getElementById('map-filter-plant').value = plant.id;
            }
            renderPins();
        });
        
        listContainer.appendChild(item);
    });
}

function showMapPinModal(x, y) {
    const modal = document.getElementById('map-pin-dialog');
    const select = document.getElementById('map-pin-plant-select');
    
    // Set hidden inputs
    document.getElementById('map-pin-x').value = x;
    document.getElementById('map-pin-y').value = y;
    
    // Populate dropdown
    select.innerHTML = '<option value="" disabled selected>Choose a plant...</option>';
    const sorted = [...plantsState].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (Zone ${p.group})`;
        select.appendChild(opt);
    });
    
    modal.showModal();
}

function setupMapPinForm() {
    const modal = document.getElementById('map-pin-dialog');
    const form = document.getElementById('map-pin-form');
    const cancelBtn = document.getElementById('btn-cancel-map-pin');
    const closeX = document.getElementById('map-pin-close-x');
    
    if (!modal || !form) return;
    
    const closeModal = () => {
        form.reset();
        modal.close();
    };
    
    cancelBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const plantId = parseInt(document.getElementById('map-pin-plant-select').value);
        const x = parseFloat(document.getElementById('map-pin-x').value);
        const y = parseFloat(document.getElementById('map-pin-y').value);
        
        const plant = plantsState.find(p => p.id === plantId);
        if (!plant) return;
        
        const newPin = {
            id: Date.now(),
            plantId: plantId,
            x: x,
            y: y
        };
        
        mappedPins.push(newPin);
        localStorage.setItem('franklin_mapped_plants', JSON.stringify(mappedPins));
        
        closeModal();
        renderPins();
        showToast(`📍 Mapped ${plant.name} to the estate blueprint!`);
    });
    
    // Closedby backdrop click fallback
    if (!('closedBy' in HTMLDialogElement.prototype)) {
        modal.addEventListener('click', (event) => {
            if (event.target !== modal) return;
            const rect = modal.getBoundingClientRect();
            if (
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width
            ) return;
            closeModal();
        });
    }
}

// ── PLANT DETAILS EDITOR OPERATIONS ──
let currentEditPlantImages = [];

function openEditPlantModal(plantId) {
    const plant = plantsState.find(p => p.id === plantId);
    if (!plant) return;
    
    // Set form fields
    document.getElementById('edit-plant-id').value = plant.id;
    document.getElementById('edit-plant-name').value = plant.name;
    document.getElementById('edit-plant-group').value = plant.group;
    document.getElementById('edit-plant-desc').value = plant.description;
    document.getElementById('edit-plant-flowering').value = plant.flowering || '';
    document.getElementById('edit-plant-water').value = plant.water || '';
    document.getElementById('edit-plant-pruning').value = plant.pruning || '';
    document.getElementById('edit-plant-pest').value = plant.pest || '';
    document.getElementById('edit-plant-fact').value = plant.fact || '';
    
    // Load images list
    currentEditPlantImages = [...plant.images];
    renderEditImageList();
    
    // Open modal
    document.getElementById('edit-plant-dialog').showModal();
}

function renderEditImageList() {
    const container = document.getElementById('edit-image-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (currentEditPlantImages.length === 0) {
        container.innerHTML = `
            <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 10px 0;">
                No images added yet. Add one below.
            </div>
        `;
        return;
    }
    
    currentEditPlantImages.forEach((imgSrc, idx) => {
        const row = document.createElement('div');
        row.className = 'edit-image-row';
        const isBase64 = imgSrc.startsWith('data:image/');
        const displayValue = isBase64 ? '[Uploaded File]' : imgSrc;
        const inputReadonly = isBase64 ? 'readonly' : '';
        row.innerHTML = `
            <img src="${imgSrc}" class="edit-image-thumb" onerror="this.src='assets/references/IMG_8314.PNG'">
            <input type="text" value="${displayValue}" placeholder="e.g. assets/my-image.jpg" class="image-path-input" ${inputReadonly}>
            <button type="button" class="btn-remove-image" title="Remove image">🗑️</button>
        `;
        
        // Handle path editing in real-time
        const input = row.querySelector('input');
        if (!isBase64) {
            input.addEventListener('input', (e) => {
                currentEditPlantImages[idx] = e.target.value;
                // Update thumbnail preview
                row.querySelector('.edit-image-thumb').src = e.target.value;
            });
        }
        
        // Handle deletion
        row.querySelector('.btn-remove-image').addEventListener('click', () => {
            currentEditPlantImages.splice(idx, 1);
            renderEditImageList();
        });
        
        container.appendChild(row);
    });
}

function setupEditPlantForm() {
    const modal = document.getElementById('edit-plant-dialog');
    const form = document.getElementById('edit-plant-form');
    const cancelBtn = document.getElementById('btn-cancel-edit');
    const closeX = document.getElementById('edit-plant-close-x');
    const addImgBtn = document.getElementById('btn-add-edit-image');
    const uploadImgBtn = document.getElementById('btn-upload-edit-image');
    const editFileInput = document.getElementById('edit-plant-file-input');
    
    if (!modal || !form) return;
    
    const closeModal = () => {
        form.reset();
        modal.close();
    };
    
    cancelBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    
    addImgBtn.addEventListener('click', () => {
        currentEditPlantImages.push('');
        renderEditImageList();
        // Focus the newly added input
        setTimeout(() => {
            const inputs = document.querySelectorAll('.edit-image-row input');
            if (inputs.length > 0) {
                inputs[inputs.length - 1].focus();
            }
        }, 50);
    });

    if (uploadImgBtn && editFileInput) {
        uploadImgBtn.addEventListener('click', () => {
            editFileInput.click();
        });
        
        editFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const dataUrl = await compressAndResizeImage(file);
                currentEditPlantImages.push(dataUrl);
                renderEditImageList();
                showToast("📁 Image file loaded into editor!");
            } catch (err) {
                console.error("Image processing failed:", err);
                showToast("❌ Failed to process image file.");
            } finally {
                editFileInput.value = '';
            }
        });
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const plantId = parseInt(document.getElementById('edit-plant-id').value);
        const name = document.getElementById('edit-plant-name').value.trim();
        const group = document.getElementById('edit-plant-group').value;
        const description = document.getElementById('edit-plant-desc').value.trim();
        const flowering = document.getElementById('edit-plant-flowering').value.trim();
        const water = document.getElementById('edit-plant-water').value.trim();
        const pruning = document.getElementById('edit-plant-pruning').value.trim();
        const pest = document.getElementById('edit-plant-pest').value.trim();
        const fact = document.getElementById('edit-plant-fact').value.trim();
        
        // Read input images and filter empty strings
        const filteredImages = currentEditPlantImages.map(img => img.trim()).filter(img => img !== '');
        
        // Find existing plant in state
        const plant = plantsState.find(p => p.id === plantId);
        if (!plant) return;
        
        // Update values
        plant.name = name;
        plant.group = group;
        plant.description = description;
        plant.flowering = flowering;
        plant.water = water;
        plant.pruning = pruning;
        plant.pest = pest;
        plant.fact = fact;
        plant.images = filteredImages;
        
        // Reset active carousel index for this plant to 0 if bounds changed
        activeMediaIndices[plantId] = 0;
        
        // Save to localStorage under franklin_custom_plants
        const customPlants = JSON.parse(localStorage.getItem('franklin_custom_plants')) || {};
        customPlants[plantId] = {
            name,
            group,
            description,
            flowering,
            water,
            pruning,
            pest,
            fact,
            images: filteredImages
        };
        localStorage.setItem('franklin_custom_plants', JSON.stringify(customPlants));
        
        closeModal();
        
        // Refresh catalog, dashboard, and map listings
        renderDashboard();
        renderCatalog();
        populatePlantDropdown();
        populateMapFilters();
        renderPins();
        publishPlantsRegistry();  // keep D.SAR sandbox in sync
        
        showToast(`✏️ Updated plant record for ${name}!`);
    });
    
    // Closedby backdrop click fallback
    if (!('closedBy' in HTMLDialogElement.prototype)) {
        modal.addEventListener('click', (event) => {
            if (event.target !== modal) return;
            const rect = modal.getBoundingClientRect();
            if (
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width
            ) return;
            closeModal();
        });
    }
}

// ── HEALTH MODALS & FULL VIEWERS (NATIVE DIALOGS) ──
function setupModal() {
    const modal = document.getElementById('image-modal');
    const closeX = document.getElementById('image-modal-close-x');

    const closeModal = () => {
        modal.close();
    };

    closeX.addEventListener('click', closeModal);

    // Fallback for browsers without closedby support (Safari / Older browsers)
    if (!('closedBy' in HTMLDialogElement.prototype)) {
        modal.addEventListener('click', (event) => {
            // When clicking the backdrop, the event target is the dialog element itself.
            if (event.target !== modal) return;

            // Check if coordinates fall within the dialog content box boundaries
            const rect = modal.getBoundingClientRect();
            const isDialogContent = (
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width
            );

            if (isDialogContent) return;

            // Click was outside content area -> manual close
            modal.close();
        });
    }
}

function openImageModal(imgSrc, caption) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');

    modalImg.src = imgSrc;
    modalCaption.textContent = caption;

    modal.showModal();
}

// ── ACTIVITY JOURNAL FORM CONTROLLER ──
function populatePlantDropdown() {
    const select = document.getElementById('care-plant-select');
    // Clear previous dynamic options
    select.innerHTML = '<option value="" disabled selected>Choose a plant...</option>';

    // Sort plants alphabetically
    const sorted = [...plantsState].sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (Zone ${p.group})`;
        select.appendChild(opt);
    });
}

function setupCareForm() {
    const form = document.getElementById('care-form');
    const clearBtn = document.getElementById('btn-clear-logs');
    const typeSelect = document.getElementById('care-type');
    const fertilizerPanel = document.getElementById('fertilizer-detail-panel');
    const formulaSelect = document.getElementById('fert-formula');
    const npkInput = document.getElementById('fert-npk');
    const nextDateInput = document.getElementById('fert-next-date');

    // Toggle fertilizer panel on type change
    typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'Fertilization') {
            fertilizerPanel.classList.add('fert-panel-open');
            fertilizerPanel.setAttribute('aria-hidden', 'false');
        } else {
            fertilizerPanel.classList.remove('fert-panel-open');
            fertilizerPanel.setAttribute('aria-hidden', 'true');
        }
    });

    // Auto-fill NPK and suggest next date on formula change
    formulaSelect.addEventListener('change', () => {
        const selectedOpt = formulaSelect.options[formulaSelect.selectedIndex];
        const npk = selectedOpt.dataset.npk || '';
        npkInput.value = npk;

        const formulaVal = formulaSelect.value;
        if (!formulaVal || formulaVal === 'custom') {
            return;
        }

        let daysToAdd = 30; // default Balanced, Nitrogen-Heavy, Phosphorus-Heavy, Potassium-Heavy
        if (formulaVal === 'slow-release') {
            daysToAdd = 90;
        } else if (formulaVal === 'liquid' || formulaVal === 'bloom') {
            daysToAdd = 14;
        } else if (formulaVal === 'organic') {
            daysToAdd = 60;
        } else if (formulaVal === 'cactus') {
            daysToAdd = 45;
        }

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        
        const yyyy = nextDate.getFullYear();
        const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
        const dd = String(nextDate.getDate()).padStart(2, '0');
        nextDateInput.value = `${yyyy}-${mm}-${dd}`;
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const plantId = parseInt(document.getElementById('care-plant-select').value);
        const careType = typeSelect.options[typeSelect.selectedIndex].text.replace(/^[^\s]+\s/, ''); // Remove emoji prefix
        const notes = document.getElementById('care-notes').value;
        const status = document.getElementById('care-status-update').value;

        const targetPlant = plantsState.find(p => p.id === plantId);
        if (!targetPlant) return;

        const timestamp = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        // 1. Create Log Entry
        const newLog = {
            id: Date.now(),
            plantName: targetPlant.name,
            plantId: targetPlant.id,
            type: careType,
            status: status,
            notes: notes,
            date: timestamp
        };

        if (typeSelect.value === 'Fertilization') {
            newLog.fertProduct = document.getElementById('fert-product').value || 'Generic Fertilizer';
            newLog.fertFormula = formulaSelect.options[formulaSelect.selectedIndex].text;
            newLog.fertNPK = npkInput.value || 'N/A';
            newLog.fertAmount = document.getElementById('fert-amount').value || 'As directed';
            const methodSelect = document.getElementById('fert-method');
            newLog.fertMethod = methodSelect.options[methodSelect.selectedIndex].text;
            newLog.fertNextDate = nextDateInput.value || '';

            // Update Fertilizer Schedule
            if (newLog.fertNextDate) {
                let fertSchedule = JSON.parse(localStorage.getItem('franklin_fertilizer_schedule')) || [];
                // remove existing for this plant
                fertSchedule = fertSchedule.filter(item => item.plantId !== targetPlant.id);
                fertSchedule.push({
                    plantId: targetPlant.id,
                    plantName: targetPlant.name,
                    nextDate: newLog.fertNextDate,
                    formula: newLog.fertFormula,
                    npk: newLog.fertNPK
                });
                localStorage.setItem('franklin_fertilizer_schedule', JSON.stringify(fertSchedule));
            }
        }

        careLogs.unshift(newLog);
        localStorage.setItem('franklin_care_logs', JSON.stringify(careLogs));

        // 2. Update Plant health state globally
        targetPlant.status = status;
        const savedStatuses = JSON.parse(localStorage.getItem('franklin_plant_statuses')) || {};
        savedStatuses[targetPlant.id] = status;
        localStorage.setItem('franklin_plant_statuses', JSON.stringify(savedStatuses));

        // 3. Reset form and refresh layout
        form.reset();
        resetFertilizerFields();
        renderDashboard();
        renderCatalog();
        renderCareLogs();
        renderFertilizerSchedule();
        renderFertilizerInsights();

        showToast(`📋 Care log saved successfully for ${targetPlant.name}!`);
    });

    clearBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to permanently clear the garden care logs history?")) {
            careLogs = [];
            localStorage.setItem('franklin_care_logs', JSON.stringify(careLogs));
            renderCareLogs();
            renderFertilizerInsights();
            showToast("🧹 Activity history cleared.");
        }
    });
}

function resetFertilizerFields() {
    document.getElementById('fert-product').value = '';
    document.getElementById('fert-formula').value = '';
    document.getElementById('fert-npk').value = '';
    document.getElementById('fert-amount').value = '';
    document.getElementById('fert-method').value = 'Soil Drench';
    document.getElementById('fert-next-date').value = '';
    const panel = document.getElementById('fertilizer-detail-panel');
    if (panel) {
        panel.classList.remove('fert-panel-open');
        panel.setAttribute('aria-hidden', 'true');
    }
}

function renderCareLogs() {
    const container = document.getElementById('care-feed');
    container.innerHTML = '';

    if (careLogs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📝</span>
                <p>No activity recorded in the garden care logs yet.</p>
            </div>
        `;
        return;
    }

    careLogs.forEach(log => {
        const isSick = log.status.includes('SICK');
        const statusClass = isSick ? 'sick' : 'healthy';

        const entry = document.createElement('div');
        
        const isFert = log.type === 'Fertilizer & Feed' || log.type === 'Fertilization';
        if (isFert) {
            entry.className = 'feed-entry fert-type';
            
            // Format NPK Ratio into N-P-K pills if possible
            let npkHTML = '';
            if (log.fertNPK) {
                const parts = log.fertNPK.split('-');
                if (parts.length === 3) {
                    npkHTML = `
                        <div class="npk-pill-container">
                            <span class="npk-pill" title="Nitrogen">N ${parts[0]}</span>
                            <span class="npk-pill" title="Phosphorus">P ${parts[1]}</span>
                            <span class="npk-pill" title="Potassium">K ${parts[2]}</span>
                        </div>
                    `;
                } else {
                    npkHTML = `
                        <div class="npk-pill-container">
                            <span class="npk-pill">${log.fertNPK}</span>
                        </div>
                    `;
                }
            }

            // Calculate countdown for next-due if present
            let countdownHTML = '';
            if (log.fertNextDate) {
                const nextDate = new Date(log.fertNextDate);
                const today = new Date(new Date().toISOString().split('T')[0]);
                const diffTime = nextDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    countdownHTML = `<span class="fert-due-badge overdue">Overdue ${Math.abs(diffDays)}d</span>`;
                } else if (diffDays === 0) {
                    countdownHTML = `<span class="fert-due-badge" style="background: rgba(229,190,49,0.1); color: var(--color-gold); border-color: rgba(229,190,49,0.2);">Due Today</span>`;
                } else {
                    countdownHTML = `<span class="fert-due-badge">Due in ${diffDays}d</span>`;
                }
            }

            const fertProductVal = log.fertProduct || 'Generic Fertilizer';
            const fertFormulaVal = log.fertFormula || 'Custom Ratio';
            const fertAmountVal = log.fertAmount || 'As directed';
            const fertMethodVal = log.fertMethod || 'Soil Drench';

            entry.innerHTML = `
                <div class="feed-entry-header">
                    <span class="entry-plant">${log.plantName}</span>
                    <span class="entry-date">${log.date}</span>
                </div>
                <div class="feed-entry-meta" style="align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <span class="entry-type">${log.type}</span>
                        <span class="entry-status ${statusClass}">${log.status}</span>
                    </div>
                    ${countdownHTML}
                </div>
                <div class="feed-entry-meta-details">
                    🧪 <strong>${fertProductVal}</strong> (${fertFormulaVal}) · Applied <strong>${fertAmountVal}</strong> via <strong>${fertMethodVal}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <p class="entry-notes" style="margin: 0; flex-grow: 1;">${log.notes}</p>
                    ${npkHTML}
                </div>
            `;
        } else {
            entry.className = 'feed-entry';
            entry.innerHTML = `
                <div class="feed-entry-header">
                    <span class="entry-plant">${log.plantName}</span>
                    <span class="entry-date">${log.date}</span>
                </div>
                <div class="feed-entry-meta">
                    <span class="entry-type">${log.type}</span>
                    <span class="entry-status ${statusClass}">${log.status}</span>
                </div>
                <p class="entry-notes">${log.notes}</p>
            `;
        }
        
        container.appendChild(entry);
    });
}

// ── FERTILIZER CARE FLOW HELPERS ──
function renderFertilizerSchedule() {
    const listContainer = document.getElementById('fertilizer-schedule-list');
    const badge = document.getElementById('fert-due-count');
    if (!listContainer) return;

    const fertSchedule = JSON.parse(localStorage.getItem('franklin_fertilizer_schedule')) || [];
    listContainer.innerHTML = '';

    if (fertSchedule.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state" style="padding: 15px 0;">
                <span style="font-size: 20px;">🧪</span>
                <p style="font-size: 12px; margin-top: 5px; color: var(--text-muted);">No fertilizations scheduled.</p>
            </div>
        `;
        if (badge) {
            badge.textContent = '0 Due';
            badge.classList.remove('overdue');
        }
        return;
    }

    // Sort by nextDate ascending
    fertSchedule.sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    let dueCount = 0;

    fertSchedule.forEach(item => {
        const itemDate = new Date(item.nextDate);
        const itemDateStr = item.nextDate;

        const timeDiff = itemDate - today;
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        let statusClass = 'upcoming';
        let diffText = '';

        if (daysDiff < 0) {
            statusClass = 'overdue';
            diffText = `⚠️ Overdue by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) > 1 ? 's' : ''}`;
            dueCount++;
        } else if (daysDiff === 0) {
            statusClass = 'today';
            diffText = `🕐 Due today`;
            dueCount++;
        } else {
            diffText = `In ${daysDiff} day${daysDiff > 1 ? 's' : ''}`;
        }

        const opt = { month: 'short', day: 'numeric' };
        const localDate = new Date(itemDateStr + 'T00:00:00');
        const formattedDate = localDate.toLocaleDateString('en-US', opt);

        const card = document.createElement('div');
        card.className = `fert-schedule-item ${statusClass}`;
        card.innerHTML = `
            <div class="fert-schedule-row-main">
                <span class="fert-schedule-plant">${item.plantName}</span>
                <span class="fert-schedule-formula">${item.npk ? `${item.npk}` : 'NPK N/A'}</span>
            </div>
            <div class="fert-schedule-meta">
                <span class="fert-schedule-date">${formattedDate} · ${diffText}</span>
                <button class="btn-fert-log-now" data-plant-id="${item.plantId}">Log Now</button>
            </div>
        `;
        listContainer.appendChild(card);
    });

    if (badge) {
        badge.textContent = `${dueCount} Due`;
        if (dueCount > 0) {
            badge.classList.add('overdue');
        } else {
            badge.classList.remove('overdue');
        }
    }

    listContainer.querySelectorAll('.btn-fert-log-now').forEach(btn => {
        btn.addEventListener('click', () => {
            const plantId = btn.getAttribute('data-plant-id');
            logQuickFertilize(plantId);
        });
    });
}

function renderFertilizerInsights() {
    const container = document.getElementById('fert-insight-widget');
    if (!container) return;

    const fertLogs = careLogs.filter(log => log.type === 'Fertilization' || log.type === 'Fertilizer & Feed');
    const totalEvents = fertLogs.length;

    const formulaCounts = {};
    fertLogs.forEach(log => {
        const f = log.fertFormula || 'Other';
        formulaCounts[f] = (formulaCounts[f] || 0) + 1;
    });
    let mostUsed = 'N/A';
    let max = 0;
    Object.entries(formulaCounts).forEach(([k, v]) => {
        if (v > max) {
            max = v;
            mostUsed = k;
        }
    });

    const lastFertByZone = { A: 'Never', B: 'Never', C: 'Never' };
    for (const log of careLogs) {
        if (log.type === 'Fertilization' || log.type === 'Fertilizer & Feed') {
            const plant = plantsState.find(p => p.id === log.plantId);
            if (plant && lastFertByZone[plant.group] === 'Never') {
                const dateOnly = log.date.split(',')[0];
                lastFertByZone[plant.group] = `${plant.name} (${dateOnly})`;
            }
        }
    }

    container.innerHTML = `
        <div class="fert-insight-stats">
            <div class="fert-stat-box">
                <div class="fert-stat-val">${totalEvents}</div>
                <div class="fert-stat-lbl">Feed Events</div>
            </div>
            <div class="fert-stat-box">
                <div class="fert-stat-val" style="font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 4px 0;" title="${mostUsed}">${mostUsed}</div>
                <div class="fert-stat-lbl">Top Formula</div>
            </div>
        </div>
        <div class="fert-zone-list">
            <h4 style="font-size: 12px; margin-bottom: 5px; color: var(--text-secondary);">Last Feed by Zone</h4>
            <div class="fert-zone-item">
                <span class="fert-zone-name zone-A">Zone A (Succulents)</span>
                <span class="fert-zone-date">${lastFertByZone.A}</span>
            </div>
            <div class="fert-zone-item">
                <span class="fert-zone-name zone-B">Zone B (Shrubs)</span>
                <span class="fert-zone-date">${lastFertByZone.B}</span>
            </div>
            <div class="fert-zone-item">
                <span class="fert-zone-name zone-C">Zone C (Trees/Climbers)</span>
                <span class="fert-zone-date">${lastFertByZone.C}</span>
            </div>
        </div>
    `;
}

function logQuickFertilize(plantId) {
    const tabBtn = document.getElementById('tab-care');
    if (tabBtn) tabBtn.click();
    
    const select = document.getElementById('care-plant-select');
    if (select) select.value = plantId;

    const typeSelect = document.getElementById('care-type');
    if (typeSelect) typeSelect.value = 'Fertilization';

    const fertilizerPanel = document.getElementById('fertilizer-detail-panel');
    if (fertilizerPanel) {
        fertilizerPanel.classList.add('fert-panel-open');
        fertilizerPanel.setAttribute('aria-hidden', 'false');
    }

    const formulaSelect = document.getElementById('fert-formula');
    if (formulaSelect) {
        const targetPlant = plantsState.find(p => p.id === parseInt(plantId));
        if (targetPlant) {
            const nameLower = targetPlant.name.toLowerCase();
            if (nameLower.includes('cactus') || nameLower.includes('succulent') || nameLower.includes('agave') || nameLower.includes('aloe') || nameLower.includes('sedum') || nameLower.includes('bush')) {
                formulaSelect.value = 'cactus';
            } else {
                formulaSelect.value = 'balanced';
            }
        } else {
            formulaSelect.value = 'balanced';
        }
        formulaSelect.dispatchEvent(new Event('change'));
    }
    
    setTimeout(() => {
        const careForm = document.getElementById('care-form');
        if (careForm) careForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// ── TOAST NOTIFICATION ──
function showToast(message) {
    // Create toast container if not exists
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animations
    setTimeout(() => toast.classList.add('visible'), 50);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// Add required CSS class for toasts dynamically
const toastStyle = document.createElement('style');
toastStyle.textContent = `
.toast-container {
    position: fixed;
    bottom: 30px;
    right: 30px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 100000;
    pointer-events: none;
}
.toast {
    background: rgba(18, 24, 21, 0.95);
    border: 1px solid var(--border-glass);
    border-left: 4px solid var(--color-green);
    color: var(--text-primary);
    padding: 14px 24px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 6px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    transform: translateY(20px);
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.toast.visible {
    transform: translateY(0);
    opacity: 1;
}
.empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--text-muted);
}
.empty-icon {
    font-size: 48px;
    margin-bottom: 15px;
    opacity: 0.5;
}
`;
document.head.appendChild(toastStyle);

// ── PHOTO IDENTIFICATIONS CURATION FLOW LOGIC ──
function getAllImages() {
    const imagesSet = new Set();
    // Add default images
    plantsData.forEach(p => {
        if (p.images) p.images.forEach(img => imagesSet.add(img));
    });
    // Add current plantsState images (including newly created ones)
    plantsState.forEach(p => {
        if (p.images) p.images.forEach(img => imagesSet.add(img));
    });
    
    // Convert to array and sort
    return Array.from(imagesSet).sort();
}

function renderCurationGrid() {
    const grid = document.getElementById('curation-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const allImages = getAllImages();
    
    if (allImages.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🖼️</span>
                <p>No images found in the system.</p>
            </div>
        `;
        return;
    }
    
    allImages.forEach(imgSrc => {
        // Find which plant(s) currently contain this image
        const assignedPlants = plantsState.filter(p => p.images && p.images.includes(imgSrc));
        // Note: normally an image belongs to exactly 0 or 1 plant.
        const currentPlantId = assignedPlants.length > 0 ? assignedPlants[0].id : '';
        
        const card = document.createElement('div');
        card.className = 'curation-card';
        card.setAttribute('data-img', imgSrc);
        
        // Extract filename for label
        const filename = imgSrc.substring(imgSrc.lastIndexOf('/') + 1);
        
        // Build options dropdown of all plants in plantsState
        const sortedPlants = [...plantsState].sort((a, b) => a.name.localeCompare(b.name));
        let selectHtml = `<select class="curation-select" data-img="${imgSrc}">`;
        selectHtml += `<option value="" ${currentPlantId === '' ? 'selected' : ''}>⚠️ Unassigned / None</option>`;
        sortedPlants.forEach(p => {
            selectHtml += `<option value="${p.id}" ${currentPlantId === p.id ? 'selected' : ''}>${p.name} (Zone ${p.group})</option>`;
        });
        selectHtml += `</select>`;
        
        const firstAssignedPlant = assignedPlants[0];
        const zoneBadgeClass = firstAssignedPlant ? `zone-${firstAssignedPlant.group.toLowerCase()}` : '';
        const zoneBadgeText = firstAssignedPlant ? `Zone ${firstAssignedPlant.group}` : 'UNASSIGNED';
        const zoneBadgeStyle = firstAssignedPlant ? `background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid var(--border-glass);` : `background: rgba(224, 88, 55, 0.15); color: var(--color-alert); border: 1px solid rgba(224, 88, 55, 0.2);`;
        
        card.innerHTML = `
            <div class="curation-badge-changed">Unsaved</div>
            <div class="curation-media">
                <img src="${imgSrc}" alt="${filename}" loading="lazy" onerror="this.src='assets/references/IMG_8314.PNG'">
                <span class="curation-filename">${filename}</span>
                <button class="btn-curation-zoom" title="Zoom Image" data-img="${imgSrc}">🔍</button>
            </div>
            <div class="curation-content">
                <div class="curation-form-group">
                    <label>Identified Species</label>
                    ${selectHtml}
                </div>
                <div class="curation-footer">
                    <span class="curation-zone-badge ${zoneBadgeClass}" style="${zoneBadgeStyle}">${zoneBadgeText}</span>
                </div>
            </div>
        `;
        
        // Zoom handler
        card.querySelector('.btn-curation-zoom').addEventListener('click', (e) => {
            e.stopPropagation();
            openImageModal(imgSrc, `Curation Preview: ${filename}`);
        });
        
        // Dropdown change handler
        const select = card.querySelector('.curation-select');
        select.addEventListener('change', (e) => {
            const newPlantIdVal = e.target.value;
            const newPlantId = newPlantIdVal ? parseInt(newPlantIdVal) : null;
            
            // Perform reassignment
            reassignImage(imgSrc, currentPlantId, newPlantId);
        });
        
        grid.appendChild(card);
    });
}

function reassignImage(imgSrc, oldPlantId, newPlantId) {
    // 1. Remove from old plant's images array
    if (oldPlantId !== '') {
        const oldPlant = plantsState.find(p => p.id === oldPlantId);
        if (oldPlant && oldPlant.images) {
            oldPlant.images = oldPlant.images.filter(img => img !== imgSrc);
            // Save old plant changes
            savePlantToLocalStorage(oldPlant);
        }
    }
    
    // 2. Add to new plant's images array
    if (newPlantId !== null) {
        const newPlant = plantsState.find(p => p.id === newPlantId);
        if (newPlant) {
            if (!newPlant.images) newPlant.images = [];
            if (!newPlant.images.includes(imgSrc)) {
                newPlant.images.push(imgSrc);
            }
            // Save new plant changes
            savePlantToLocalStorage(newPlant);
        }
    }
    
    // 3. Reset active media carousel index for both plants
    if (oldPlantId !== '') activeMediaIndices[oldPlantId] = 0;
    if (newPlantId !== null) activeMediaIndices[newPlantId] = 0;
    
    // 4. Refresh views
    renderCatalog();
    renderCurationGrid();
    renderPins(); // tooltips or pin details might change if images change
    populatePlantDropdown(); // dropdown lists
    
    showToast(`🏷️ Reassigned image to ${newPlantId ? plantsState.find(p => p.id === newPlantId).name : 'Unassigned'}!`);
}

function savePlantToLocalStorage(plant) {
    const customPlants = JSON.parse(localStorage.getItem('franklin_custom_plants')) || {};
    customPlants[plant.id] = {
        name: plant.name,
        group: plant.group,
        description: plant.description,
        flowering: plant.flowering,
        water: plant.water,
        pruning: plant.pruning,
        pest: plant.pest,
        fact: plant.fact,
        images: plant.images
    };
    localStorage.setItem('franklin_custom_plants', JSON.stringify(customPlants));
    publishPlantsRegistry();  // keep D.SAR sandbox in sync
}

// Publish a slim plant registry to localStorage for cross-page consumption (D.SAR Sandbox)
function publishPlantsRegistry() {
    const registry = plantsState.map(p => ({
        id: p.id,
        name: p.name,
        group: p.group,
        status: p.status,
        avatarSrc: `assets/generated/avatar_${p.id}.png`
    }));
    localStorage.setItem('franklin_plants_registry', JSON.stringify(registry));
}

function setupCreateSpeciesForm() {
    const modal = document.getElementById('create-species-dialog');
    const form = document.getElementById('create-species-form');
    const createBtn = document.getElementById('btn-create-species-curation');
    const cancelBtn = document.getElementById('btn-cancel-create-species');
    const closeX = document.getElementById('create-species-close-x');
    
    if (!modal || !form || !createBtn) return;
    
    const closeModal = () => {
        form.reset();
        modal.close();
    };
    
    createBtn.addEventListener('click', () => {
        modal.showModal();
    });
    
    cancelBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('new-species-name').value.trim();
        const group = document.getElementById('new-species-group').value;
        const flowering = document.getElementById('new-species-flowering').value.trim();
        const water = document.getElementById('new-species-water').value.trim();
        const pruning = document.getElementById('new-species-pruning').value.trim();
        const pest = document.getElementById('new-species-pest').value.trim();
        const description = document.getElementById('new-species-desc').value.trim();
        const fact = document.getElementById('new-species-fact').value.trim();
        
        // Generate new ID (max ID + 1)
        const maxId = plantsState.reduce((max, p) => p.id > max ? p.id : max, 0);
        const newId = maxId + 1;
        
        const newPlant = {
            id: newId,
            group,
            name,
            description,
            flowering,
            water,
            pruning,
            pest,
            fact,
            status: 'Healthy',
            images: []
        };
        
        // Add to state
        plantsState.push(newPlant);
        activeMediaIndices[newId] = 0;
        
        // Save to localStorage
        savePlantToLocalStorage(newPlant);
        
        closeModal();
        
        // Refresh curation grid dropdowns, catalog, and forms
        renderCatalog();
        renderCurationGrid();
        populatePlantDropdown();
        populateMapFilters();
        
        showToast(`🌿 Created new plant species: ${name}!`);
    });
}

function setupCardUploadListener() {
    const uploadInput = document.getElementById('card-image-upload-input');
    if (!uploadInput) return;
    
    uploadInput.addEventListener('change', async (e) => {
        const plantId = parseInt(uploadInput.getAttribute('data-target-plant-id'));
        const file = e.target.files[0];
        if (!file || !plantId) return;
        
        try {
            const dataUrl = await compressAndResizeImage(file);
            const plant = plantsState.find(p => p.id === plantId);
            if (plant) {
                if (!plant.images) plant.images = [];
                plant.images.push(dataUrl);
                savePlantToLocalStorage(plant);
                
                // Switch carousel to show the new image
                activeMediaIndices[plantId] = plant.images.length - 1;
                
                // Refresh views
                renderCatalog();
                renderCurationGrid();
                renderPins();
                populatePlantDropdown();
                
                showToast(`📷 Image uploaded successfully for ${plant.name}!`);
            }
        } catch (err) {
            console.error("Image upload failed:", err);
            showToast("❌ Failed to process image.");
        } finally {
            uploadInput.value = '';
        }
    });
}

// ── GARDEN TASKS & ANALYTICS DASHBOARD ENGINE ──
const DEFAULT_TASKS = [
    {
        id: 1,
        plantId: 12,
        plantName: "Olive Tree",
        taskType: "Treatment",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: "Perform diagnostic follow-up on scale infestation. Check leaves for new pest activity.",
        completed: false
    },
    {
        id: 2,
        plantId: 2,
        plantName: "Elephant Bush",
        taskType: "Watering",
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: "Give 2 gallons of deep soak irrigation. Avoid overwatering roots.",
        completed: false
    },
    {
        id: 3,
        plantId: 4,
        plantName: "Lantana",
        taskType: "Pruning",
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: "Prune dead flowers (deadheading) to promote summer flowering clusters.",
        completed: false
    }
];

function loadTasks() {
    gardenTasks = JSON.parse(localStorage.getItem('franklin_garden_tasks'));
    if (!gardenTasks || gardenTasks.length === 0) {
        gardenTasks = DEFAULT_TASKS;
        localStorage.setItem('franklin_garden_tasks', JSON.stringify(gardenTasks));
    }
}

function populateTaskDropdown() {
    const select = document.getElementById('task-plant-select');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Choose a plant...</option>';
    const sorted = [...plantsState].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (Zone ${p.group})`;
        select.appendChild(opt);
    });
}

function setupTaskForm() {
    const form = document.getElementById('task-scheduler-form');
    if (!form) return;

    // Set default due date to today
    const dateInput = document.getElementById('task-due-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const plantId = parseInt(document.getElementById('task-plant-select').value);
        const typeSelect = document.getElementById('task-type');
        const taskType = typeSelect.value;
        const dueDate = document.getElementById('task-due-date').value;
        const notes = document.getElementById('task-notes').value.trim();

        const plant = plantsState.find(p => p.id === plantId);
        if (!plant) return;

        const newTask = {
            id: Date.now(),
            plantId,
            plantName: plant.name,
            taskType,
            dueDate,
            notes,
            completed: false
        };

        gardenTasks.push(newTask);
        localStorage.setItem('franklin_garden_tasks', JSON.stringify(gardenTasks));

        form.reset();
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        renderTasks();
        renderAnalytics();
        showToast(`📅 Scheduled "${taskType}" task for ${plant.name}!`);
    });
}

function renderTasks() {
    const container = document.getElementById('task-list');
    const pendingBadge = document.getElementById('task-pending-count');
    if (!container) return;

    container.innerHTML = '';
    const activeTasks = gardenTasks.filter(t => !t.completed);
    
    // Sort active tasks by due date (oldest/overdue first)
    activeTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (pendingBadge) {
        pendingBadge.textContent = `${activeTasks.length} Pending`;
    }

    if (activeTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px 10px;">
                <span class="empty-icon" style="font-size: 28px;">✔️</span>
                <p style="font-size: 13px;">All caught up! No pending garden tasks.</p>
            </div>
        `;
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    activeTasks.forEach(task => {
        const isOverdue = task.dueDate < todayStr;
        const dateObj = new Date(task.dueDate + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        let badgeClass = 'general';
        let emoji = '📋';
        if (task.taskType === 'Watering') { badgeClass = 'water'; emoji = '💦'; }
        else if (task.taskType === 'Pruning') { badgeClass = 'pruning'; emoji = '✂️'; }
        else if (task.taskType === 'Treatment') { badgeClass = 'treatment'; emoji = '💊'; }
        else if (task.taskType === 'Fertilization') { badgeClass = 'fertilizer'; emoji = '🧪'; }

        const item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML = `
            <input type="checkbox" class="task-checkbox-input" data-task-id="${task.id}" title="Complete task">
            <div class="task-item-content">
                <div class="task-title">${task.plantName}: ${emoji} ${task.taskType}</div>
                <div class="task-meta-row">
                    <span class="task-badge ${badgeClass}">${task.taskType}</span>
                    <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                        ${isOverdue ? '⚠️ Overdue — ' : 'Due '}${formattedDate}
                    </span>
                </div>
                ${task.notes ? `<div class="task-instructions">${task.notes}</div>` : ''}
            </div>
        `;

        // Checkbox click listener with animations
        const checkbox = item.querySelector('.task-checkbox-input');
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                item.classList.add('completed');
                setTimeout(() => {
                    completeTask(task.id);
                }, 400);
            }
        });

        container.appendChild(item);
    });
}

function completeTask(taskId) {
    const task = gardenTasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = true;
    localStorage.setItem('franklin_garden_tasks', JSON.stringify(gardenTasks));

    // Automatically trigger Care Log entry
    const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const plant = plantsState.find(p => p.id === task.plantId);
    let notes = `Completed scheduled task: ${task.notes || ''}`;
    let newStatus = 'Healthy';
    if (plant) {
        newStatus = plant.status;
    }

    // If treating a sick plant, restore it to Healthy
    if (task.taskType === 'Treatment' && plant && plant.status.includes('SICK')) {
        newStatus = 'Healthy';
        plant.status = 'Healthy';
        const savedStatuses = JSON.parse(localStorage.getItem('franklin_plant_statuses')) || {};
        savedStatuses[plant.id] = 'Healthy';
        localStorage.setItem('franklin_plant_statuses', JSON.stringify(savedStatuses));
        notes += " (Plant health restored to Healthy)";
    }

    const newLog = {
        id: Date.now(),
        plantName: task.plantName,
        plantId: task.plantId,
        type: task.taskType,
        status: newStatus,
        notes: notes,
        date: timestamp
    };

    careLogs.unshift(newLog);
    localStorage.setItem('franklin_care_logs', JSON.stringify(careLogs));

    renderDashboard();
    renderCatalog();
    renderTasks();
    renderCareLogs();
    renderAnalytics();

    showToast(`✔️ Completed task: ${task.taskType} for ${task.plantName}!`);
}

function renderAnalytics() {
    const healthIndexVal = document.getElementById('analytic-health-index');
    const tasksCompetencyVal = document.getElementById('analytic-tasks-completed');
    const waterLoadVal = document.getElementById('analytic-watering-load');

    const totalPlants = plantsState.length;
    if (totalPlants === 0) return;

    // 1. Health Index calculation
    const sickCount = plantsState.filter(p => p.status.includes('SICK')).length;
    const healthyCount = totalPlants - sickCount;
    const healthPct = Math.round((healthyCount / totalPlants) * 100);
    if (healthIndexVal) {
        healthIndexVal.textContent = `${healthPct}%`;
    }

    // 2. Tasks Competency calculation
    const totalTasks = gardenTasks.length;
    const completedTasks = gardenTasks.filter(t => t.completed).length;
    if (tasksCompetencyVal) {
        tasksCompetencyVal.textContent = `${completedTasks}/${totalTasks}`;
    }

    // 3. Water Load calculation
    // Low: V. Low/Low plants count. High: High/Consistent plants count.
    const highWaterCount = plantsState.filter(p => p.water && (p.water.includes('High') || p.water.includes('Consistent'))).length;
    const modWaterCount = plantsState.filter(p => p.water && (p.water.includes('Mod') || p.water.includes('Moderate'))).length;
    const lowWaterCount = totalPlants - highWaterCount - modWaterCount;
    if (waterLoadVal) {
        if (highWaterCount > modWaterCount && highWaterCount > lowWaterCount) {
            waterLoadVal.textContent = 'High Load';
        } else if (modWaterCount > lowWaterCount) {
            waterLoadVal.textContent = 'Medium Load';
        } else {
            waterLoadVal.textContent = 'Low Load';
        }
    }

    // 4. Render Health Ratio Chart (Horizontal bar)
    const healthChart = document.getElementById('chart-health-ratio');
    if (healthChart) {
        const sickPct = Math.round((sickCount / totalPlants) * 100);
        healthChart.innerHTML = `
            <div class="bar-row">
                <div class="bar-label-row">
                    <span class="bar-lbl">Healthy Species</span>
                    <span class="bar-val">${healthyCount} (${healthPct}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill healthy" style="width: ${healthPct}%"></div>
                </div>
            </div>
            <div class="bar-row">
                <div class="bar-label-row">
                    <span class="bar-lbl">Attention Needed (Sick)</span>
                    <span class="bar-val">${sickCount} (${sickPct}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill sick" style="width: ${sickPct}%"></div>
                </div>
            </div>
        `;
    }

    // 5. Render Recorded Care Activities Chart (Vertical columns)
    const activityChart = document.getElementById('chart-activity-freq');
    if (activityChart) {
        // Group logs
        const counts = { Watering: 0, Pruning: 0, Treatment: 0, Fertilization: 0, General: 0 };
        careLogs.forEach(log => {
            if (log.type.includes('Water')) counts.Watering++;
            else if (log.type.includes('Prun')) counts.Pruning++;
            else if (log.type.includes('Treat')) counts.Treatment++;
            else if (log.type.includes('Fert')) counts.Fertilization++;
            else counts.General++;
        });

        const maxCount = Math.max(...Object.values(counts), 1);
        activityChart.innerHTML = `
            <div class="v-bar-container">
                <div class="v-bar-column">
                    <span class="v-bar-val">${counts.Watering}</span>
                    <div class="v-bar-track">
                        <div class="v-bar-fill water" style="height: ${(counts.Watering / maxCount) * 100}%"></div>
                    </div>
                    <span class="v-bar-lbl">Water</span>
                </div>
                <div class="v-bar-column">
                    <span class="v-bar-val">${counts.Pruning}</span>
                    <div class="v-bar-track">
                        <div class="v-bar-fill pruning" style="height: ${(counts.Pruning / maxCount) * 100}%"></div>
                    </div>
                    <span class="v-bar-lbl">Pruning</span>
                </div>
                <div class="v-bar-column">
                    <span class="v-bar-val">${counts.Treatment}</span>
                    <div class="v-bar-track">
                        <div class="v-bar-fill treatment" style="height: ${(counts.Treatment / maxCount) * 100}%"></div>
                    </div>
                    <span class="v-bar-lbl">Treat</span>
                </div>
                <div class="v-bar-column">
                    <span class="v-bar-val">${counts.Fertilization}</span>
                    <div class="v-bar-track">
                        <div class="v-bar-fill fertilizer" style="height: ${(counts.Fertilization / maxCount) * 100}%"></div>
                    </div>
                    <span class="v-bar-lbl">Feed</span>
                </div>
                <div class="v-bar-column">
                    <span class="v-bar-val">${counts.General}</span>
                    <div class="v-bar-track">
                        <div class="v-bar-fill general" style="height: ${(counts.General / maxCount) * 100}%"></div>
                    </div>
                    <span class="v-bar-lbl">General</span>
                </div>
            </div>
        `;
    }

    // 6. Render Zone Demands Chart
    const zoneChart = document.getElementById('chart-water-zones');
    if (zoneChart) {
        // Group plants by zone A, B, C
        const zones = { A: 0, B: 0, C: 0 };
        plantsState.forEach(p => {
            if (zones[p.group] !== undefined) {
                zones[p.group]++;
            }
        });

        const zoneA_pct = Math.round((zones.A / totalPlants) * 100);
        const zoneB_pct = Math.round((zones.B / totalPlants) * 100);
        const zoneC_pct = Math.round((zones.C / totalPlants) * 100);

        zoneChart.innerHTML = `
            <div class="bar-row">
                <div class="bar-label-row">
                    <span class="bar-lbl">Zone A (Low Succulents)</span>
                    <span class="bar-val">${zones.A} Plants (${zoneA_pct}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill gold" style="width: ${zoneA_pct}%"></div>
                </div>
            </div>
            <div class="bar-row">
                <div class="bar-label-row">
                    <span class="bar-lbl">Zone B (Moderate Shrubs)</span>
                    <span class="bar-val">${zones.B} Plants (${zoneB_pct}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill primary" style="width: ${zoneB_pct}%"></div>
                </div>
            </div>
            <div class="bar-row">
                <div class="bar-label-row">
                    <span class="bar-lbl">Zone C (Moist Climbers/Trees)</span>
                    <span class="bar-val">${zones.C} Plants (${zoneC_pct}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill blue" style="width: ${zoneC_pct}%"></div>
                </div>
            </div>
        `;
    }

    // 7. Render Water requirement distributions
    const waterNeedsChart = document.getElementById('chart-water-needs');
    if (waterNeedsChart) {
        const highWater = plantsState.filter(p => p.water && (p.water.includes('High') || p.water.includes('Consistent'))).length;
        const modWater = plantsState.filter(p => p.water && (p.water.includes('Mod') || p.water.includes('Moderate'))).length;
        const lowWater = totalPlants - highWater - modWater;

        const lowPct = Math.round((lowWater / totalPlants) * 100);
        const modPct = Math.round((modWater / totalPlants) * 100);
        const highPct = Math.round((highWater / totalPlants) * 100);

        waterNeedsChart.innerHTML = `
            <div class="bar-row">
                <div class="bar-label-row">
                    <span class="bar-lbl">Low Hydration (Succulents, etc.)</span>
                    <span class="bar-val">${lowWater} Plants (${lowPct}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill gold" style="width: ${lowPct}%"></div>
                </div>
            </div>
            <div class="bar-row">
                <div class="bar-label-row">
                    <span class="bar-lbl">Moderate Hydration (Shrubs)</span>
                    <span class="bar-val">${modWater} Plants (${modPct}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill terracotta" style="width: ${modPct}%"></div>
                </div>
            </div>
            <div class="bar-row">
                <div class="bar-label-row">
                    <span class="bar-lbl">High/Consistent Hydration (Vines, Fruit)</span>
                    <span class="bar-val">${highWater} Plants (${highPct}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill blue" style="width: ${highPct}%"></div>
                </div>
            </div>
        `;
    }
    renderFertilizerInsights();
}

// Load App on Window Ready
window.addEventListener('load', init);

