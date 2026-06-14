// Full-page ambient "constellation" background.
//
// Slowly drifting nodes that draw faint connecting lines when they come near
// each other, evoking a graph / network (fits the AI + graphics theme). Drawn
// with the Canvas 2D API (lighter than WebGL for thin lines, no dependency).
//
// Portfolio-friendly: pauses when the tab is hidden, caps the pixel ratio,
// respects prefers-reduced-motion (renders one static frame), thins out on
// small screens, and sits behind all content via a fixed, -1 z-index canvas.

(function () {
    const canvas = document.querySelector(".bg-constellation");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        canvas.remove();
        return;
    }

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    // Palette (matches the site's accent + slate).
    const NODE_COLOR = "70, 113, 230";  // --accent rgb
    const LINE_COLOR = "90, 100, 120";  // deeper slate so lines read on light bg

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    let nodes = [];
    let linkDist = 140;

    function isSmall() {
        return window.matchMedia("(max-width: 1023px)").matches;
    }

    function buildNodes() {
        // Density scales with viewport area, capped for performance.
        const area = w * h;
        const target = isSmall() ? 45 : 90;
        const count = Math.min(target, Math.round(area / 16000));
        linkDist = isSmall() ? 110 : 150;

        nodes = [];
        for (let i = 0; i < count; i++) {
            nodes.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() * 2 - 1) * 0.25,
                vy: (Math.random() * 2 - 1) * 0.25,
                r: Math.random() * 1.4 + 0.8,
            });
        }
    }

    function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildNodes();
    }

    function step() {
        for (const n of nodes) {
            n.x += n.vx;
            n.y += n.vy;
            // Wrap around the edges for a continuous field.
            if (n.x < -10) n.x = w + 10;
            else if (n.x > w + 10) n.x = -10;
            if (n.y < -10) n.y = h + 10;
            else if (n.y > h + 10) n.y = -10;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);

        // Connecting lines (the "constellation").
        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            for (let j = i + 1; j < nodes.length; j++) {
                const b = nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < linkDist * linkDist) {
                    const dist = Math.sqrt(distSq);
                    // Fade line with distance, but keep it clearly visible.
                    const alpha = (1 - dist / linkDist) * 0.5;
                    ctx.strokeStyle = `rgba(${LINE_COLOR}, ${alpha})`;
                    ctx.lineWidth = 1.1;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        // Nodes.
        for (const n of nodes) {
            ctx.fillStyle = `rgba(${NODE_COLOR}, 0.5)`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ----- run loop with pause controls -----
    let rafId = null;
    let running = false;

    function frame() {
        step();
        draw();
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

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
        else start();
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 200);
    });

    resize();
    if (reducedMotion) {
        draw(); // single static frame
    } else {
        start();
    }
})();
