/* Paketlər bölməsində proqram seçimi: ESC / SALTO Youth.
   Dil dəyişəndə (AZ ↔ EN) seçim qorunur. Link: #paketler-esc və ya #paketler-salto birbaşa uyğun paketləri açır. */
(function(){
  "use strict";
  var doc = document, app = doc.getElementById("app");
  if (!app) return;

  var cur = "esc";
  var hash = (location.hash || "").toLowerCase();
  if (hash === "#paketler-salto") cur = "salto";

  function $$(s, r){ return Array.prototype.slice.call((r || app).querySelectorAll(s)); }

  function apply(){
    $$(".prog-tab").forEach(function(t){
      var on = t.getAttribute("data-prog") === cur;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    $$(".prog-panel").forEach(function(p){ p.hidden = p.getAttribute("data-prog") !== cur; });
  }

  function show(name){
    if (name !== "esc" && name !== "salto") return;
    cur = name;
    apply();
  }

  app.addEventListener("click", function(e){
    var tab = e.target.closest ? e.target.closest(".prog-tab") : null;
    if (tab) show(tab.getAttribute("data-prog"));
  });

  /* oxlar, Home, End ilə tab-lar arasında keçid (ARIA tabs) */
  app.addEventListener("keydown", function(e){
    var tab = e.target.closest ? e.target.closest(".prog-tab") : null;
    if (!tab) return;
    var tabs = $$(".prog-tab"), i = tabs.indexOf(tab), n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    if (n < 0) return;
    e.preventDefault();
    show(tabs[n].getAttribute("data-prog"));
    tabs[n].focus();
  });

  /* dil dəyişəndə #app yenidən yazılır, seçimi bərpa et */
  new MutationObserver(apply).observe(app, {childList: true});
  apply();

  window.GV = window.GV || {};
  window.GV.showProgram = show;
  window.GV.currentProgram = function(){ return cur; };

  /* #paketler-esc / #paketler-salto linki ilə gələndə bölməyə keç */
  if (/^#paketler-(esc|salto)$/.test(hash)) {
    window.addEventListener("load", function(){
      setTimeout(function(){
        var s = doc.getElementById("paketler");
        if (s) s.scrollIntoView({behavior: "smooth", block: "start"});
      }, 250);
    });
  }
})();
