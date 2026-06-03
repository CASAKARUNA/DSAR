/* ==========================================================================
   D.SAR STUDIO — INTERACTIVE LOGIC & SIMULATIONS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. HEADER SCROLL EFFECT & ACTIVE LINKS
    // ==========================================
    const header = document.querySelector('.dsar-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            header.style.height = '60px';
            header.style.backgroundColor = 'rgba(247, 245, 240, 0.95)';
            header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.02)';
        } else {
            header.style.height = '70px';
            header.style.backgroundColor = 'rgba(247, 245, 240, 0.8)';
            header.style.boxShadow = 'none';
        }
        
        // Highlight active navigation section on scroll
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.nav-link');
        let currentSectionId = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.scrollY >= sectionTop) {
                currentSectionId = section.getAttribute('id');
            }
        });
        
        if (currentSectionId) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });

    // ==========================================
    // 2. GLOBAL BACKGROUND GRID CANVAS
    // ==========================================
    const bgCanvas = document.getElementById('interactive-grid-canvas');
    if (bgCanvas) {
        const ctx = bgCanvas.getContext('2d');
        let width = bgCanvas.width = window.innerWidth;
        let height = bgCanvas.height = window.innerHeight;
        
        let mouseX = -100;
        let mouseY = -100;
        let activeX = -100;
        let activeY = -100;
        
        window.addEventListener('resize', () => {
            width = bgCanvas.width = window.innerWidth;
            height = bgCanvas.height = window.innerHeight;
        });
        
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        // Render loop for background grid
        function drawBgGrid() {
            ctx.clearRect(0, 0, width, height);
            
            // Interpolate active tracker toward real mouse position
            activeX += (mouseX - activeX) * 0.08;
            activeY += (mouseY - activeY) * 0.08;
            
            // Grid cell size
            const cellSize = 60;
            ctx.strokeStyle = 'rgba(18, 19, 20, 0.025)';
            ctx.lineWidth = 1;
            
            // Vertical lines
            for (let x = 0; x < width; x += cellSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            
            // Horizontal lines
            for (let y = 0; y < height; y += cellSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            
            // Draw mouse tracking alignment overlays
            if (activeX > 0 && activeY > 0) {
                ctx.strokeStyle = 'rgba(200, 122, 83, 0.05)';
                ctx.lineWidth = 1;
                
                // Crosshairs
                ctx.beginPath();
                ctx.moveTo(activeX, 0);
                ctx.lineTo(activeX, height);
                ctx.moveTo(0, activeY);
                ctx.lineTo(width, activeY);
                ctx.stroke();
                
                // Outer circle
                ctx.beginPath();
                ctx.arc(activeX, activeY, 40, 0, Math.PI * 2);
                ctx.stroke();
                
                // Monospace Coordinates readout
                ctx.fillStyle = 'rgba(141, 150, 136, 0.35)';
                ctx.font = '9px "JetBrains Mono", monospace';
                ctx.fillText(`X:${Math.round(activeX)} Y:${Math.round(activeY)}`, activeX + 15, activeY - 15);
            }
            
            requestAnimationFrame(drawBgGrid);
        }
        drawBgGrid();
    }

    // ==========================================
    // 3. ARCHITECTURAL LEDGER TAB CONTROL
    // ==========================================
    const ledgerTabs = document.querySelectorAll('.ledger-tab');
    const ledgerPanels = document.querySelectorAll('.ledger-panel');
    
    ledgerTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active classes
            ledgerTabs.forEach(t => t.classList.remove('active'));
            ledgerPanels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab & panel
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-ledger-target');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });


    // ==========================================
    // 4. SPATIAL SANDBOX SIMULATOR (CANVAS ENGINE)
    // ==========================================
    const sandboxCanvas = document.getElementById('sandbox-canvas');
    if (sandboxCanvas) {
        const sCtx = sandboxCanvas.getContext('2d');
        const sWrapper = document.getElementById('sandbox-canvas-wrapper');
        const gridValReadout = document.getElementById('sandbox-grid-val');
        const eleValReadout = document.getElementById('sandbox-ele-val');
        
        // Canvas width & height definitions
        const cWidth = sandboxCanvas.width = sWrapper.clientWidth;
        const cHeight = sandboxCanvas.height = sWrapper.clientHeight;

        // ── LIVE FLORA: Load from Garden Guide localStorage ──────────────────
        const ZONE_COLORS = {
            A: '#C87A53',   // Terracotta
            B: '#8D9688',   // Sage Green
            C: '#4A90E2'    // Blue
        };

        function getPlantSketchSrc(plant) {
            if (plant.images && plant.images.length > 0) {
                const sketch = plant.images.find(img => img.includes('assets/generated/') && img.endsWith('.png'));
                if (sketch) return sketch;
            }
            if (plant.name.toLowerCase().includes('grape')) {
                return 'assets/generated/jasmine.png';
            }
            if (plant.name.toLowerCase().includes('crepe')) {
                return 'assets/generated/smoke_bush.png';
            }
            return 'assets/generated/rosemary.png';
        }

        // Placeholder demo plants if no real data yet
        const DEMO_PLANTS = [
            { plantId: 'demo-1', name: 'Velvet Mesquite', group: 'B', cx: 200, cy: 260, r: 18, sketchSrc: 'assets/generated/smoke_bush.png' },
            { plantId: 'demo-2', name: 'Arizona White Oak', group: 'B', cx: 230, cy: 300, r: 18, sketchSrc: 'assets/generated/oak_tree.png' },
            { plantId: 'demo-3', name: 'Texas Sage',     group: 'A', cx: 120, cy: 320, r: 18, sketchSrc: 'assets/generated/texas_sage.png' },
            { plantId: 'demo-4', name: 'Totem Pole Cactus', group: 'A', cx: 350, cy: 320, r: 18, sketchSrc: 'assets/generated/totem_pole.png' },
            { plantId: 'demo-5', name: 'Jasmine',   group: 'C', cx: 480, cy: 150, r: 18, sketchSrc: 'assets/generated/jasmine.png' }
        ];

        // Pre-loaded avatar image cache: { plantId -> HTMLImageElement }
        const imgCache = {};
        let liveFloraPlants = [];   // final list drawn on canvas
        let hoveredPlant = null;    // which plant the cursor is over
        let isLiveData = false;

        function loadLiveFlora() {
            try {
                const rawPins = localStorage.getItem('franklin_mapped_plants');
                const rawRegistry = localStorage.getItem('franklin_plants_registry');
                if (!rawPins || !rawRegistry) { return false; }

                const pins = JSON.parse(rawPins);
                const registry = JSON.parse(rawRegistry);
                const byId = {};
                registry.forEach(p => { byId[p.id] = p; });

                if (!pins || pins.length === 0) { return false; }

                liveFloraPlants = pins.map(pin => {
                    const plant = byId[pin.plantId];
                    if (!plant) return null;
                    return {
                        plantId: plant.id,
                        name: plant.name,
                        group: plant.group,
                        // Map blueprint % coords → canvas pixel coords
                        cx: (pin.x / 100) * cWidth,
                        cy: (pin.y / 100) * cHeight,
                        r: 18,
                        sketchSrc: getPlantSketchSrc(plant),
                        pinId: pin.id
                    };
                }).filter(Boolean);

                return liveFloraPlants.length > 0;
            } catch (e) {
                console.warn('D.SAR Sandbox: could not read live flora', e);
                return false;
            }
        }

        isLiveData = loadLiveFlora();

        // Pre-load images for all plants (live and demo)
        function preloadImages() {
            const plants = isLiveData ? liveFloraPlants : DEMO_PLANTS;
            plants.forEach(p => {
                const cacheId = p.plantId;
                if (!imgCache[cacheId]) {
                    const img = new Image();
                    img.src = p.sketchSrc;
                    img.onload = () => drawSandbox();
                    imgCache[cacheId] = img;
                }
            });
        }
        preloadImages();

        // Update Flora Coverage readout based on real data
        function updateFloraCoverage() {
            const coverageEl = document.querySelector('.sandbox-coords-output .output-row:last-child .val');
            if (!coverageEl) return;
            if (isLiveData && liveFloraPlants.length > 0) {
                // Rough estimate: each plant covers a 16px-radius canopy circle
                const totalPx = liveFloraPlants.reduce((sum, p) => sum + Math.PI * p.r * p.r, 0);
                const canvasPx = cWidth * cHeight;
                const pct = Math.min(Math.round((totalPx / canvasPx) * 100 * 4), 99); // ×4 scaling factor
                coverageEl.textContent = `${pct}% (${liveFloraPlants.length} species)`;
            }
        }
        updateFloraCoverage();

        // Simulation parameters
        const state = {
            drawFootprint: true,
            drawTopo: true,
            drawFlora: true,
            drawWater: true,
            mouseX: 0,
            mouseY: 0
        };

        // Wire up toggle buttons
        const toggles = {
            'layer-footprint': 'drawFootprint',
            'layer-topo': 'drawTopo',
            'layer-flora': 'drawFlora',
            'layer-water': 'drawWater'
        };

        Object.keys(toggles).forEach(id => {
            const cb = document.getElementById(id);
            const card = document.getElementById(`label-toggle-${id.split('-')[1]}`);
            if (cb) {
                cb.addEventListener('change', (e) => {
                    state[toggles[id]] = e.target.checked;
                    if (card) {
                        card.classList.toggle('active', e.target.checked);
                    }
                    drawSandbox();
                });
            }
        });

        // Mouse hover tracking for Coordinates & Grid values + plant hover
        sandboxCanvas.addEventListener('mousemove', (e) => {
            const rect = sandboxCanvas.getBoundingClientRect();
            state.mouseX = e.clientX - rect.left;
            state.mouseY = e.clientY - rect.top;

            // Grid + Elevation readouts
            const colIndex = Math.min(Math.floor((state.mouseX / cWidth) * 10), 9);
            const rowIndex = Math.min(Math.floor((state.mouseY / cHeight) * 11), 10);
            const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
            const rowStr = (rowIndex + 1).toString().padStart(2, '0');
            gridValReadout.textContent = `${cols[colIndex]}${rowStr}`;
            eleValReadout.textContent = `${(750 - (state.mouseY / cHeight) * 35).toFixed(1)}m`;

            // Check if cursor is over a live plant
            const plants = isLiveData ? liveFloraPlants : DEMO_PLANTS;
            hoveredPlant = null;
            for (const p of plants) {
                const dx = state.mouseX - p.cx;
                const dy = state.mouseY - p.cy;
                if (Math.sqrt(dx * dx + dy * dy) <= p.r + 4) {
                    hoveredPlant = p;
                    break;
                }
            }
            sandboxCanvas.style.cursor = hoveredPlant ? 'pointer' : 'crosshair';

            drawSandbox();
        });

        sandboxCanvas.addEventListener('mouseleave', () => {
            state.mouseX = 0;
            state.mouseY = 0;
            hoveredPlant = null;
            sandboxCanvas.style.cursor = '';
            gridValReadout.textContent = 'G08';
            eleValReadout.textContent = '732.5m';
            drawSandbox();
        });

        // ── Helpers for canvas drawing ────────────────────────────────────────

        // Draw a transparent plant sketch with contour outlines and drop shadow
        function drawPlantSticker(p, isHovered) {
            const r = isHovered ? p.r * 1.3 : p.r;
            const zoneColor = ZONE_COLORS[p.group] || '#8D9688';
            const img = imgCache[p.plantId];

            sCtx.save();

            // Glow ring when hovered
            if (isHovered) {
                sCtx.beginPath();
                sCtx.arc(p.cx, p.cy, r + 5, 0, Math.PI * 2);
                sCtx.strokeStyle = zoneColor + '44';
                sCtx.lineWidth = 4;
                sCtx.stroke();
            }

            // Apply sticker filters: multiple drop-shadows to build a solid white backing outline,
            // then a thin zone-colored outline, and finally a soft dark drop-shadow.
            sCtx.filter = `
                drop-shadow(2px 0 0 #ffffff) 
                drop-shadow(-2px 0 0 #ffffff) 
                drop-shadow(0 2px 0 #ffffff) 
                drop-shadow(0 -2px 0 #ffffff)
                drop-shadow(1px 1px 0 #ffffff) 
                drop-shadow(-1px -1px 0 #ffffff) 
                drop-shadow(1px -1px 0 #ffffff) 
                drop-shadow(-1px 1px 0 #ffffff)
                drop-shadow(1px 0 0 ${zoneColor})
                drop-shadow(-1px 0 0 ${zoneColor})
                drop-shadow(0 1px 0 ${zoneColor})
                drop-shadow(0 -1px 0 ${zoneColor})
                drop-shadow(2px 4px 5px rgba(0, 0, 0, 0.35))
            `;

            // Draw image rotated according to plantId (gives organic hand-placed feel)
            sCtx.translate(p.cx, p.cy);
            const rotations = [-8, -5, -3, 0, 3, 5, 8, -6, 4, -2, 7, -4, 6, -7, 2];
            const rotation = typeof p.plantId === 'number' ? rotations[p.plantId % rotations.length] : 4;
            sCtx.rotate(rotation * Math.PI / 180);

            if (img && img.complete && img.naturalWidth > 0) {
                sCtx.drawImage(img, -r, -r, r * 2, r * 2);
            } else {
                // Fallback: simple zone-colored dot
                sCtx.fillStyle = zoneColor;
                sCtx.beginPath();
                sCtx.arc(0, 0, r, 0, Math.PI * 2);
                sCtx.fill();
            }

            sCtx.restore();
        }

        // Draw hover tooltip bubble above a plant
        function drawPlantTooltip(p) {
            const label = p.name;
            const zone = `Zone ${p.group}`;
            const zoneColor = ZONE_COLORS[p.group] || '#8D9688';

            sCtx.font = 'bold 11px "Inter", sans-serif';
            const labelW = sCtx.measureText(label).width;
            sCtx.font = '9px "Inter", sans-serif';
            const zoneW = sCtx.measureText(zone).width;
            const bubbleW = Math.max(labelW, zoneW) + 20;
            const bubbleH = 36;
            const bx = Math.max(8, Math.min(p.cx - bubbleW / 2, cWidth - bubbleW - 8));
            const by = p.cy - p.r * 1.3 - bubbleH - 10;

            // Bubble background
            sCtx.fillStyle = 'rgba(18, 24, 21, 0.90)';
            roundRect(sCtx, bx, by, bubbleW, bubbleH, 6);
            sCtx.fill();

            // Zone accent bar
            sCtx.fillStyle = zoneColor;
            roundRect(sCtx, bx, by, 4, bubbleH, [6, 0, 0, 6]);
            sCtx.fill();

            // Plant name
            sCtx.fillStyle = '#F7F5F0';
            sCtx.font = 'bold 11px "Inter", sans-serif';
            sCtx.fillText(label, bx + 12, by + 14);

            // Zone label
            sCtx.fillStyle = zoneColor;
            sCtx.font = '9px "Inter", sans-serif';
            sCtx.fillText(zone, bx + 12, by + 28);
        }

        // Canvas rounded rectangle helper
        function roundRect(ctx, x, y, w, h, r) {
            const radii = Array.isArray(r) ? r : [r, r, r, r];
            ctx.beginPath();
            ctx.moveTo(x + radii[0], y);
            ctx.lineTo(x + w - radii[1], y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
            ctx.lineTo(x + w, y + h - radii[2]);
            ctx.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
            ctx.lineTo(x + radii[3], y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
            ctx.lineTo(x, y + radii[0]);
            ctx.quadraticCurveTo(x, y, x + radii[0], y);
            ctx.closePath();
        }

        // Draw "Live data" or "Demo mode" badge in lower-left corner
        function drawSyncBadge() {
            const label = isLiveData
                ? `● LIVE — ${liveFloraPlants.length} pin${liveFloraPlants.length !== 1 ? 's' : ''} synced`
                : '○ DEMO — no Garden Guide pins yet';
            const color = isLiveData ? '#8D9688' : 'rgba(141,150,136,0.5)';

            sCtx.font = '9px "JetBrains Mono", monospace';
            sCtx.fillStyle = color;
            sCtx.fillText(label, 18, cHeight - 18);
        }

        // Core draw loop for Sandbox Canvas
        function drawSandbox() {
            sCtx.clearRect(0, 0, cWidth, cHeight);

            // Background
            sCtx.fillStyle = '#F7F5F0';
            sCtx.fillRect(0, 0, cWidth, cHeight);

            // Layout border
            sCtx.strokeStyle = 'rgba(18, 19, 20, 0.08)';
            sCtx.lineWidth = 1;
            sCtx.strokeRect(10, 10, cWidth - 20, cHeight - 20);

            // ── Layer 1: Topographic lines ──
            if (state.drawTopo) {
                sCtx.strokeStyle = 'rgba(141, 150, 136, 0.4)';
                sCtx.lineWidth = 1;
                const contours = [
                    { cx: 0,      cy: 0,       r: 150 },
                    { cx: 0,      cy: 0,       r: 250 },
                    { cx: 0,      cy: 0,       r: 350 },
                    { cx: 0,      cy: 0,       r: 450 },
                    { cx: 0,      cy: 0,       r: 550 },
                    { cx: 0,      cy: 0,       r: 650 },
                    { cx: cWidth, cy: cHeight, r: 100 },
                    { cx: cWidth, cy: cHeight, r: 200 },
                    { cx: cWidth, cy: cHeight, r: 300 },
                    { cx: cWidth, cy: cHeight, r: 400 }
                ];
                contours.forEach(c => {
                    sCtx.beginPath();
                    sCtx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
                    sCtx.stroke();
                });
            }

            // ── Layer 2: Hydrological flows ──
            if (state.drawWater) {
                sCtx.strokeStyle = '#4A90E2';
                sCtx.lineWidth = 1.5;
                sCtx.setLineDash([5, 5]);
                sCtx.beginPath();
                sCtx.moveTo(0, 100);
                sCtx.quadraticCurveTo(cWidth * 0.4, 250, cWidth, 220);
                sCtx.stroke();
                sCtx.beginPath();
                sCtx.moveTo(cWidth, 400);
                sCtx.quadraticCurveTo(cWidth * 0.6, 320, 200, cHeight);
                sCtx.stroke();
                sCtx.setLineDash([]);
            }

            // ── Layer 3: Architectural Footprint ──
            if (state.drawFootprint) {
                sCtx.fillStyle = 'rgba(200, 122, 83, 0.15)';
                sCtx.strokeStyle = '#C87A53';
                sCtx.lineWidth = 2;
                sCtx.beginPath();
                sCtx.moveTo(250, 120);
                sCtx.lineTo(450, 120);
                sCtx.lineTo(450, 280);
                sCtx.lineTo(380, 280);
                sCtx.lineTo(380, 190);
                sCtx.lineTo(250, 190);
                sCtx.closePath();
                sCtx.fill();
                sCtx.stroke();
                sCtx.fillStyle = 'rgba(18, 19, 20, 0.05)';
                sCtx.strokeStyle = 'rgba(18, 19, 20, 0.4)';
                sCtx.lineWidth = 1.5;
                sCtx.fillRect(150, 120, 80, 50);
                sCtx.strokeRect(150, 120, 80, 50);
                sCtx.fillStyle = 'rgba(18, 19, 20, 0.02)';
                sCtx.fillRect(50, 110, 100, 70);
            }

            // ── Layer 4: Flora — Live stickers or demo dots ──
            if (state.drawFlora) {
                const plants = isLiveData ? liveFloraPlants : DEMO_PLANTS;

                // Draw non-hovered plants first (so hovered one renders on top)
                plants.forEach(p => {
                    if (p !== hoveredPlant) drawPlantSticker(p, false);
                });

                // Draw hovered plant last (on top) + tooltip
                if (hoveredPlant) {
                    drawPlantSticker(hoveredPlant, true);
                    drawPlantTooltip(hoveredPlant);
                }
            }

            // ── Cursor crosshairs ──
            if (state.mouseX > 0 && state.mouseY > 0) {
                sCtx.strokeStyle = 'rgba(200, 122, 83, 0.5)';
                sCtx.lineWidth = 0.5;
                sCtx.beginPath();
                sCtx.moveTo(state.mouseX, 0);
                sCtx.lineTo(state.mouseX, cHeight);
                sCtx.moveTo(0, state.mouseY);
                sCtx.lineTo(cWidth, state.mouseY);
                sCtx.stroke();
                sCtx.fillStyle = '#121314';
                sCtx.beginPath();
                sCtx.arc(state.mouseX, state.mouseY, 3, 0, Math.PI * 2);
                sCtx.fill();
            }

            // Sync badge
            drawSyncBadge();
        }

        drawSandbox();
    }

});
