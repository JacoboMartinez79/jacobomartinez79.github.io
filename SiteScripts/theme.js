// Theme toggle. The <head> sets data-theme before paint; this only handles the
// button and tells the canvas scripts to re-read their colors.
(function () {
    var KEY = "jm-theme";
    var root = document.documentElement;
    var media = window.matchMedia("(prefers-color-scheme: dark)");

    function stored() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function isDark() {
        var s = stored();
        return s ? s === "dark" : media.matches;
    }

    var btn = document.querySelector(".theme-toggle");
    if (!btn) return;

    function sync() {
        var dark = isDark();
        btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
        btn.setAttribute("aria-pressed", dark ? "true" : "false");
    }

    btn.addEventListener("click", function () {
        var next = isDark() ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem(KEY, next); } catch (e) { /* private mode */ }
        sync();
        document.dispatchEvent(new CustomEvent("themechange"));
    });

    // follow the OS only while the user has not made an explicit choice
    var onSystem = function () {
        if (stored()) return;
        sync();
        document.dispatchEvent(new CustomEvent("themechange"));
    };
    if (media.addEventListener) media.addEventListener("change", onSystem);
    else if (media.addListener) media.addListener(onSystem);

    sync();
})();
