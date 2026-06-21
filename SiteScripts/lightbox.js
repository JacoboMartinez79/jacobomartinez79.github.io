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

    function open(src, alt) {
        img.src = src;
        img.alt = alt || "";
        overlay.classList.add("is-open");
        document.body.style.overflow = "hidden";
    }

    function close() {
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
        img.src = "";
    }

    triggers.forEach(function (a) {
        a.addEventListener("click", function (e) {
            e.preventDefault();
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
