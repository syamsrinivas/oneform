// ONEFORM — Interactive 3D Showcase & Presentation Application

class OneFormApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.initThree();
        this.initLighting();
        this.initEnvironment();
        this.initGround();
        this.initModel();
        this.initEventListeners();
        this.initPresentationSlides();
        this.initHotspots();
        this.animate();

        // Welcome camera intro
        this.transitionCamera([7.5, 6.2, 9.5], [0, 4.2, 0], 1200);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x121417);
        this.scene.fog = new THREE.FogExp2(0x121417, 0.032);

        this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(8.5, 7.5, 11.0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.02; // Prevent going beneath floor
        this.controls.minDistance = 2.5;
        this.controls.maxDistance = 24.0;
        this.controls.target.set(0, 4.2, 0);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    initLighting() {
        // Subtle ambient fill
        const ambLight = new THREE.AmbientLight(0xD8DEE8, 0.45);
        this.scene.add(ambLight);

        // Key light: Warm soft architectural highlight
        this.keyLight = new THREE.DirectionalLight(0xFFF6EE, 1.25);
        this.keyLight.position.set(6.0, 14.0, 7.0);
        this.keyLight.castShadow = true;
        this.keyLight.shadow.mapSize.width = 2048;
        this.keyLight.shadow.mapSize.height = 2048;
        this.keyLight.shadow.camera.near = 1.0;
        this.keyLight.shadow.camera.far = 30.0;
        this.keyLight.shadow.camera.left = -6.0;
        this.keyLight.shadow.camera.right = 6.0;
        this.keyLight.shadow.camera.top = 8.0;
        this.keyLight.shadow.camera.bottom = -2.0;
        this.keyLight.shadow.bias = -0.0004;
        this.scene.add(this.keyLight);

        // Fill light: Cool architectural rim light
        const fillLight = new THREE.DirectionalLight(0x7688A2, 0.65);
        fillLight.position.set(-8.0, 6.0, -5.0);
        this.scene.add(fillLight);

        // Restrained warm orange accent rim light
        const accentLight = new THREE.SpotLight(0xCB6B48, 1.8, 18, Math.PI / 5, 0.5, 1.2);
        accentLight.position.set(4.0, 1.5, -4.5);
        accentLight.target.position.set(0, 3.5, 0);
        this.scene.add(accentLight);
        this.scene.add(accentLight.target);
    }

    initEnvironment() {
        // Procedural gradient environment map for realistic metallic reflections
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Dark studio environment gradient (top-bright, bottom-dark)
        const grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, '#2A3040');
        grad.addColorStop(0.35, '#181C24');
        grad.addColorStop(0.65, '#0E1016');
        grad.addColorStop(1, '#080A0D');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Subtle warm overhead strip light reflection
        ctx.fillStyle = 'rgba(255, 246, 238, 0.12)';
        ctx.fillRect(0, 20, size, 35);

        // Cool rim accent bar
        ctx.fillStyle = 'rgba(118, 136, 162, 0.08)';
        ctx.fillRect(0, size - 60, size, 30);

        const envTexture = new THREE.CanvasTexture(canvas);
        envTexture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = envTexture;
    }

    initGround() {
        // High-end satin architectural floor with soft reflections and subtle grid
        const floorGeo = new THREE.PlaneGeometry(60, 60);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x16181C,
            roughness: 0.68,
            metalness: 0.22
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Subtle circular pedestal ring
        const ringGeo = new THREE.RingGeometry(4.0, 4.04, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x323842, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.005;
        this.scene.add(ring);
    }

    initModel() {
        this.model = new OneFormModel(this.scene);
        this.transformProgress = 0.0;
        this.explodeProgress = 0.0;
        this.isPlayingAnimation = false;
        this.animStartTime = null;
        this.animDuration = 6000; // 6 seconds cinematic transformation
    }

    initEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());

        // Transformation Slider
        this.transformSlider = document.getElementById('transform-slider');
        this.transformValueDisplay = document.getElementById('transform-val');
        if (this.transformSlider) {
            this.transformSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) / 100;
                this.setTransformation(val);
                window.soundEngine.playRatchetTick(0.8 + val * 0.4);
            });
        }

        // Exploded View Slider
        this.explodeSlider = document.getElementById('explode-slider');
        this.explodeValueDisplay = document.getElementById('explode-val');
        if (this.explodeSlider) {
            this.explodeSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) / 100;
                this.setExplosion(val);
                window.soundEngine.playRatchetTick(1.2 - val * 0.4);
            });
        }

        // State Buttons
        document.querySelectorAll('[data-state]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetState = btn.getAttribute('data-state');
                this.animateToState(targetState);
            });
        });

        // Camera Presets
        document.querySelectorAll('[data-cam]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const camPreset = btn.getAttribute('data-cam');
                this.applyCameraPreset(camPreset);
            });
        });

        // Mode Toggles
        const cutawayToggle = document.getElementById('btn-cutaway');
        if (cutawayToggle) {
            cutawayToggle.addEventListener('click', () => {
                const active = !this.model.cutawayActive;
                this.model.setCutaway(active);
                cutawayToggle.classList.toggle('active', active);
                window.soundEngine.playUnlockSound();
            });
        }

        const motionPathToggle = document.getElementById('btn-motion-path');
        if (motionPathToggle) {
            motionPathToggle.addEventListener('click', () => {
                const active = !this.model.motionPathVisible;
                this.model.setMotionPathVisible(active);
                motionPathToggle.classList.toggle('active', active);
                window.soundEngine.playUnlockSound();
            });
        }

        const humanScaleToggle = document.getElementById('btn-human-scale');
        if (humanScaleToggle) {
            humanScaleToggle.addEventListener('click', () => {
                const active = !this.model.humanScaleVisible;
                this.model.setHumanScaleVisible(active);
                humanScaleToggle.classList.toggle('active', active);
            });
        }

        const audioToggle = document.getElementById('btn-audio');
        if (audioToggle) {
            audioToggle.addEventListener('click', () => {
                const muted = window.soundEngine.toggleMute();
                audioToggle.classList.toggle('muted', muted);
                audioToggle.textContent = muted ? '🔇 Unmute Sound' : '🔊 Mechanical Sound';
            });
        }

        // Auto Play Animation Button
        const playBtn = document.getElementById('btn-play-anim');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.togglePlayAnimation();
            });
        }

        // Presentation Slide Deck Controls
        const prevSlideBtn = document.getElementById('btn-prev-slide');
        const nextSlideBtn = document.getElementById('btn-next-slide');
        if (prevSlideBtn) prevSlideBtn.addEventListener('click', () => this.prevSlide());
        if (nextSlideBtn) nextSlideBtn.addEventListener('click', () => this.nextSlide());

        // Keyboard navigation
        window.addEventListener('keydown', (e) => {
            if (e.key === ' ' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.togglePlayAnimation();
            } else if (e.key === 'ArrowRight') {
                this.nextSlide();
            } else if (e.key === 'ArrowLeft') {
                this.prevSlide();
            } else if (e.key === 'x' || e.key === 'X') {
                if (cutawayToggle) cutawayToggle.click();
            } else if (e.key === 'm' || e.key === 'M') {
                if (motionPathToggle) motionPathToggle.click();
            }
        });
    }

    setTransformation(t) {
        this.transformProgress = t;
        this.model.updateState(this.transformProgress, this.explodeProgress);
        if (this.transformSlider) this.transformSlider.value = Math.round(t * 100);
        if (this.transformValueDisplay) this.transformValueDisplay.textContent = `${Math.round(t * 100)}%`;

        // Update active state tab
        document.querySelectorAll('[data-state]').forEach(btn => {
            btn.classList.remove('active');
        });
        if (t <= 0.05) {
            document.querySelector('[data-state="carry"]')?.classList.add('active');
        } else if (t >= 0.95) {
            document.querySelector('[data-state="work"]')?.classList.add('active');
        } else {
            document.querySelector('[data-state="deploy"]')?.classList.add('active');
        }

        this.updateExplodedLabels();
    }

    setExplosion(e) {
        this.explodeProgress = e;
        this.model.updateState(this.transformProgress, this.explodeProgress);
        if (this.explodeSlider) this.explodeSlider.value = Math.round(e * 100);
        if (this.explodeValueDisplay) this.explodeValueDisplay.textContent = `${Math.round(e * 100)}%`;
        this.updateExplodedLabels();
    }

    animateToState(stateName) {
        let targetT = 0.0;
        if (stateName === 'carry') targetT = 0.0;
        else if (stateName === 'deploy') targetT = 0.5;
        else if (stateName === 'work') targetT = 1.0;

        window.soundEngine.playUnlockSound();
        const startT = this.transformProgress;
        const startTime = performance.now();
        const duration = 1800;

        const step = (now) => {
            const elapsed = now - startTime;
            const p = Math.min(1.0, elapsed / duration);
            // Smooth easeInOutCubic
            const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            const currentT = startT + (targetT - startT) * ease;
            this.setTransformation(currentT);

            if (p < 1.0) {
                requestAnimationFrame(step);
            } else {
                if (targetT === 1.0) window.soundEngine.playLockSound();
                else if (targetT === 0.0) window.soundEngine.playLockSound();
            }
        };
        requestAnimationFrame(step);
    }

    togglePlayAnimation() {
        this.isPlayingAnimation = !this.isPlayingAnimation;
        const playBtn = document.getElementById('btn-play-anim');
        if (playBtn) {
            playBtn.textContent = this.isPlayingAnimation ? '⏸ Pause Cinematic' : '▶ Play Cinematic';
            playBtn.classList.toggle('active', this.isPlayingAnimation);
        }

        if (this.isPlayingAnimation) {
            // Reset to beginning if at end
            if (this.transformProgress >= 0.98) {
                this.setTransformation(0.0);
            }
            this.animStartTime = performance.now() - (this.transformProgress * this.animDuration);
            window.soundEngine.playUnlockSound();
        }
    }

    applyCameraPreset(preset) {
        document.querySelectorAll('[data-cam]').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-cam="${preset}"]`)?.classList.add('active');

        switch (preset) {
            case 'hero':
                this.transitionCamera([7.5, 6.2, 9.5], [0, 4.2, 0], 1400);
                break;
            case 'front':
                this.transitionCamera([0.0, 4.2, 11.5], [0, 4.2, 0], 1200);
                break;
            case 'side':
                this.transitionCamera([11.5, 4.2, 0.0], [0, 4.2, 0], 1200);
                break;
            case 'top':
                this.transitionCamera([0.0, 11.5, 3.5], [0, 5.5, 1.2], 1400);
                break;
            case 'macro':
                this.transitionCamera([2.2, 5.0, 2.5], [0.4, 4.8, 0.4], 1400);
                break;
            case 'exploded':
                this.setExplosion(0.85);
                this.transitionCamera([9.0, 8.5, 11.0], [0, 4.5, 0], 1400);
                break;
            case 'human':
                this.model.setHumanScaleVisible(true);
                document.getElementById('btn-human-scale')?.classList.add('active');
                this.transitionCamera([-6.5, 6.5, 12.0], [-1.5, 5.2, 0], 1400);
                break;
        }
    }

    transitionCamera(targetPos, targetLookAt, duration = 1200) {
        const startPos = this.camera.position.clone();
        const startLook = this.controls.target.clone();
        const endPos = new THREE.Vector3(...targetPos);
        const endLook = new THREE.Vector3(...targetLookAt);
        const startTime = performance.now();

        const anim = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1.0, elapsed / duration);
            // Smooth easeInOutQuad
            const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            this.camera.position.lerpVectors(startPos, endPos, ease);
            this.controls.target.lerpVectors(startLook, endLook, ease);
            this.controls.update();

            if (progress < 1.0) {
                requestAnimationFrame(anim);
            }
        };
        requestAnimationFrame(anim);
    }

    initHotspots() {
        this.hotspots = [
            { id: 'hs-walnut', pos: new THREE.Vector3(0, 7.35, 1.8), name: 'Walnut Worktop', desc: 'Sustainable American walnut veneer with beveled edge and milled accessory trough.' },
            { id: 'hs-linkage', pos: new THREE.Vector3(1.4, 5.0, 0), name: '4-Bar Pantograph', desc: 'CNC 6061-T6 aluminum parallel linkage arms providing frictionless elevation.' },
            { id: 'hs-strut', pos: new THREE.Vector3(0, 4.2, 0), name: '120N Gas Spring', desc: 'Hydraulic counterbalance counteracting desk weight for effortless 4.5N single-hand lift.' },
            { id: 'hs-lock', pos: new THREE.Vector3(0, 5.4, 0.4), name: 'Over-Center Lock', desc: 'Positive detent pin mechanically locking horizontal workstation with tactile feedback.' },
            { id: 'hs-shell', pos: new THREE.Vector3(0, 3.1, 0.6), name: 'Makrolon Shell', desc: 'Matte graphite impact-resistant polycarbonate with deep maroon sealing gasket.' }
        ];

        this.labelContainer = document.getElementById('labels-overlay');
    }

    updateExplodedLabels() {
        if (!this.labelContainer) return;
        const e = this.explodeProgress;

        if (e < 0.25) {
            this.labelContainer.style.opacity = '0';
            this.labelContainer.style.pointerEvents = 'none';
            return;
        }

        this.labelContainer.style.opacity = `${(e - 0.25) * 1.33}`;
        this.labelContainer.style.pointerEvents = 'auto';

        const layerData = [
            { id: 'lbl-layer1', pos: new THREE.Vector3(0, 5.5 + e * 4.2, e * 0.8), text: 'LAYER 1: Folding Walnut Work Surface & Aluminum Spine' },
            { id: 'lbl-layer2', pos: new THREE.Vector3(0, 4.2 + e * 2.8, e * 0.3), text: 'LAYER 2: 120N Gas Spring & Over-Center Lock' },
            { id: 'lbl-layer3', pos: new THREE.Vector3(1.4 + e * 1.2, 5.0 + e * 1.5, 0), text: 'LAYER 3: 4-Bar Pantograph Kinematic Linkage' },
            { id: 'lbl-layer4', pos: new THREE.Vector3(-1.8, 3.1, 0), text: 'LAYER 4: 6061-T6 Aluminum Structural Chassis Frame' },
            { id: 'lbl-layer5', pos: new THREE.Vector3(0, 3.1, e * 2.5), text: 'LAYER 5: 38L Luggage Cavity & Tech Organizer' },
            { id: 'lbl-layer6', pos: new THREE.Vector3(0, 3.1, 0.6 + e * 3.8), text: 'LAYER 6: Matte Graphite Polycarbonate Clamshell' },
            { id: 'lbl-layer7', pos: new THREE.Vector3(0, 0.45 - e * 2.4, 0), text: 'LAYER 7: Spinner Wheel Assembly & Trolley Handle' }
        ];

        layerData.forEach(item => {
            let el = document.getElementById(item.id);
            if (!el) {
                el = document.createElement('div');
                el.id = item.id;
                el.className = 'tech-callout-tag';
                el.innerHTML = `<span class="callout-dot"></span><span class="callout-text">${item.text}</span>`;
                this.labelContainer.appendChild(el);
            }

            // Project 3D coordinate to 2D screen space
            const screenPos = item.pos.clone().project(this.camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
        });
    }

    initPresentationSlides() {
        this.slides = [
            {
                number: '01 / 10',
                title: 'ONEFORM // EXECUTIVE VISION',
                subtitle: 'ONE OBJECT. ONE HAND. ONE TRANSFORMATION.',
                body: 'ONEFORM is an innovative Product Design and Innovation (PDI) concept that bridges luxury mobility with temporary personal workspaces. Instead of carrying separate furniture, ONEFORM transforms the object you already carry into an ergonomic workstation using mechanical intelligence.',
                transform: 0.0,
                explode: 0.0,
                cutaway: false,
                motionPath: false,
                camPreset: 'hero'
            },
            {
                number: '02 / 10',
                title: 'THE CORE DESIGN PROBLEM',
                subtitle: 'Traditional Inconvenience vs Unified Transformation',
                body: 'Modern remote workers and travelers often struggle with cramped airport seats, hotel beds, and unergonomic café perches. Carrying separate tables and chairs is impractical and awkward. ONEFORM solves this by concealing an ergonomic desk within a standard carry-on profile.',
                transform: 0.0,
                explode: 0.0,
                cutaway: false,
                motionPath: false,
                camPreset: 'front'
            },
            {
                number: '03 / 10',
                title: 'STATE 1 — CLOSED CARRY',
                subtitle: 'Understated Luxury Carry-On Luggage (550 x 380 x 230 mm)',
                body: 'In transit mode, the transformation mechanism is completely invisible. The exterior features impact-resistant Makrolon polycarbonate in matte graphite, deep maroon perimeter sealing, 4 silent 360° dual-caster wheels, a flush telescopic handle, and 38 liters of internal packing volume.',
                transform: 0.0,
                explode: 0.0,
                cutaway: false,
                motionPath: false,
                camPreset: 'front'
            },
            {
                number: '04 / 10',
                title: 'STATE 2 — TRANSFORMATION KINEMATICS',
                subtitle: '7-Step Coordinated Mechanical Deployment',
                body: 'Unlocking the top latch activates the 4-bar pantograph linkage. As the center handle is lifted, the work surface elevates while dual parallel arms maintain precise horizontal orientation. An auto-deploying anti-tip kickstand extends to ground the forward center of mass.',
                transform: 0.5,
                explode: 0.0,
                cutaway: false,
                motionPath: true,
                camPreset: 'side'
            },
            {
                number: '05 / 10',
                title: 'STATE 3 — PERSONAL WORKSPACE',
                subtitle: 'Ergonomic 735 mm Working Height & Bi-Fold Walnut Desk',
                body: 'At full extension, the walnut tabletop wings open to reveal a 640 x 480 mm workstation. Complete with an ultra-thin laptop deck, milled aluminum pen trough, smartphone docking slot, and coffee tumbler recess. It transforms any airport lounge into a focused office.',
                transform: 1.0,
                explode: 0.0,
                cutaway: false,
                motionPath: false,
                camPreset: 'hero'
            },
            {
                number: '06 / 10',
                title: 'ONE-HAND CONTINUOUS INTERACTION',
                subtitle: 'Mechanical Counterbalance Requires Under 4.5N Lifting Effort',
                body: 'No tools, no two-person assembly, and no screws. A 120N internal nitrogen gas-spring directly counteracts the weight of the desktop and laptop. A single traveler simply lifts the center grip in one smooth continuous motion—mechanical intelligence does the heavy lifting.',
                transform: 0.75,
                explode: 0.0,
                cutaway: false,
                motionPath: true,
                camPreset: 'side'
            },
            {
                number: '07 / 10',
                title: 'MECHANICAL ARCHITECTURE',
                subtitle: '7-Layer Disassembly & Modular Engineering',
                body: 'Clean separation of functional layers: 1. Folding Walnut Top; 2. Gas Spring & Over-Center Toggle Lock; 3. 4-Bar CNC Linkage; 4. 6061-T6 Aluminum Structural Chassis; 5. 38L Luggage Cavity; 6. Polycarbonate Shell; 7. Spinner Wheels & Trolley Handle.',
                transform: 0.0,
                explode: 0.85,
                cutaway: false,
                motionPath: false,
                camPreset: 'exploded'
            },
            {
                number: '08 / 10',
                title: 'CUTAWAY VIEW // INTERNAL RIGOR',
                subtitle: 'Zero Science-Fiction: Pure Mechanical Plausibility',
                body: 'Viewing the internal chassis reveals how the folded scissor linkages nest neatly around the luggage packing envelope without sacrificing essential storage space. Every hinge and pivot bolt is sized for standard DIN/ISO industrial fasteners.',
                transform: 0.45,
                explode: 0.0,
                cutaway: true,
                motionPath: false,
                camPreset: 'hero'
            },
            {
                number: '09 / 10',
                title: 'BEFORE / AFTER VALUE PROPOSITION',
                subtitle: 'Streamlined Transit vs Clumsy Multi-Piece Baggage',
                body: 'Traditional approach: Travel case + folding table + portable stool + separate shoulder bags. ONEFORM approach: One unified carry-on piece that seamlessly transitions from gate check to departure lounge workstation in 5 seconds.',
                transform: 1.0,
                explode: 0.0,
                cutaway: false,
                motionPath: false,
                camPreset: 'hero'
            },
            {
                number: '10 / 10',
                title: 'CMF PALETTE & FEASIBILITY',
                subtitle: 'Matte Graphite, Dark Brushed Metal, Walnut & Maroon',
                body: 'Manufacturable using high-pressure injection molded polycarbonate shells, CNC-machined 6061-T6 linkage arms, laser-cut sustainably harvested walnut veneer, and sealed ball-bearing casters. Designed to look timeless 3-5 years into the future.',
                transform: 1.0,
                explode: 0.0,
                cutaway: false,
                motionPath: false,
                camPreset: 'macro'
            }
        ];

        this.currentSlideIdx = 0;
        this.renderSlide(0);
    }

    renderSlide(idx) {
        if (idx < 0) idx = 0;
        if (idx >= this.slides.length) idx = this.slides.length - 1;
        this.currentSlideIdx = idx;

        const slide = this.slides[idx];

        document.getElementById('slide-num').textContent = slide.number;
        document.getElementById('slide-title').textContent = slide.title;
        document.getElementById('slide-subtitle').textContent = slide.subtitle;
        document.getElementById('slide-body').textContent = slide.body;

        // Drive 3D model according to slide requirements
        this.setTransformation(slide.transform);
        this.setExplosion(slide.explode);
        this.model.setCutaway(slide.cutaway);
        document.getElementById('btn-cutaway')?.classList.toggle('active', slide.cutaway);

        this.model.setMotionPathVisible(slide.motionPath);
        document.getElementById('btn-motion-path')?.classList.toggle('active', slide.motionPath);

        this.applyCameraPreset(slide.camPreset);

        // Update progress bar
        const progressPercent = ((idx + 1) / this.slides.length) * 100;
        document.getElementById('slide-progress-bar').style.width = `${progressPercent}%`;
    }

    nextSlide() {
        if (this.currentSlideIdx < this.slides.length - 1) {
            this.renderSlide(this.currentSlideIdx + 1);
            window.soundEngine.playUnlockSound();
        }
    }

    prevSlide() {
        if (this.currentSlideIdx > 0) {
            this.renderSlide(this.currentSlideIdx - 1);
            window.soundEngine.playUnlockSound();
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Handle cinematic auto-play transformation
        if (this.isPlayingAnimation) {
            const elapsed = performance.now() - this.animStartTime;
            let p = elapsed / this.animDuration;
            if (p >= 1.0) {
                p = 1.0;
                this.isPlayingAnimation = false;
                const playBtn = document.getElementById('btn-play-anim');
                if (playBtn) {
                    playBtn.textContent = '▶ Play Cinematic';
                    playBtn.classList.remove('active');
                }
                window.soundEngine.playLockSound();
            }

            // Smooth mechanical ease
            const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            this.setTransformation(ease);
        }

        // Animate motion path dash offset for flowing energy visualization
        if (this.model && this.model.pathMaterial && this.model.motionPathVisible) {
            this.model.pathMaterial.dashOffset -= 0.008;
        }

        this.controls.update();
        this.updateExplodedLabels();
        this.renderer.render(this.scene, this.camera);
    }
}

// Gallery Lightbox Modal Handler
window.openGalleryModal = function(imageSrc, title, description) {
    const modal = document.getElementById('gallery-modal');
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');

    if (modal && modalImg) {
        modalImg.src = imageSrc;
        modalTitle.textContent = title;
        modalDesc.textContent = description;
        modal.classList.add('visible');
    }
};

window.closeGalleryModal = function() {
    const modal = document.getElementById('gallery-modal');
    if (modal) modal.classList.remove('visible');
};

window.addEventListener('DOMContentLoaded', () => {
    window.app = new OneFormApp();
});
