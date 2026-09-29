// ONEFORM — 3D Mechanical Assembly & Kinematics Engine
// Physically Based Procedural CAD-Level Model Built with Three.js

class OneFormModel {
    constructor(scene) {
        this.scene = scene;
        this.root = new THREE.Group();
        this.root.name = "ONEFORM_ROOT";
        this.scene.add(this.root);

        // Transformation state: 0 = Carry, 1 = Deployed Workstation
        this.transformProgress = 0.0;
        // Exploded view state: 0 = Assembled, 1 = Exploded
        this.explodeProgress = 0.0;
        // Mode flags
        this.cutawayActive = false;
        this.motionPathVisible = false;
        this.humanScaleVisible = false;
        this.dimensionsVisible = false;

        // Sub-assemblies for kinematics and exploded layers
        this.layers = {};
        this.kinematicNodes = {};

        this.initTexturesAndMaterials();
        this.buildAssembly();
        this.buildVisualAids();
        this.updateState(0.0, 0.0);
    }

    initTexturesAndMaterials() {
        // 1. Procedural Walnut Wood Texture (High-res dark warm walnut grain)
        const woodCanvas = document.createElement('canvas');
        woodCanvas.width = 1024;
        woodCanvas.height = 1024;
        const ctx = woodCanvas.getContext('2d');

        // Base warm walnut gradient
        const grad = ctx.createLinearGradient(0, 0, 1024, 0);
        grad.addColorStop(0, '#3A2417');
        grad.addColorStop(0.3, '#4A2F1E');
        grad.addColorStop(0.6, '#382215');
        grad.addColorStop(1, '#442A1A');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 1024);

        // Add fine organic woodgrain rings & fibers
        for (let i = 0; i < 240; i++) {
            const x = Math.random() * 1024;
            ctx.beginPath();
            ctx.strokeStyle = (i % 3 === 0) ? 'rgba(30, 18, 10, 0.28)' : 'rgba(85, 54, 34, 0.22)';
            ctx.lineWidth = 1 + Math.random() * 3.5;
            ctx.moveTo(x, 0);
            const cp1x = x + (Math.random() - 0.5) * 80;
            const cp2x = x + (Math.random() - 0.5) * 80;
            ctx.bezierCurveTo(cp1x, 340, cp2x, 680, x + (Math.random() - 0.5) * 40, 1024);
            ctx.stroke();
        }

