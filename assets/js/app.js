const body = document.body;

const setActiveMenuItem = () => {
    const page = body.getAttribute("data-page");
    if (!page) {
        return;
    }

    document.querySelectorAll(".menu-item").forEach((item) => {
        const target = item.getAttribute("data-page");
        item.classList.toggle("is-active", target === page);
    });
};

const initSegments = () => {
    document.querySelectorAll(".segmented").forEach((group) => {
        group.querySelectorAll("button").forEach((btn) => {
            btn.addEventListener("click", () => {
                group.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
                btn.classList.add("is-active");
            });
        });
    });
};

const initToggles = () => {
    document.querySelectorAll(".toggle").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            toggle.classList.toggle("is-on");
        });
    });
};

const initSliders = () => {
    document.querySelectorAll("[data-slider]").forEach((wrap) => {
        const input = wrap.querySelector("input[type='range']");
        const output = wrap.querySelector("[data-output]");
        if (!input || !output) {
            return;
        }
        output.textContent = input.value;
        input.addEventListener("input", () => {
            output.textContent = input.value;
        });
    });
};

const initBoiViewportFallback = () => {
    const targets = ["menu-boy-view", "boi-view"]
        .map((id) => document.getElementById(id))
        .filter(Boolean);

    if (targets.length === 0) {
        return;
    }

    targets.forEach((target) => {
        window.setTimeout(() => {
            if (target.dataset.threeReady === "1") {
                return;
            }

            target.innerHTML = "";
            const canvas = document.createElement("canvas");
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.style.display = "block";
            target.appendChild(canvas);

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return;
            }

            const resize = () => {
                const w = Math.max(2, target.clientWidth);
                const h = Math.max(2, target.clientHeight);
                const ratio = Math.min(window.devicePixelRatio || 1, 2);
                canvas.width = Math.floor(w * ratio);
                canvas.height = Math.floor(h * ratio);
                ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            };

            const draw = (time) => {
                const w = target.clientWidth;
                const h = target.clientHeight;
                if (!w || !h) {
                    requestAnimationFrame(draw);
                    return;
                }

                const t = time * 0.001;
                ctx.clearRect(0, 0, w, h);

                const g = ctx.createRadialGradient(w * 0.3, h * 0.28, 20, w * 0.5, h * 0.5, Math.max(w, h));
                g.addColorStop(0, "rgba(255,255,255,0.2)");
                g.addColorStop(1, "rgba(0,0,0,0)");
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);

                const cx = w * 0.5;
                const cy = h * 0.54;
                const base = Math.min(w, h) * 0.18;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(t * 0.8);

                ctx.fillStyle = "rgba(215,222,232,0.86)";
                ctx.beginPath();
                ctx.moveTo(0, -base * 1.25);
                ctx.lineTo(base * 0.78, 0);
                ctx.lineTo(0, base * 1.25);
                ctx.lineTo(-base * 0.78, 0);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = "rgba(255,255,255,0.52)";
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.restore();

                ctx.fillStyle = "rgba(255,255,255,0.5)";
                ctx.beginPath();
                ctx.ellipse(cx, cy + base * 1.35, base * 0.95, base * 0.28, 0, 0, Math.PI * 2);
                ctx.fill();

                requestAnimationFrame(draw);
            };

            resize();
            window.addEventListener("resize", resize);
            requestAnimationFrame(draw);
        }, 1500);
    });
};

window.addEventListener("DOMContentLoaded", () => {
    setActiveMenuItem();
    initSegments();
    initToggles();
    initSliders();
    initBoiViewportFallback();
});
