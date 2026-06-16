// Boids hero background. Same flocking model as my AI project.
import * as THREE from "three";

const canvas = document.querySelector(".hero-canvas");
if (canvas) {
    try {
        initBoids(canvas);
    } catch (err) {
        // no WebGL? fall back to the plain hero
        console.warn("Hero boids disabled:", err);
        canvas.remove();
    }
}

function initBoids(canvas) {
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const COLOR_BG = 0xece9e4;
    const COLOR_BASE = new THREE.Color(0x8a8f99);   // slate
    const COLOR_ACCENT = new THREE.Color(0x4671e6); // accent blue
    const bgColor = new THREE.Color(COLOR_BG);
    const FADE_MARGIN = 14; // world units near each edge where boids fade

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(COLOR_BG, 0);

    const scene = new THREE.Scene();

    // ortho camera so it reads as flat 2D behind the text
    let width = canvas.clientWidth || 1;
    let height = canvas.clientHeight || 1;
    const WORLD = 100;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    camera.position.z = 10;

    const isSmall = window.matchMedia("(max-width: 1023px)").matches;
    const COUNT = isSmall ? 90 : 220;

    const MAX_SPEED = 0.55;
    const MAX_FORCE = 0.02;
    const PERCEPTION = 14; // neighbor radius
    const SEPARATION_DIST = 7;

    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 2);

    const halfW = WORLD;
    const halfH = WORLD;

    for (let i = 0; i < COUNT; i++) {
        positions[i * 3 + 0] = (Math.random() * 2 - 1) * halfW;
        positions[i * 3 + 1] = (Math.random() * 2 - 1) * halfH;
        positions[i * 3 + 2] = 0;
        const angle = Math.random() * Math.PI * 2;
        velocities[i * 2 + 0] = Math.cos(angle) * MAX_SPEED;
        velocities[i * 2 + 1] = Math.sin(angle) * MAX_SPEED;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    // vary each boid between slate and accent. baseColors holds the true color;
    // colors is what's drawn each frame, faded toward the bg near the edges.
    const baseColors = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
        const c = COLOR_BASE.clone().lerp(COLOR_ACCENT, Math.random() * 0.7);
        baseColors[i * 3 + 0] = c.r;
        baseColors[i * 3 + 1] = c.g;
        baseColors[i * 3 + 2] = c.b;
    }
    colors.set(baseColors);
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const sprite = makeDotTexture();
    const material = new THREE.PointsMaterial({
        size: 4.5,
        map: sprite,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.NormalBlending,
        sizeAttenuation: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    function resize() {
        width = canvas.clientWidth || 1;
        height = canvas.clientHeight || 1;
        renderer.setSize(width, height, false);

        // scale the frustum to aspect so boids don't stretch
        const aspect = width / height;
        if (aspect >= 1) {
            camera.left = -WORLD * aspect;
            camera.right = WORLD * aspect;
            camera.top = WORLD;
            camera.bottom = -WORLD;
        } else {
            camera.left = -WORLD;
            camera.right = WORLD;
            camera.top = WORLD / aspect;
            camera.bottom = -WORLD / aspect;
        }
        camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    function step() {
        const boundsX = camera.right;
        const boundsY = camera.top;

        for (let i = 0; i < COUNT; i++) {
            const px = positions[i * 3];
            const py = positions[i * 3 + 1];
            let vx = velocities[i * 2];
            let vy = velocities[i * 2 + 1];

            let alignX = 0, alignY = 0;
            let cohX = 0, cohY = 0;
            let sepX = 0, sepY = 0;
            let neighbors = 0;
            let sepCount = 0;

            for (let j = 0; j < COUNT; j++) {
                if (j === i) continue;
                const dx = positions[j * 3] - px;
                const dy = positions[j * 3 + 1] - py;
                const distSq = dx * dx + dy * dy;
                if (distSq > PERCEPTION * PERCEPTION || distSq === 0) continue;

                // alignment + cohesion accumulators
                alignX += velocities[j * 2];
                alignY += velocities[j * 2 + 1];
                cohX += positions[j * 3];
                cohY += positions[j * 3 + 1];
                neighbors++;

                // separation, weighted by closeness
                if (distSq < SEPARATION_DIST * SEPARATION_DIST) {
                    const dist = Math.sqrt(distSq) || 0.0001;
                    sepX -= dx / dist;
                    sepY -= dy / dist;
                    sepCount++;
                }
            }

            let ax = 0, ay = 0;

            if (neighbors > 0) {
                let aX = alignX / neighbors;
                let aY = alignY / neighbors;
                [aX, aY] = setMag(aX, aY, MAX_SPEED);
                let sAx = aX - vx;
                let sAy = aY - vy;
                [sAx, sAy] = limit(sAx, sAy, MAX_FORCE);
                ax += sAx;
                ay += sAy;

                let cX = cohX / neighbors - px;
                let cY = cohY / neighbors - py;
                [cX, cY] = setMag(cX, cY, MAX_SPEED);
                let sCx = cX - vx;
                let sCy = cY - vy;
                [sCx, sCy] = limit(sCx, sCy, MAX_FORCE);
                ax += sCx * 0.9;
                ay += sCy * 0.9;
            }

            if (sepCount > 0) {
                let sX = sepX / sepCount;
                let sY = sepY / sepCount;
                [sX, sY] = setMag(sX, sY, MAX_SPEED);
                let sSx = sX - vx;
                let sSy = sY - vy;
                [sSx, sSy] = limit(sSx, sSy, MAX_FORCE * 1.5);
                ax += sSx * 1.4;
                ay += sSy * 1.4;
            }

            vx += ax;
            vy += ay;
            [vx, vy] = limit(vx, vy, MAX_SPEED);

            let nx = px + vx;
            let ny = py + vy;

            // wrap edges
            if (nx > boundsX) nx = -boundsX;
            else if (nx < -boundsX) nx = boundsX;
            if (ny > boundsY) ny = -boundsY;
            else if (ny < -boundsY) ny = boundsY;

            positions[i * 3] = nx;
            positions[i * 3 + 1] = ny;
            velocities[i * 2] = vx;
            velocities[i * 2 + 1] = vy;

            // fade toward the bg as a boid nears any edge, so wrapping isn't a snap
            const edgeX = Math.min(boundsX - Math.abs(nx), FADE_MARGIN);
            const edgeY = Math.min(boundsY - Math.abs(ny), FADE_MARGIN);
            const fade = Math.max(0, Math.min(edgeX, edgeY)) / FADE_MARGIN;
            const o = i * 3;
            colors[o] = bgColor.r + (baseColors[o] - bgColor.r) * fade;
            colors[o + 1] = bgColor.g + (baseColors[o + 1] - bgColor.g) * fade;
            colors[o + 2] = bgColor.b + (baseColors[o + 2] - bgColor.b) * fade;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
    }

    function render() {
        renderer.render(scene, camera);
    }

    let rafId = null;
    let running = false;
    let visibleOnScreen = true;

    function frame() {
        step();
        render();
        rafId = requestAnimationFrame(frame);
    }

    function start() {
        if (running || reducedMotion) return;
        running = true;
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        running = false;
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    // pause when scrolled offscreen
    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
            (entries) => {
                visibleOnScreen = entries[0].isIntersecting;
                if (visibleOnScreen && !document.hidden) start();
                else stop();
            },
            { threshold: 0 }
        );
        io.observe(canvas);
    }

    // pause when tab is hidden
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
        else if (visibleOnScreen) start();
    });

    if (reducedMotion) {
        // let it settle so the static frame looks intentional
        for (let k = 0; k < 60; k++) step();
        render();
    } else {
        render();
        start();
    }

    requestAnimationFrame(() => canvas.classList.add("is-ready"));
}

function limit(x, y, max) {
    const mSq = x * x + y * y;
    if (mSq > max * max) {
        const m = Math.sqrt(mSq);
        return [(x / m) * max, (y / m) * max];
    }
    return [x, y];
}

function setMag(x, y, mag) {
    const m = Math.sqrt(x * x + y * y) || 0.0001;
    return [(x / m) * mag, (y / m) * mag];
}

// soft round dot so points aren't squares
function makeDotTexture() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
    );
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.7, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
}