        // Add micro pores
        ctx.fillStyle = 'rgba(25, 14, 8, 0.15)';
        for (let j = 0; j < 3000; j++) {
            ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 1.5, 3 + Math.random() * 4);
        }

        this.walnutTexture = new THREE.CanvasTexture(woodCanvas);
        this.walnutTexture.wrapS = THREE.RepeatWrapping;
        this.walnutTexture.wrapT = THREE.RepeatWrapping;
        this.walnutTexture.repeat.set(1.5, 1.5);

        // 2. Procedural Laptop Screen Display (Minimalist IDE / CAD blueprint)
        const screenCanvas = document.createElement('canvas');
        screenCanvas.width = 1024;
        screenCanvas.height = 640;
        const sCtx = screenCanvas.getContext('2d');
        sCtx.fillStyle = '#0F1216';
        sCtx.fillRect(0, 0, 1024, 640);

        // Subtle header bar
        sCtx.fillStyle = '#171B21';
        sCtx.fillRect(0, 0, 1024, 42);
        sCtx.fillStyle = '#7A252D';
        sCtx.beginPath();
        sCtx.arc(28, 21, 6, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.fillStyle = '#4A505A';
        sCtx.beginPath();
        sCtx.arc(48, 21, 6, 0, Math.PI * 2);
        sCtx.arc(68, 21, 6, 0, Math.PI * 2);
        sCtx.fill();

        // Screen text / CAD vector
        sCtx.fillStyle = '#6E7681';
        sCtx.font = 'bold 16px "SF Mono", monospace';
        sCtx.fillText('ONEFORM // KINEMATIC SIMULATION v2.4 — FOUR-BAR PANTOGRAPH', 100, 26);

        // Wireframe CAD diagram on screen
        sCtx.strokeStyle = 'rgba(122, 37, 45, 0.7)';
        sCtx.lineWidth = 2;
        sCtx.strokeRect(60, 80, 420, 480);
        sCtx.beginPath();
        sCtx.moveTo(60, 560);
        sCtx.lineTo(260, 200);
        sCtx.lineTo(480, 200);
        sCtx.lineTo(280, 560);
        sCtx.closePath();
        sCtx.stroke();

        sCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        sCtx.beginPath();
        sCtx.arc(260, 200, 8, 0, Math.PI * 2);
        sCtx.arc(480, 200, 8, 0, Math.PI * 2);
        sCtx.arc(60, 560, 8, 0, Math.PI * 2);
        sCtx.arc(280, 560, 8, 0, Math.PI * 2);
        sCtx.stroke();

        // Technical specs column on right
        sCtx.fillStyle = '#C9D1D9';
        sCtx.font = '14px "SF Mono", monospace';
        sCtx.fillText('STATUS: LOCKED HORIZONTAL', 520, 110);
        sCtx.fillStyle = '#8B949E';
        sCtx.fillText('• 120N Gas Spring Counterbalance', 520, 140);
        sCtx.fillText('• Four-Bar Parallelism: 0.02° tol', 520, 170);
        sCtx.fillText('• Max Edge Load Rating: 40 kg', 520, 200);
        sCtx.fillText('• Worktop Elevation: 735 mm', 520, 230);
        sCtx.fillText('• Luggage Storage Volume: 38 L', 520, 260);

        this.screenTexture = new THREE.CanvasTexture(screenCanvas);

        // Core PBR Materials
        this.materials = {
            // Matte graphite polycarbonate luggage shell
            shell: new THREE.MeshStandardMaterial({
                color: 0x1E2125,
                roughness: 0.48,
                metalness: 0.12,
                bumpScale: 0.005
            }),
            // Subtle deep maroon accent trim gasket
            accent: new THREE.MeshStandardMaterial({
                color: 0x7E242C,
                roughness: 0.35,
                metalness: 0.2
            }),
            // Restrained burnt orange highlight
            accentOrange: new THREE.MeshStandardMaterial({
                color: 0xA64828,
                roughness: 0.35,
                metalness: 0.3
            }),
            // Dark brushed aircraft metal for 4-bar linkage & pivots
            linkage: new THREE.MeshStandardMaterial({
                color: 0x363A42,
                roughness: 0.28,
                metalness: 0.85
            }),
            // Anodized aluminum (telescopic tubes, latches, edge trims)
            aluminum: new THREE.MeshStandardMaterial({
                color: 0xBFC4CB,
                roughness: 0.22,
                metalness: 0.88
            }),
            // Chrome polished piston rod
            chrome: new THREE.MeshStandardMaterial({
                color: 0xF2F4F7,
                roughness: 0.08,
                metalness: 0.98
            }),
            // Rich American Black Walnut wood surface
            walnut: new THREE.MeshStandardMaterial({
                map: this.walnutTexture,
                roughness: 0.38,
                metalness: 0.04
            }),
            // Matte black rubber (wheels, feet, grip pads)
            rubber: new THREE.MeshStandardMaterial({
                color: 0x121315,
                roughness: 0.88,
                metalness: 0.02
            }),
            // Dark fabric/ballistic nylon storage organizer
            storageFabric: new THREE.MeshStandardMaterial({
                color: 0x1C1F24,
                roughness: 0.92,
                metalness: 0.05
            }),
            // Space gray laptop body
            laptopBody: new THREE.MeshStandardMaterial({
                color: 0x2A2E34,
                roughness: 0.25,
                metalness: 0.82
            }),
            // Laptop screen display
            laptopScreen: new THREE.MeshBasicMaterial({
                map: this.screenTexture
            }),
            // Ceramic / matte tumbler
            tumbler: new THREE.MeshStandardMaterial({
                color: 0x181A1D,
                roughness: 0.35,
                metalness: 0.2
            }),
            // Sketchbook
            notebook: new THREE.MeshStandardMaterial({
                color: 0x24282D,
                roughness: 0.75,
                metalness: 0.05
            }),
            // Transparent X-Ray smoky polycarbonate for cutaway mode
            cutawayShell: new THREE.MeshPhysicalMaterial({
                color: 0x2A303A,
                transmission: 0.88,
                opacity: 0.28,
                transparent: true,
                roughness: 0.18,
                metalness: 0.1,
                ior: 1.52,
                thickness: 0.5,
                depthWrite: false
            })
        };
    }

    buildAssembly() {
        // -------------------------------------------------------------
        // LAYER 7: WHEELS & BASE / RETRACTABLE TROLLEY HANDLE
        // -------------------------------------------------------------
        const layer7 = new THREE.Group();
        layer7.name = "LAYER_7_WHEELS_HANDLE";
        this.layers.wheelsAndHandle = layer7;
        this.root.add(layer7);

        // 4x High-precision dual-caster spinner wheels
        const wheelPositions = [
            [-1.5, 0.45, -0.85],
            [1.5, 0.45, -0.85],
            [-1.5, 0.45, 0.85],
            [1.5, 0.45, 0.85]
        ];

        this.wheelMeshes = [];
        wheelPositions.forEach((pos, idx) => {
            const wheelUnit = new THREE.Group();
            wheelUnit.position.set(pos[0], pos[1], pos[2]);

            // Caster fork bracket
            const forkGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.4, 16);
            const fork = new THREE.Mesh(forkGeo, this.materials.linkage);
            fork.position.y = 0.2;
            wheelUnit.add(fork);

            // Dual tires
            const tireGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.16, 24);
            tireGeo.rotateZ(Math.PI / 2);
            
            const tireL = new THREE.Mesh(tireGeo, this.materials.rubber);
            tireL.position.x = -0.12;
            tireL.castShadow = true;
            wheelUnit.add(tireL);

            const tireR = new THREE.Mesh(tireGeo, this.materials.rubber);
            tireR.position.x = 0.12;
            tireR.castShadow = true;
            wheelUnit.add(tireR);

            // Brushed aluminum wheel hubcaps
            const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.28, 16);
            hubGeo.rotateZ(Math.PI / 2);
            const hub = new THREE.Mesh(hubGeo, this.materials.aluminum);
            wheelUnit.add(hub);

            layer7.add(wheelUnit);
            this.wheelMeshes.push(wheelUnit);
        });

        // Telescopic Trolley Handle Assembly (Retractable)
        this.trolleyHandleGroup = new THREE.Group();
        this.trolleyHandleGroup.position.set(0, 5.2, -0.92);

        // Outer stationary guide sleeves inside luggage
        const sleeveGeo = new THREE.CylinderGeometry(0.09, 0.09, 4.6, 16);
        const sleeveL = new THREE.Mesh(sleeveGeo, this.materials.linkage);
        sleeveL.position.set(-1.0, -2.1, 0);
        this.trolleyHandleGroup.add(sleeveL);

        const sleeveR = new THREE.Mesh(sleeveGeo, this.materials.linkage);
        sleeveR.position.set(1.0, -2.1, 0);
        this.trolleyHandleGroup.add(sleeveR);

        // Moving telescopic tube rods
        this.trolleyRods = new THREE.Group();
        const tubeGeo = new THREE.CylinderGeometry(0.075, 0.075, 3.8, 16);
        const tubeL = new THREE.Mesh(tubeGeo, this.materials.aluminum);
        tubeL.position.set(-1.0, 1.8, 0);
        this.trolleyRods.add(tubeL);

        const tubeR = new THREE.Mesh(tubeGeo, this.materials.aluminum);
        tubeR.position.set(1.0, 1.8, 0);
        this.trolleyRods.add(tubeR);

        // Ergonomic handle crossbar
        const barGeo = new THREE.BoxGeometry(2.3, 0.25, 0.35);
        const handleBar = new THREE.Mesh(barGeo, this.materials.rubber);
        handleBar.position.set(0, 3.6, 0);
        this.trolleyRods.add(handleBar);

        // Soft-touch release button
        const btnGeo = new THREE.BoxGeometry(0.6, 0.12, 0.18);
        const handleBtn = new THREE.Mesh(btnGeo, this.materials.accent);
        handleBtn.position.set(0, 3.72, 0);
        this.trolleyRods.add(handleBtn);

        this.trolleyHandleGroup.add(this.trolleyRods);
        layer7.add(this.trolleyHandleGroup);

        // -------------------------------------------------------------
        // LAYER 6: OUTER LUGGAGE SHELL (MATTE GRAPHITE POLYCARBONATE)
        // -------------------------------------------------------------
        const layer6 = new THREE.Group();
        layer6.name = "LAYER_6_OUTER_SHELL";
        this.layers.outerShell = layer6;
        this.root.add(layer6);

        // Dimensions of luggage shell: 3.8 W x 2.3 D x 5.0 H (dm) -> 38 x 23 x 50 cm
        this.shellMeshes = [];

        // Front half shell (displaces +Z when exploded)
        this.frontShell = new THREE.Group();
        const frontBodyGeo = this.createRoundedBeveledBox(3.7, 4.6, 1.1, 0.25);
        const frontBody = new THREE.Mesh(frontBodyGeo, this.materials.shell);
        frontBody.position.set(0, 3.1, 0.55);
        frontBody.castShadow = true;
        frontBody.receiveShadow = true;
        this.frontShell.add(frontBody);
        this.shellMeshes.push(frontBody);

        // Front structural aerodynamic recessed styling grooves
        const grooveGeo = new THREE.BoxGeometry(2.6, 3.6, 0.08);
        const groove = new THREE.Mesh(grooveGeo, this.materials.shell);
        groove.position.set(0, 3.1, 1.12);
        this.frontShell.add(groove);

        // ONEFORM debossed logo plate on front
        const badgeGeo = new THREE.BoxGeometry(1.0, 0.22, 0.04);
        const badge = new THREE.Mesh(badgeGeo, this.materials.linkage);
        badge.position.set(0, 3.8, 1.16);
        this.frontShell.add(badge);

        layer6.add(this.frontShell);

        // Rear half shell (displaces -Z when exploded)
        this.rearShell = new THREE.Group();
        const rearBodyGeo = this.createRoundedBeveledBox(3.7, 4.6, 1.1, 0.25);
        const rearBody = new THREE.Mesh(rearBodyGeo, this.materials.shell);
        rearBody.position.set(0, 3.1, -0.55);
        rearBody.castShadow = true;
        rearBody.receiveShadow = true;
        this.rearShell.add(rearBody);
        this.shellMeshes.push(rearBody);

        // Recessed top carrying handle (for hand carry)
        const topGripGeo = new THREE.BoxGeometry(1.6, 0.2, 0.3);
        const topGrip = new THREE.Mesh(topGripGeo, this.materials.rubber);
        topGrip.position.set(0, 5.5, 0);
        layer6.add(topGrip);

        // Perimeter Deep Maroon Accent Seal Gasket
        const gasketGeo = new THREE.BoxGeometry(3.76, 4.66, 0.08);
        const gasket = new THREE.Mesh(gasketGeo, this.materials.accent);
        gasket.position.set(0, 3.1, 0);
        layer6.add(gasket);

        // Precision Side Latches (CNC Aluminum with TSA dials)
        const latchGeo = new THREE.BoxGeometry(0.25, 0.6, 0.4);
        const latchL1 = new THREE.Mesh(latchGeo, this.materials.aluminum);
        latchL1.position.set(-1.88, 4.1, 0);
        layer6.add(latchL1);

        const latchL2 = new THREE.Mesh(latchGeo, this.materials.aluminum);
        latchL2.position.set(-1.88, 2.1, 0);
        layer6.add(latchL2);

        layer6.add(this.rearShell);

        // -------------------------------------------------------------
        // LAYER 5: STORAGE COMPARTMENT & TECH ORGANIZER CORE
        // -------------------------------------------------------------
        const layer5 = new THREE.Group();
        layer5.name = "LAYER_5_STORAGE_CORE";
        this.layers.storage = layer5;
        this.root.add(layer5);

        // Internal 38-Liter Luggage Cavity Liner
        const cavityGeo = new THREE.BoxGeometry(3.3, 4.2, 1.8);
        const cavity = new THREE.Mesh(cavityGeo, this.materials.storageFabric);
        cavity.position.set(0, 3.1, 0);
        layer5.add(cavity);

        // Internal Tech Organizer Sleeves & Cable Pouches
        const sleeveMeshGeo = new THREE.BoxGeometry(3.1, 1.4, 0.12);
        const sleeveMesh = new THREE.Mesh(sleeveMeshGeo, this.materials.rubber);
        sleeveMesh.position.set(0, 2.4, 0.8);
        layer5.add(sleeveMesh);

        // -------------------------------------------------------------
        // LAYER 4: INTERNAL 6061-T6 ALUMINUM STRUCTURAL SKELETON
        // -------------------------------------------------------------
        const layer4 = new THREE.Group();
        layer4.name = "LAYER_4_INTERNAL_FRAME";
        this.layers.frame = layer4;
        this.root.add(layer4);

        // Rigid perimeter skeletal ribbing
        const frameColGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.5, 12);
        const frameL = new THREE.Mesh(frameColGeo, this.materials.aluminum);
        frameL.position.set(-1.65, 3.1, 0);
        layer4.add(frameL);

        const frameR = new THREE.Mesh(frameColGeo, this.materials.aluminum);
        frameR.position.set(1.65, 3.1, 0);
        layer4.add(frameR);

        // Lower transverse crossbar
        const crossbarGeo = new THREE.BoxGeometry(3.3, 0.25, 0.25);
        const crossbarLower = new THREE.Mesh(crossbarGeo, this.materials.aluminum);
        crossbarLower.position.set(0, 1.1, 0);
        layer4.add(crossbarLower);

        // Upper kinematic mount crossbar (houses lower linkage pivot bearings)
        const crossbarUpper = new THREE.Mesh(crossbarGeo, this.materials.aluminum);
        crossbarUpper.position.set(0, 5.0, 0);
        layer4.add(crossbarUpper);

        // Deployable Anti-Tip Stabilizer Outrigger Kickstand
        this.stabilizerFoot = new THREE.Group();
        this.stabilizerFoot.position.set(0, 0.5, 0.95);
        const footGeo = new THREE.BoxGeometry(3.4, 0.18, 0.35);
        const footMesh = new THREE.Mesh(footGeo, this.materials.rubber);
        this.stabilizerFoot.add(footMesh);

        const footArmGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
        footArmGeo.rotateX(Math.PI / 4);
        const footArmL = new THREE.Mesh(footArmGeo, this.materials.aluminum);
        footArmL.position.set(-1.4, 0.4, -0.4);
        this.stabilizerFoot.add(footArmL);

        const footArmR = new THREE.Mesh(footArmGeo, this.materials.aluminum);
        footArmR.position.set(1.4, 0.4, -0.4);
        this.stabilizerFoot.add(footArmR);

        layer4.add(this.stabilizerFoot);

        // -------------------------------------------------------------
        // LAYER 3: 4-BAR PANTOGRAPH KINEMATIC ELEVATION LINKAGE
        // -------------------------------------------------------------
        const layer3 = new THREE.Group();
        layer3.name = "LAYER_3_LINKAGE_SYSTEM";
        this.layers.linkage = layer3;
        this.root.add(layer3);

        // Linkage assembly is split into stationary pivot base and moving arms
        this.linkageArmsGroup = new THREE.Group();
        this.linkageArmsGroup.position.set(0, 5.0, 0); // Upper pivot anchor point

        // Kinematic arms: Left & Right pairs of parallel CNC 6061-T6 arms
        // Arm length L = 2.8 dm (280mm)
        const armLength = 2.8;
        const armGeo = new THREE.BoxGeometry(0.18, armLength, 0.12);
        
        // Pivot bolts (brushed aluminum caps)
        const boltGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.24, 16);
        boltGeo.rotateZ(Math.PI / 2);

        // Left primary driving arm
        this.armL1 = new THREE.Group();
        this.armL1.position.set(-1.4, 0, 0.1);
        const armL1Mesh = new THREE.Mesh(armGeo, this.materials.linkage);
        armL1Mesh.position.set(0, armLength / 2, 0);
        this.armL1.add(armL1Mesh);
        const boltL1 = new THREE.Mesh(boltGeo, this.materials.aluminum);
        this.armL1.add(boltL1);
        this.linkageArmsGroup.add(this.armL1);

        // Left parallel follower arm
        this.armL2 = new THREE.Group();
        this.armL2.position.set(-1.4, 0, -0.25);
        const armL2Mesh = new THREE.Mesh(armGeo, this.materials.linkage);
        armL2Mesh.position.set(0, armLength / 2, 0);
        this.armL2.add(armL2Mesh);
        const boltL2 = new THREE.Mesh(boltGeo, this.materials.aluminum);
        this.armL2.add(boltL2);
        this.linkageArmsGroup.add(this.armL2);

        // Right primary driving arm
        this.armR1 = new THREE.Group();
        this.armR1.position.set(1.4, 0, 0.1);
        const armR1Mesh = new THREE.Mesh(armGeo, this.materials.linkage);
        armR1Mesh.position.set(0, armLength / 2, 0);
        this.armR1.add(armR1Mesh);
        const boltR1 = new THREE.Mesh(boltGeo, this.materials.aluminum);
        this.armR1.add(boltR1);
        this.linkageArmsGroup.add(this.armR1);

        // Right parallel follower arm
        this.armR2 = new THREE.Group();
        this.armR2.position.set(1.4, 0, -0.25);
        const armR2Mesh = new THREE.Mesh(armGeo, this.materials.linkage);
        armR2Mesh.position.set(0, armLength / 2, 0);
        this.armR2.add(armR2Mesh);
        const boltR2 = new THREE.Mesh(boltGeo, this.materials.aluminum);
        this.armR2.add(boltR2);
        this.linkageArmsGroup.add(this.armR2);

        // Central synchronized transverse torque shaft
        const torqueShaftGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.9, 16);
        torqueShaftGeo.rotateZ(Math.PI / 2);
        const torqueShaft = new THREE.Mesh(torqueShaftGeo, this.materials.aluminum);
        this.linkageArmsGroup.add(torqueShaft);

        layer3.add(this.linkageArmsGroup);

        // -------------------------------------------------------------
        // LAYER 2: 120N GAS SPRING COUNTERBALANCE & OVER-CENTER LOCK
        // -------------------------------------------------------------
        const layer2 = new THREE.Group();
        layer2.name = "LAYER_2_GAS_SPRING_LOCK";
        this.layers.gasSpringAndLock = layer2;
        this.root.add(layer2);

        // Center Gas-Spring Cylinder (Stationary body attached to luggage frame)
        this.gasStrutGroup = new THREE.Group();
        this.gasStrutGroup.position.set(0, 3.8, 0);

        const cylinderGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.2, 20);
        const cylinderMesh = new THREE.Mesh(cylinderGeo, this.materials.linkage);
        cylinderMesh.position.y = -0.6;
        this.gasStrutGroup.add(cylinderMesh);

        // Moving Chrome Piston Shaft that telescopes smoothly upward
        this.pistonShaft = new THREE.Group();
        const pistonGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.8, 20);
        const pistonMesh = new THREE.Mesh(pistonGeo, this.materials.chrome);
        pistonMesh.position.y = 0.9;
        this.pistonShaft.add(pistonMesh);

        // Nitrogen warning / technical label ring
        const labelRingGeo = new THREE.CylinderGeometry(0.205, 0.205, 0.25, 20);
        const labelRing = new THREE.Mesh(labelRingGeo, this.materials.accent);
        labelRing.position.y = 0.3;
        this.gasStrutGroup.add(labelRing);

        this.gasStrutGroup.add(this.pistonShaft);
        layer2.add(this.gasStrutGroup);

        // Over-Center Mechanical Toggle Lock Latch
        this.lockMechanism = new THREE.Group();
        this.lockMechanism.position.set(0, 5.4, 0.4);
        const lockPinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16);
        lockPinGeo.rotateZ(Math.PI / 2);
        this.lockPin = new THREE.Mesh(lockPinGeo, this.materials.aluminum);
        this.lockMechanism.add(this.lockPin);

        const lockHousingGeo = new THREE.BoxGeometry(0.7, 0.3, 0.35);
        const lockHousing = new THREE.Mesh(lockHousingGeo, this.materials.linkage);
        this.lockMechanism.add(lockHousing);

        layer2.add(this.lockMechanism);

        // -------------------------------------------------------------
        // LAYER 1: FOLDING WALNUT WORK SURFACE & ATTACHED WORKSTATION
        // -------------------------------------------------------------
        const layer1 = new THREE.Group();
        layer1.name = "LAYER_1_WORK_SURFACE";
        this.layers.workSurface = layer1;
        this.root.add(layer1);

        // The Tabletop Carrier Base that attaches to top pivot points of linkage
        this.tableAssembly = new THREE.Group();
        this.tableAssembly.position.set(0, 5.5, 0); // Initial closed position

        // 1. Primary Walnut Desk Leaf (3.8 W x 2.4 D x 0.2 H dm)
        this.primaryDesk = new THREE.Group();
        const deskGeo = this.createRoundedBeveledBox(3.8, 0.18, 2.3, 0.1);
        const deskMesh = new THREE.Mesh(deskGeo, this.materials.walnut);
        deskMesh.castShadow = true;
        deskMesh.receiveShadow = true;
        this.primaryDesk.add(deskMesh);

        // Recessed Milled Aluminum Pen Trough on front edge
        const penTroughGeo = new THREE.BoxGeometry(2.4, 0.04, 0.22);
        const penTrough = new THREE.Mesh(penTroughGeo, this.materials.aluminum);
        penTrough.position.set(0, 0.08, 0.85);
        this.primaryDesk.add(penTrough);

        // Machined Smartphone / Tablet Docking Groove
        const phoneGrooveGeo = new THREE.BoxGeometry(1.2, 0.06, 0.14);
        const phoneGroove = new THREE.Mesh(phoneGrooveGeo, this.materials.aluminum);
        phoneGroove.position.set(1.1, 0.08, -0.65);
        this.primaryDesk.add(phoneGroove);

        // ONEFORM debossed signature mark on edge
        const logoBadgeGeo = new THREE.BoxGeometry(0.7, 0.02, 0.15);
        const logoBadge = new THREE.Mesh(logoBadgeGeo, this.materials.linkage);
        logoBadge.position.set(1.2, 0.09, 0.95);
        this.primaryDesk.add(logoBadge);

        this.tableAssembly.add(this.primaryDesk);

        // 2. Folding Extension Leaf (unfolds 180 degrees via piano hinge)
        // Secondary wing doubles desk depth from 23cm to 46cm when unfolded!
        this.foldingLeaf = new THREE.Group();
        this.foldingLeaf.position.set(0, 0, 1.15); // Hinge line at front edge

        const leafGeo = this.createRoundedBeveledBox(3.8, 0.18, 2.1, 0.1);
        const leafMesh = new THREE.Mesh(leafGeo, this.materials.walnut);
        leafMesh.position.set(0, 0, 1.05);
        leafMesh.castShadow = true;
        leafMesh.receiveShadow = true;
        this.foldingLeaf.add(leafMesh);

        // Concealed aluminum piano hinge barrel
        const hingeGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.8, 16);
        hingeGeo.rotateZ(Math.PI / 2);
        const hingeMesh = new THREE.Mesh(hingeGeo, this.materials.aluminum);
        this.foldingLeaf.add(hingeMesh);

        this.tableAssembly.add(this.foldingLeaf);

        // 3. Workstation Accessories (Laptop, Tumbler, Notebook, Phone)
        this.accessoriesGroup = new THREE.Group();
        this.accessoriesGroup.position.set(0, 0.1, 0);

        // Minimalist Ultra-Thin 14" Laptop
        this.laptop = new THREE.Group();
        this.laptop.position.set(-0.25, 0, 0.2);

        // Laptop base deck
        const lapBaseGeo = new THREE.BoxGeometry(2.4, 0.08, 1.6);
        const lapBase = new THREE.Mesh(lapBaseGeo, this.materials.laptopBody);
        lapBase.castShadow = true;
        this.laptop.add(lapBase);

        // Keyboard trackpad recessed area
        const keyGeo = new THREE.BoxGeometry(2.1, 0.02, 0.85);
        const keyboard = new THREE.Mesh(keyGeo, this.materials.rubber);
        keyboard.position.set(0, 0.045, -0.15);
        this.laptop.add(keyboard);

        // Laptop display lid (rotates open 115 degrees during deployment)
        this.laptopLid = new THREE.Group();
        this.laptopLid.position.set(0, 0.04, -0.8);

        const lidGeo = new THREE.BoxGeometry(2.4, 0.06, 1.55);
        lidGeo.rotateX(Math.PI / 2);
        lidGeo.translate(0, 0.775, 0);
        const lidMesh = new THREE.Mesh(lidGeo, this.materials.laptopBody);
        lidMesh.castShadow = true;
        this.laptopLid.add(lidMesh);

        // Screen bezel & display canvas
        const screenGeo = new THREE.PlaneGeometry(2.25, 1.4);
        screenGeo.translate(0, 0.775, 0.035);
        const screenMesh = new THREE.Mesh(screenGeo, this.materials.laptopScreen);
        this.laptopLid.add(screenMesh);

        this.laptop.add(this.laptopLid);
        this.accessoriesGroup.add(this.laptop);

        // Thermal Travel Tumbler
        const tumblerGeo = new THREE.CylinderGeometry(0.32, 0.26, 1.2, 24);
        const tumblerMesh = new THREE.Mesh(tumblerGeo, this.materials.tumbler);
        tumblerMesh.position.set(-1.4, 0.6, -0.5);
        tumblerMesh.castShadow = true;
        this.accessoriesGroup.add(tumblerMesh);

        const lidCapGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.15, 24);
        const lidCap = new THREE.Mesh(lidCapGeo, this.materials.linkage);
        lidCap.position.set(-1.4, 1.22, -0.5);
        this.accessoriesGroup.add(lidCap);

        // Dotted Grid Sketchbook with fountain pen
        const bookGeo = new THREE.BoxGeometry(1.1, 0.1, 1.5);
        const bookMesh = new THREE.Mesh(bookGeo, this.materials.notebook);
        bookMesh.position.set(1.3, 0.05, 0.3);
        bookMesh.rotation.y = -0.1;
        bookMesh.castShadow = true;
        this.accessoriesGroup.add(bookMesh);

        const penGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 12);
        penGeo.rotateZ(Math.PI / 2);
        const penMesh = new THREE.Mesh(penGeo, this.materials.aluminum);
        penMesh.position.set(1.3, 0.12, 0.3);
        penMesh.rotation.y = -0.15;
        this.accessoriesGroup.add(penMesh);

        // Smartphone in docking slot
        const phoneGeo = new THREE.BoxGeometry(0.7, 1.2, 0.08);
        const phoneMesh = new THREE.Mesh(phoneGeo, this.materials.linkage);
        phoneMesh.position.set(1.1, 0.5, -0.65);
        phoneMesh.rotation.x = -0.2;
        this.accessoriesGroup.add(phoneMesh);

        this.tableAssembly.add(this.accessoriesGroup);
        layer1.add(this.tableAssembly);
    }

    // Helper: Rounded beveled box geometry
    createRoundedBeveledBox(width, height, depth, radius) {
        const shape = new THREE.Shape();
        const eps = 0.00001;
        const w = width / 2;
        const d = depth / 2;
        const r = Math.min(radius, w, d);

        shape.moveTo(-w + r, -d);
        shape.lineTo(w - r, -d);
        shape.quadraticCurveTo(w, -d, w, -d + r);
        shape.lineTo(w, d - r);
        shape.quadraticCurveTo(w, d, w - r, d);
        shape.lineTo(-w + r, d);
        shape.quadraticCurveTo(-w, d, -w, d - r);
        shape.lineTo(-w, -d + r);
        shape.quadraticCurveTo(-w, -d, -w + r, -d);

        const extrudeSettings = {
            depth: height,
            bevelEnabled: true,
            bevelSegments: 4,
            steps: 1,
            bevelSize: r * 0.4,
            bevelThickness: r * 0.4
        };

        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geom.rotateX(Math.PI / 2);
        geom.translate(0, -height / 2, 0);
        return geom;
    }

    buildVisualAids() {
        this.visualAidsGroup = new THREE.Group();
        this.visualAidsGroup.name = "VISUAL_AIDS";
        this.root.add(this.visualAidsGroup);

        // 1. One-Hand Guided Mechanical Motion Path (Bézier arc curve)
        const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(0, 5.5, 0),
            new THREE.Vector3(0, 6.8, 0.8),
            new THREE.Vector3(0, 7.8, 1.6),
            new THREE.Vector3(0, 7.35, 1.8)
        );
        const points = curve.getPoints(60);
        const pathGeo = new THREE.BufferGeometry().setFromPoints(points);

        this.pathMaterial = new THREE.LineDashedMaterial({
            color: 0xCB6B48, // Restrained burnt orange
            dashSize: 0.25,
            gapSize: 0.15,
            linewidth: 2
        });
        this.motionPathLine = new THREE.Line(pathGeo, this.pathMaterial);
        this.motionPathLine.computeLineDistances();
        this.motionPathLine.visible = false;
        this.visualAidsGroup.add(this.motionPathLine);

        // 2. Effortless Upward Force Vector Arrow (One-Hand Action Indicator)
        this.forceVectorGroup = new THREE.Group();
        this.forceVectorGroup.visible = false;

        const arrowDir = new THREE.Vector3(0, 1, 0.3).normalize();
        const arrowOrigin = new THREE.Vector3(0, 5.8, 0.5);
        this.forceArrow = new THREE.ArrowHelper(arrowDir, arrowOrigin, 1.6, 0x8B2635, 0.4, 0.25);
        this.forceVectorGroup.add(this.forceArrow);

        // Hand contact grab sphere ring
        const grabRingGeo = new THREE.TorusGeometry(0.35, 0.04, 16, 32);
        grabRingGeo.rotateX(Math.PI / 2);
        const grabRingMat = new THREE.MeshBasicMaterial({ color: 0xCB6B48, wireframe: true });
        this.grabRing = new THREE.Mesh(grabRingGeo, grabRingMat);
        this.grabRing.position.set(0, 5.65, 0.5);
        this.forceVectorGroup.add(this.grabRing);

        this.visualAidsGroup.add(this.forceVectorGroup);

        // 3. Human Scale Silhouette Overlay (178cm average adult for ergonomic context)
        this.humanFigure = new THREE.Group();
        this.humanFigure.position.set(-3.2, 0, 0.6);
        this.humanFigure.visible = false;

        const humanMat = new THREE.MeshStandardMaterial({
            color: 0x3E4550,
            roughness: 0.6,
            metalness: 0.1,
            transparent: true,
            opacity: 0.75
        });

        // Seated human torso & limbs
        const headGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const head = new THREE.Mesh(headGeo, humanMat);
        head.position.y = 12.8;
        this.humanFigure.add(head);

        const torsoGeo = new THREE.CylinderGeometry(0.85, 0.75, 4.2, 16);
        const torso = new THREE.Mesh(torsoGeo, humanMat);
        torso.position.y = 9.8;
        this.humanFigure.add(torso);

        // Ergonomic line from desk to human elbow
        const guideLineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 7.35, 0),
            new THREE.Vector3(3.2, 7.35, -0.6)
        ]);
        const guideLine = new THREE.Line(guideLineGeo, new THREE.LineBasicMaterial({ color: 0x8B949E }));
        this.humanFigure.add(guideLine);

        this.visualAidsGroup.add(this.humanFigure);
    }

    // Update kinematic transformation and explosion states
    updateState(transformT, explodeT) {
        this.transformProgress = THREE.MathUtils.clamp(transformT, 0.0, 1.0);
        this.explodeProgress = THREE.MathUtils.clamp(explodeT, 0.0, 1.0);

        const t = this.transformProgress;
        const e = this.explodeProgress;

        // -------------------------------------------------------------
        // KINEMATIC TRANSFORMATION CALCULATIONS
        // -------------------------------------------------------------
        // At t = 0 (Carry): Desk height = 5.5 (nested on luggage), Z = 0
        // At t = 1 (Work): Desk height = 7.35 (735mm standard desk), Z = +1.85 (forward presentation)
        const deskElevationY = THREE.MathUtils.lerp(5.5, 7.35, t);
        const deskForwardZ = THREE.MathUtils.lerp(0.0, 1.85, t);

        // 4-Bar Linkage rotation angle (arms swing from folded to elevated)
        // Angle swings from approx -1.3 rad (nested) to +0.35 rad (elevated locking position)
        const linkageAngle = THREE.MathUtils.lerp(-1.25, 0.32, t);

        this.armL1.rotation.x = linkageAngle;
        this.armL2.rotation.x = linkageAngle;
        this.armR1.rotation.x = linkageAngle;
        this.armR2.rotation.x = linkageAngle;

        // Central Gas Strut extension
        // Piston shaft strokes upward by 1.2 dm as table rises
        this.pistonShaft.position.y = THREE.MathUtils.lerp(0.0, 1.25, t);

        // Stabilizer kickstand outrigger rotates forward to prevent tipping
        const footDeploy = THREE.MathUtils.smoothstep(t, 0.1, 0.8);
        this.stabilizerFoot.rotation.x = THREE.MathUtils.lerp(0.0, 0.65, footDeploy);
        this.stabilizerFoot.position.z = THREE.MathUtils.lerp(0.95, 1.45, footDeploy);

        // Desk Carrier Position
        this.tableAssembly.position.y = deskElevationY;
        this.tableAssembly.position.z = deskForwardZ;

        // Folding Extension Leaf unfolds between t=0.55 and t=1.0
        const unfoldT = THREE.MathUtils.smoothstep(t, 0.55, 1.0);
        // Closed: folded flat 180 degrees backward over the primary desk
        // Open: flat at 0 degrees
        this.foldingLeaf.rotation.x = THREE.MathUtils.lerp(Math.PI, 0.0, unfoldT);

        // Laptop lid opens between t=0.75 and t=1.0
        const laptopT = THREE.MathUtils.smoothstep(t, 0.75, 1.0);
        // Rotates open approx 115 degrees
        this.laptopLid.rotation.x = THREE.MathUtils.lerp(0.0, -1.95, laptopT);

        // Work accessories fade/slide into view when unfolding
        this.accessoriesGroup.visible = (t > 0.05);
        this.accessoriesGroup.scale.setScalar(THREE.MathUtils.lerp(0.01, 1.0, Math.min(1.0, t * 1.5)));

        // Over-Center Lock Pin engages with satisfying snap at t > 0.96
        if (t >= 0.96) {
            this.lockPin.position.y = -0.08; // Locked detent
        } else {
            this.lockPin.position.y = 0.08; // Released
        }

        // Trolley handle: extended when in Carry mode (t=0) if user wants to roll, or stowed
        // In Work mode it serves as rigid rear luggage ballast

        // -------------------------------------------------------------
        // EXPLODED VIEW LAYER SEPARATION CALCULATIONS
        // -------------------------------------------------------------
        // When e > 0, the 7 layers separate along Y and Z axes
        if (this.layers.workSurface) {
            this.layers.workSurface.position.y = e * 4.2;
            this.layers.workSurface.position.z = e * 0.8;
        }

        if (this.layers.gasSpringAndLock) {
            this.layers.gasSpringAndLock.position.y = e * 2.8;
            this.layers.gasSpringAndLock.position.z = e * 0.3;
        }

        if (this.layers.linkage) {
            this.layers.linkage.position.y = e * 1.5;
            this.layers.linkage.position.x = e * 1.2;
        }

        if (this.layers.storage) {
            this.layers.storage.position.z = e * 2.5;
        }

        if (this.frontShell) {
            this.frontShell.position.z = e * 3.8;
        }

        if (this.rearShell) {
            this.rearShell.position.z = -e * 3.8;
        }

        if (this.layers.wheelsAndHandle) {
            this.layers.wheelsAndHandle.position.y = -e * 2.4;
            this.trolleyHandleGroup.position.z = -0.92 - (e * 2.2);
        }

        // Visual aids tracking
        if (this.forceVectorGroup) {
            this.forceVectorGroup.position.set(0, deskElevationY - 5.5, deskForwardZ);
        }
    }

    setCutaway(active) {
        this.cutawayActive = active;
        const targetMat = active ? this.materials.cutawayShell : this.materials.shell;
        this.shellMeshes.forEach(mesh => {
            mesh.material = targetMat;
        });
    }

    setMotionPathVisible(visible) {
        this.motionPathVisible = visible;
        if (this.motionPathLine) this.motionPathLine.visible = visible;
        if (this.forceVectorGroup) this.forceVectorGroup.visible = visible;
    }

    setHumanScaleVisible(visible) {
        this.humanScaleVisible = visible;
        if (this.humanFigure) this.humanFigure.visible = visible;
    }
}

window.OneFormModel = OneFormModel;
