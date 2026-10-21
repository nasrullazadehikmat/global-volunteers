/* Kəşf bölməsi: interaktiv Avropa xəritəsi + bu həftə bitənlər.
   main.js-dən asılıdır (window.GV) və layihələr yüklənəndikdə / dil dəyişdikdə özünü yeniləyir. */
(function(){
  "use strict";
  var GV = window.GV, MAP = window.GV_MAP;
  if (!GV || !MAP) return;
  var doc = document;
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var NS = "http://www.w3.org/2000/svg";

  var S = {
    az: {
      k: "KƏŞF ET", h: "Layihəni xəritədən tapın", p: "Ölkəni seçin — həmin ölkədəki açıq layihələri göstərək.",
      mapT: "Layihələr xəritədə", mapHint: "Parlayan ölkələrdə açıq layihə var. Üzərinə klikləyin.",
      from: "Bakı", proj: "layihə", none: "Bu ölkə üçün hazırda açıq layihə yoxdur.", pickC: "Ölkə seçin",
      details: "Detallara bax", support: "Dəstək al", all: "Hamısına bax", official: "Rəsmi səhifə",
      cal: "Təqvimə əlavə et", left: "gün qalıb", today: "Bu gün son gündür", noDl: "Son tarix qeyd olunmayıb",
      week: "Bu həftə bitən layihələr"
    },
    en: {
      k: "EXPLORE", h: "Find a project on the map", p: "Pick a country and we'll show its open projects.",
      mapT: "Projects on the map", mapHint: "Glowing countries have open projects. Click one.",
      from: "Baku", proj: "projects", none: "No open projects for this country right now.", pickC: "Pick a country",
      details: "View details", support: "Get support", all: "See all", official: "Official page",
      cal: "Add to calendar", left: "days left", today: "Last day today", noDl: "No deadline listed",
      week: "Deadlines this week"
    }
  };
  function L(){ return GV.lang() === "en" ? "en" : "az"; }
  function T(){ return S[L()]; }
  function $(s, r){ return (r || doc).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function el(tag, cls, text){ var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function sv(tag, attrs){ var n = doc.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); return n; }

  function openItems(){
    return GV.items().filter(function(p){ var d = GV.daysLeft(p.deadline); return d === null || d >= 0; });
  }
  function byCountry(){
    var m = {};
    openItems().forEach(function(p){ if (p.country) (m[p.country] = m[p.country] || []).push(p); });
    return m;
  }
  function leftTxt(p){
    var d = GV.daysLeft(p.deadline);
    if (d === null) return T().noDl;
    if (d === 0) return T().today;
    return d + " " + T().left;
  }

  /* ---------- skeleton ---------- */
  var sel = null;   /* seçilmiş ölkə */

  function ensure(){
    var host = $("#layiheler");
    if (!host) return;
    var sec = $("#kesf");
    if (!sec) {
      sec = el("section", "gv-disc"); sec.id = "kesf"; sec.setAttribute("aria-labelledby", "gvH");
      sec.innerHTML =
        '<div class="wrap"><div class="section-head"><div class="k"></div><h2 id="gvH"></h2><p></p></div>' +
        '<div class="gv-card gv-mapcard" id="gvMap"></div>' +
        '<div class="gv-week" id="gvWeek"></div></div>';
      host.parentNode.insertBefore(sec, host.nextSibling);
    }
    var ok = GV.status() === "ok" && openItems().length > 0;
    sec.hidden = !ok;
    if (!ok) return;
    $(".k", sec).textContent = T().k; $("#gvH").textContent = T().h; $(".section-head p", sec).textContent = T().p;
    drawMap(); drawWeek();
  }

  /* ---------- map ---------- */
  function drawMap(){
    var box = $("#gvMap"), t = T(), by = byCountry();
    box.textContent = "";
    var head = el("div", "gv-head");
    head.appendChild(el("h3", null, t.mapT)); head.appendChild(el("p", null, t.mapHint));
    box.appendChild(head);

    var stage = el("div", "gv-stage");
    var svg = sv("svg", {viewBox: "0 0 " + MAP.w + " " + MAP.h, "class": "gv-svg", role: "group", "aria-label": t.mapT});
    var g = sv("g", {}), pins = sv("g", {"class": "gv-pins"}), fly = sv("g", {"class": "gv-fly"});
    var i = 0, onMap = {};
    MAP.c.forEach(function(c){
      var n = (by[c.k] || []).length;
      var p = sv("path", {d: c.d, "class": "gv-c" + (n ? " has" : "") + (sel === c.k ? " on" : ""), "data-k": c.k});
      if (n) {
        onMap[c.k] = 1;
        p.style.animationDelay = (i++ * 60) + "ms";
        var pin = sv("g", {"class": "gv-pin", transform: "translate(" + c.c[0] + " " + c.c[1] + ")", "data-k": c.k});
        pin.appendChild(sv("circle", {"class": "ring", r: 5}));
        pin.appendChild(sv("circle", {"class": "dot", r: n > 1 ? 9 : 5.5}));
        if (n > 1) { var tx = sv("text", {"class": "num", y: 3.6, "text-anchor": "middle"}); tx.textContent = n; pin.appendChild(tx); }
        pin.style.animationDelay = (i * 60) + "ms";
        pins.appendChild(pin);
      }
      g.appendChild(p);
    });
    svg.appendChild(g); svg.appendChild(fly); svg.appendChild(pins);
    var b = sv("g", {"class": "gv-baku", transform: "translate(" + MAP.baku[0] + " " + MAP.baku[1] + ")"});
    b.appendChild(sv("circle", {r: 4.5})); var bt = sv("text", {x: 8, y: 4}); bt.textContent = t.from; b.appendChild(bt);
    svg.appendChild(b);
    stage.appendChild(svg);
    var tip = el("div", "gv-tip"); tip.id = "gvTip"; tip.hidden = true; stage.appendChild(tip);
    box.appendChild(stage);

    /* hamısı üçün çiplər (xəritədə olmayanlar da daxil) */
    var chips = el("div", "gv-chips"); chips.setAttribute("role", "group"); chips.setAttribute("aria-label", t.pickC);
    Object.keys(by).sort(function(a, b2){ return by[b2].length - by[a].length || GV.cName(a).localeCompare(GV.cName(b2)); }).forEach(function(k){
      var c = el("button", "gv-chip" + (sel === k ? " on" : "") + (onMap[k] ? "" : " off"), GV.cName(k) + " · " + by[k].length);
      c.type = "button"; c.setAttribute("data-k", k); c.setAttribute("aria-pressed", sel === k ? "true" : "false");
      chips.appendChild(c);
    });
    box.appendChild(chips);
    var panel = el("div", "gv-panel"); panel.id = "gvPanel"; panel.setAttribute("aria-live", "polite");
    box.appendChild(panel);
    if (sel && by[sel]) showCountry(sel, false); else sel = null;
  }

  function miniCard(p){
    var c = el("div", "gv-mini");
    var top = el("div", "gv-mini-top");
    top.appendChild(el("b", null, p.title));
    top.appendChild(el("span", "gv-when", leftTxt(p)));
    c.appendChild(top);
    var meta = [];
    if (p.country) meta.push(GV.cName(p.country));
    if (p.deadline) meta.push(GV.fmtDay(p.deadline));
    if (meta.length) c.appendChild(el("div", "gv-mini-meta", meta.join(" · ")));
    var act = el("div", "gv-mini-act");
    var d = el("button", "prj-btn primary", T().details); d.type = "button"; d.setAttribute("data-show", p.id); act.appendChild(d);
    if (p.deadline) { var k = el("button", "prj-btn", "📅 " + T().cal); k.type = "button"; k.setAttribute("data-ics", p.id); act.appendChild(k); }
    var sup = el("a", "prj-btn wa", T().support); sup.href = GV.waProject(p); sup.target = "_blank"; sup.rel = "noopener"; act.appendChild(sup);
    var u = GV.safeUrl(p.link);
    if (u) { var a = el("a", "prj-btn", T().official); a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; act.appendChild(a); }
    c.appendChild(act);
    return c;
  }

  function showCountry(k, animate){
    var by = byCountry(), list = (by[k] || []).slice().sort(function(a, b){
      var x = GV.daysLeft(a.deadline), y = GV.daysLeft(b.deadline);
      if (x === null) return 1; if (y === null) return -1; return x - y;
    });
    sel = k;
    $$(".gv-c.on").forEach(function(n){ n.classList.remove("on"); });
    var pth = $('.gv-c[data-k="' + k.replace(/"/g, "") + '"]'); if (pth) pth.classList.add("on");
    $$(".gv-chip").forEach(function(n){ var on = n.getAttribute("data-k") === k; n.classList.toggle("on", on); n.setAttribute("aria-pressed", on ? "true" : "false"); });
    var panel = $("#gvPanel"); panel.textContent = "";
    var h = el("div", "gv-panel-h");
    h.appendChild(el("h4", null, GV.cName(k) + " — " + list.length + " " + T().proj));
    var all = el("button", "linklike", T().all + " →"); all.type = "button"; all.setAttribute("data-all", k); h.appendChild(all);
    panel.appendChild(h);
    if (!list.length) panel.appendChild(el("p", "gv-empty", T().none));
    list.forEach(function(p){ panel.appendChild(miniCard(p)); });
    panel.classList.remove("in"); void panel.offsetWidth; panel.classList.add("in");
    flyTo(k, animate !== false);
  }

  /* Bakıdan seçilmiş ölkəyə uçan təyyarə */
  var raf = 0;
  function flyTo(k, animate){
    var fly = $(".gv-fly"); if (!fly) return;
    cancelAnimationFrame(raf); fly.textContent = "";
    var tgt = null; MAP.c.forEach(function(c){ if (c.k === k) tgt = c.c; });
    if (!tgt) return;
    var a = MAP.baku, b = tgt, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
    var cx = mx + dy / len * len * 0.22 * (dx > 0 ? 1 : -1), cy = my - Math.abs(dx / len) * len * 0.22 - 12;
    var path = sv("path", {d: "M" + a[0] + " " + a[1] + " Q" + cx.toFixed(1) + " " + cy.toFixed(1) + " " + b[0] + " " + b[1], "class": "gv-arc"});
    fly.appendChild(path);
    var plane = sv("text", {"class": "gv-plane", "text-anchor": "middle", "dominant-baseline": "central"}); plane.textContent = "✈";
    fly.appendChild(plane);
    function at(t){
      var u = 1 - t;
      var x = u * u * a[0] + 2 * u * t * cx + t * t * b[0], y = u * u * a[1] + 2 * u * t * cy + t * t * b[1];
      var tx = 2 * u * (cx - a[0]) + 2 * t * (b[0] - cx), ty = 2 * u * (cy - a[1]) + 2 * t * (b[1] - cy);
      return {x: x, y: y, ang: Math.atan2(ty, tx) * 180 / Math.PI};
    }
    var total = path.getTotalLength();
    if (reduce || !animate) { path.style.strokeDasharray = "none"; var e = at(1); plane.setAttribute("transform", "translate(" + e.x + " " + e.y + ") rotate(" + e.ang + ")"); return; }
    path.style.strokeDasharray = total; path.style.strokeDashoffset = total;
    var t0 = 0, dur = 1500;
    function step(ts){
      if (!t0) t0 = ts;
      var t = Math.min(1, (ts - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var p = at(e);
      path.style.strokeDashoffset = total * (1 - e);
      plane.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ") rotate(" + p.ang.toFixed(1) + ")");
      if (t < 1) raf = requestAnimationFrame(step); else path.style.strokeDasharray = "5 5";
    }
    raf = requestAnimationFrame(step);
  }

  /* ---------- bu həftə bitənlər ---------- */
  function drawWeek(){
    var box = $("#gvWeek"), t = T(); box.textContent = "";
    var wk = openItems().filter(function(p){ var d = GV.daysLeft(p.deadline); return d !== null && d <= 7; })
      .sort(function(a, b){ return GV.daysLeft(a.deadline) - GV.daysLeft(b.deadline); });
    box.hidden = !wk.length; if (!wk.length) return;
    var h = el("div", "gv-week-h"); h.appendChild(el("b", null, "⏰ " + t.week + " (" + wk.length + ")"));
    box.appendChild(h);
    var ul = el("ul");
    wk.forEach(function(p){ var li = el("li"); var b = el("button", "linklike", p.title); b.type = "button"; b.setAttribute("data-show", p.id); li.appendChild(b); li.appendChild(el("span", null, GV.fmtDay(p.deadline) + " · " + leftTxt(p))); ul.appendChild(li); });
    box.appendChild(ul);
  }
  /* ---------- events (bir dəfə, delegasiya) ---------- */
  function find(id){ return GV.items().filter(function(p){ return p.id === id; })[0]; }
  doc.addEventListener("click", function(e){
    var n;
    if ((n = e.target.closest(".gv-svg [data-k], .gv-chip"))) {
      var k = n.getAttribute("data-k");
      if (n.classList.contains("gv-c") && !n.classList.contains("has")) return;
      if (!byCountry()[k]) return;
      showCountry(k, true); return;
    }
    if ((n = e.target.closest("[data-show]"))) { GV.showProject(n.getAttribute("data-show")); return; }
    if ((n = e.target.closest("[data-ics]"))) { var p = find(n.getAttribute("data-ics")); if (p) { GV.downloadICS(p); GV.toast(L() === "az" ? "Təqvim faylı yükləndi — açıb əlavə edin" : "Calendar file downloaded — open it to add"); } return; }
    if ((n = e.target.closest("[data-all]"))) { GV.filterCountry(n.getAttribute("data-all")); return; }
  });
  /* tooltip */
  doc.addEventListener("mouseover", function(e){
    var tip = $("#gvTip"); if (!tip) return;
    var n = e.target.closest && e.target.closest(".gv-svg [data-k]");
    if (!n) { tip.hidden = true; return; }
    var k = n.getAttribute("data-k"), c = (byCountry()[k] || []).length, st = $(".gv-stage"), sr = st.getBoundingClientRect(), r = n.getBoundingClientRect();
    tip.textContent = GV.cName(k) + (c ? " · " + c + " " + T().proj : "");
    tip.hidden = false;
    tip.style.left = Math.min(Math.max(r.left + r.width / 2 - sr.left, 60), sr.width - 60) + "px";
    tip.style.top = Math.max(r.top - sr.top - 6, 14) + "px";
  });
  doc.addEventListener("mouseout", function(e){ if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(".gv-svg")) { var tip = $("#gvTip"); if (tip) tip.hidden = true; } });
  doc.addEventListener("keydown", function(e){
    var n = e.target.closest && e.target.closest(".gv-svg [data-k]");
    if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); n.dispatchEvent(new MouseEvent("click", {bubbles: true})); }
  });

  doc.addEventListener("gv:render", ensure);
  ensure();
})();
