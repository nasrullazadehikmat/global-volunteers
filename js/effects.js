/* Canlı görünüş: scroll animasiyaları, sayğac, bilet, paket kalkulyatoru. Əsas skriptdən asılı deyil. */
(function(){
  "use strict";
  var doc = document, root = doc.documentElement, app = doc.getElementById("app");
  if (!app) return;
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  root.classList.add("js");
  function $(s, r){ return (r || doc).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }

  /* scroll progress + header shadow */
  var bar = doc.createElement("div");
  bar.className = "progress"; bar.setAttribute("aria-hidden", "true");
  doc.body.appendChild(bar);
  function onScroll(){
    var h = root.scrollHeight - window.innerHeight;
    bar.style.setProperty("--p", h > 0 ? Math.min(1, window.pageYOffset / h).toFixed(4) : 0);
    var hd = $("header.site"); if (hd) hd.classList.toggle("scrolled", window.pageYOffset > 8);
  }
  window.addEventListener("scroll", onScroll, {passive: true});
  window.addEventListener("resize", onScroll);

  /* reveal blocks that start below the fold */
  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, {threshold: 0.12, rootMargin: "0px 0px -5% 0px"}) : null;
  function show(n){
    n.classList.add("in");
    setTimeout(function(){ n.classList.remove("rv", "in"); n.style.removeProperty("--d"); }, 1100);
  }
  function prepReveal(){
    if (reduce || !io) return;
    var sel = ".section-head,.step,.pkg,.chat-card,.letter-card,.strip-card,.consult-card,.apply-bar,.cta-final .wrap > *";
    $$(sel, app).forEach(function(n, i){
      if (n.getBoundingClientRect().top < window.innerHeight * 0.95) return;
      n.classList.add("rv");
      n.style.setProperty("--d", ((i % 4) * 0.08).toFixed(2) + "s");
      io.observe(n);
    });
    setTimeout(function(){ $$(".rv:not(.in)", app).forEach(show); }, 7000);   /* safety: never leave anything hidden */
  }

  /* count-up numbers */
  function countUp(n){
    var to = +n.getAttribute("data-count"), suf = n.getAttribute("data-suffix") || "", t0 = null, dur = 1500;
    function f(ts){
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      n.textContent = Math.round(to * e).toLocaleString("en-US") + suf;
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }

  /* ticket: rotating destinations + tilt */
  var destTimer = null;
  function initTicket(){
    clearInterval(destTimer);
    var d = $(".dest", app);
    if (!d || reduce) return;
    var list = (d.getAttribute("data-dests") || "").split("|").filter(Boolean);
    if (list.length < 2) return;
    var i = 0;
    destTimer = setInterval(function(){
      if (doc.hidden) return;
      d.classList.add("out");
      setTimeout(function(){ i = (i + 1) % list.length; d.textContent = list[i]; d.classList.remove("out"); }, 290);
    }, 2700);
  }
  doc.addEventListener("pointermove", function(e){
    if (reduce || e.pointerType === "touch") return;
    var tk = $(".ticket", app); if (!tk) return;
    var h = tk.closest(".hero"); if (!h) return;
    var r = h.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    var x = e.clientX / window.innerWidth - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    tk.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
    tk.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
  }, {passive: true});

  /* package calculator */
  function tween(n, to){
    var from = +n.getAttribute("data-val") || 0, t0 = null, dur = 450;
    n.setAttribute("data-val", to);
    if (reduce) { n.textContent = to + " AZN"; return; }
    function f(ts){
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      n.textContent = Math.round(from + (to - from) * e) + " AZN";
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  doc.addEventListener("click", function(e){
    var b = e.target.closest ? e.target.closest(".cc") : null;
    if (!b) return;
    var c = b.closest(".calc"); if (!c) return;
    $$(".cc", c).forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    tween($(".calc-total", c), (+c.getAttribute("data-init")) + (+b.getAttribute("data-add")));
    var note = $(".calc-note", c); if (note) note.textContent = b.getAttribute("data-note") || "";
  });

  function enhance(){
    prepReveal();
    initTicket();
    if (!reduce) $$("[data-count]", app).forEach(countUp);
    onScroll();
  }
  enhance();
  new MutationObserver(enhance).observe(app, {childList: true});   /* runs again after the AZ/EN switch */
})();
