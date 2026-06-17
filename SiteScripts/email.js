document.querySelectorAll(".js-email").forEach(function (a) {
    a.addEventListener("click", function (e) {
        e.preventDefault();
        var addr = a.dataset.user + "@" + a.dataset.domain;
        window.location.href = "mailto:" + addr;
    });
});
