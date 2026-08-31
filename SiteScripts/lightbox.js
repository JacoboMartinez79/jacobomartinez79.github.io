(function () {
    var triggers = document.querySelectorAll(".contribution-media a");
    if (!triggers.length) return;

    var overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.innerHTML =
        '<button class="lightbox-close" aria-label="Close">&times;</button>' +
        '<img class="lightbox-img" alt="" />';
    document.body.appendChild(overlay);

    var img = overlay.querySelector(".lightbox-img");
    var closeBtn = overlay.querySelector(".lightbox-close");
    var lastFocus = null;

    function open(src, alt) {
        lastFocus = document.activeElement;
        img.src = src;
        img.alt = alt || "";
        overlay.classList.add("is-open");
        document.body.style.overflow = "hidden";
        closeBtn.focus();
    }

    function close() {
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
        img.src = "";
        if (lastFocus) lastFocus.focus();
    }

    // Animations ship as a light poster frame. The first click fetches the real
    // clip and plays it inline; after that the link behaves like any other.
    function play(a) {
        var inner = a.querySelector("img");
        var full = a.getAttribute("data-anim");
        if (!inner || !full) return;

        a.classList.add("is-loading");
        var loader = new Image();
        loader.onload = function () {
            inner.src = full;
            a.classList.remove("is-loading");
            a.classList.add("is-playing");
            a.setAttribute("title", "Open full size");
        };
        loader.onerror = function () {
            a.classList.remove("is-loading");
            a.classList.add("is-playing"); // fall through to the lightbox next click
        };
        loader.src = full;
    }

    triggers.forEach(function (a) {
        a.addEventListener("click", function (e) {
            e.preventDefault();
            if (a.classList.contains("media-anim") && !a.classList.contains("is-playing")) {
                if (!a.classList.contains("is-loading")) play(a);
                return;
            }
            var inner = a.querySelector("img");
            open(a.getAttribute("href"), inner ? inner.alt : "");
        });
    });

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
})();
