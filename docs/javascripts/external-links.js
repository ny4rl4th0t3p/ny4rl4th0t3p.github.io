// Open off-site links in a new tab. Any anchor whose host differs from the
// page's gets target=_blank + rel=noopener; same-origin links (the landing, the
// blog, sub-project docs on this origin) keep the tab. Runs on load and, if
// Material's instant navigation is ever enabled, on every page swap via the
// document$ observable it exposes.
(function () {
  function externalize() {
    var here = window.location.host;
    document.querySelectorAll("a[href]").forEach(function (a) {
      if (a.host && a.host !== here) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
      }
    });
  }
  if (typeof window.document$ !== "undefined" && window.document$.subscribe) {
    window.document$.subscribe(externalize);
  } else {
    document.addEventListener("DOMContentLoaded", externalize);
  }
})();