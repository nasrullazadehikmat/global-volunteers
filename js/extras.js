/* Kəşf bölməsi: interaktiv Avropa xəritəsi + "Mənə uyğun layihə" testi + bu həftə bitənlər.
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
      k: "KƏŞF ET", h: "Layihəni xəritədən tapın və ya 1 dəqiqəlik testi keçin",
      p: "Ölkəni seçin, yaxud beş sualı cavablayın — sizə ən uyğun açıq layihələri göstərək.",
      mapT: "Layihələr xəritədə", mapHint: "Parlayan ölkələrdə açıq layihə var. Üzərinə klikləyin.",
      from: "Bakı", proj: "layihə", none: "Bu ölkə üçün hazırda açıq layihə yoxdur.", pickC: "Ölkə seçin",
      other: "Ölkəsi xəritədə olmayanlar", details: "Detallara bax", all: "Hamısına bax", official: "Rəsmi səhifə",
      cal: "Təqvimə əlavə et", left: "gün qalıb", today: "Bu gün son gündür", noDl: "Son tarix qeyd olunmayıb",
      qT: "Mənə uyğun layihə", qSub: "5 sual, 1 dəqiqə", start: "Testə başla", back: "Geri", next: "Davam", again: "Yenidən başla",
      of: "/", match: "uyğunluq", res: "Sizin üçün seçdik", noRes: "Bu seçimlərə uyğun açıq layihə tapılmadı. Meyarları dəyişib yenidən yoxlayın.",
      share: "WhatsApp-da paylaş", story: "Story üçün şəkil", seeAll: "Bütün layihələr", any: "Fərqi yoxdur",
      week: "Bu həftə bitən layihələr", copyWa: "WhatsApp üçün kopyala", copied: "Mətn kopyalandı",
      shareHead: "🎯 Global Volunteers testində mənə bu Erasmus+ layihələri çıxdı:", shareTail: "Sən də yoxla:",
      storyHead: "Mənə uyğun Erasmus+ layihələri", storyFoot: "Sən də yoxla: globalvolunteers.page.gd",
      storyDone: "Şəkil hazırdır", storyFail: "Şəkil yaradıla bilmədi",
      q1: "Sizi ən çox nə maraqlandırır?", q2: "Xərclər necə olsun?", q3: "Hansı ölkələrə getmək istəyərdiniz?", q4: "Hansı proqram?", q5: "Müraciətə nə qədər tez hazırsınız?",
      q3h: "Bir neçəsini seçə bilərsiniz.",
      topics: {inc: "🤝 İnklüzivlik və bərabərlik", lead: "🚀 Liderlik və gənclərlə iş", dig: "💻 Rəqəmsal bacarıqlar və media", eco: "🌱 Ekologiya və dayanıqlılıq", well: "🧠 Psixi sağlamlıq və rifah", cre: "🎨 Yaradıcılıq və mədəniyyət", any: "✨ Fərqi yoxdur"},
      costs: {full: "Yalnız tam qarşılananlar", pf: "Tam və ya qismən qarşılananlar", any: "Fərqi yoxdur"},
      progs: {SALTO: "SALTO təlim kursları", ESC: "ESC (Həmrəylik Korpusu)", any: "Fərqi yoxdur"},
      soon: {fast: "⚡ Bu həftə hazıram", mid: "📅 1–2 həftə ərzində", slow: "🌿 Vaxtım var", any: "Fərqi yoxdur"}
    },
    en: {
      k: "EXPLORE", h: "Find a project on the map or take the 1-minute quiz",
      p: "Pick a country, or answer five questions and we'll show the open projects that fit you best.",
      mapT: "Projects on the map", mapHint: "Glowing countries have open projects. Click one.",
      from: "Baku", proj: "projects", none: "No open projects for this country right now.", pickC: "Pick a country",
      other: "Countries not on the map", details: "View details", all: "See all", official: "Official page",
      cal: "Add to calendar", left: "days left", today: "Last day today", noDl: "No deadline listed",
      qT: "Find my project", qSub: "5 questions, 1 minute", start: "Start the quiz", back: "Back", next: "Continue", again: "Start over",
      of: "/", match: "match", res: "Picked for you", noRes: "No open projects match these choices. Change your answers and try again.",
      share: "Share on WhatsApp", story: "Story image", seeAll: "All projects", any: "Doesn't matter",
      week: "Deadlines this week", copyWa: "Copy for WhatsApp", copied: "Text copied",
      shareHead: "🎯 Global Volunteers quiz matched me with these Erasmus+ projects:", shareTail: "Try it too:",
      storyHead: "My Erasmus+ matches", storyFoot: "Try it: globalvolunteers.page.gd",
      storyDone: "Image ready", storyFail: "Couldn't create the image",
      q1: "What interests you most?", q2: "How should costs be covered?", q3: "Which countries would you like to visit?", q4: "Which programme?", q5: "How soon can you apply?",
      q3h: "You can pick several.",
      topics: {inc: "🤝 Inclusion and equality", lead: "🚀 Leadership and youth work", dig: "💻 Digital skills and media", eco: "🌱 Environment and sustainability", well: "🧠 Mental health and well-being", cre: "🎨 Creativity and culture", any: "✨ Doesn't matter"},
      costs: {full: "Fully covered only", pf: "Fully or partly covered", any: "Doesn't matter"},
      progs: {SALTO: "SALTO training courses", ESC: "ESC (Solidarity Corps)", any: "Doesn't matter"},
      soon: {fast: "⚡ Ready this week", mid: "📅 Within 1–2 weeks", slow: "🌿 I have time", any: "Doesn't matter"}
    }
  };
  var KW = {
    inc: ["inclus", "divers", "disab", "minorit", "equal", "accessib", "refugee", "migra", "inklüz", "müxtəlif", "bərabər", "əlillik", "azlıq"],
    lead: ["leader", "youth work", "trainer", "mentor", "coach", "facilitat", "participat", "advocacy", "lobby", "lider", "gənc işi", "təlimçi", "iştirak"],
    dig: ["digital", "media", "tech", "online", "ai ", "artificial", "data", "innovation", "coding", "rəqəm", "texnolo", "innovasiya"],
    eco: ["environment", "climate", "green", "sustain", "nature", "ecolog", "eco-", "outdoor", "ekolo", "iqlim", "ətraf", "təbiət", "dayanıqlı"],
    well: ["mental", "well-being", "wellbeing", "health", "psych", "resilien", "burnout", "stress", "psixi", "sağlam", "rifah"],
    cre: ["art", "creativ", "culture", "cultural", "music", "theat", "film", "design", "storytelling", "heritage", "yaradıcı", "mədəniyy", "incəsənət", "musiqi"]
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
  var Q = {step: 0, a: {topic: null, costs: null, countries: [], prog: null, soon: null}, done: false};

  function ensure(){
    var host = $("#layiheler");
    if (!host) return;
    var sec = $("#kesf");
    if (!sec) {
      sec = el("section", "gv-disc"); sec.id = "kesf"; sec.setAttribute("aria-labelledby", "gvH");
      sec.innerHTML =
        '<div class="wrap"><div class="section-head"><div class="k"></div><h2 id="gvH"></h2><p></p></div>' +
        '<div class="gv-card gv-mapcard" id="gvMap"></div>' +
        '<div class="gv-card gv-quiz" id="gvQuiz"></div>' +
        '<div class="gv-week" id="gvWeek"></div></div>';
      host.parentNode.insertBefore(sec, host.nextSibling);
    }
    var ok = GV.status() === "ok" && openItems().length > 0;
    sec.hidden = !ok;
    if (!ok) return;
    $(".k", sec).textContent = T().k; $("#gvH").textContent = T().h; $(".section-head p", sec).textContent = T().p;
    drawMap(); drawQuiz(); drawWeek();
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

  /* ---------- quiz ---------- */
  function topicHit(p, topic){
    var txt = (" " + p.title + " " + p.about + " ").toLowerCase(), n = 0;
    KW[topic].forEach(function(w){ if (txt.indexOf(w) >= 0) n++; });
    return Math.min(n, 3) / 3;
  }
  function compute(){
    var A = Q.a, W = {topic: 4, country: 3, prog: 2, soon: 1.5}, max = 0;
    if (A.topic && A.topic !== "any") max += W.topic;
    if (A.countries.length) max += W.country;
    if (A.prog && A.prog !== "any") max += W.prog;
    if (A.soon && A.soon !== "any") max += W.soon;
    var out = openItems().filter(function(p){
      if (A.costs === "full") return p.costs === "full";
      if (A.costs === "pf") return p.costs === "full" || p.costs === "partial";
      return true;
    }).map(function(p){
      var s = 0, d = GV.daysLeft(p.deadline);
      if (A.topic && A.topic !== "any") s += W.topic * (topicHit(p, A.topic) > 0 ? .55 + .45 * topicHit(p, A.topic) : 0);
      if (A.countries.length && A.countries.indexOf(p.country) >= 0) s += W.country;
      if (A.prog && A.prog !== "any" && p.program === A.prog) s += W.prog;
      if (A.soon && A.soon !== "any" && d !== null) {
        if (A.soon === "fast" && d <= 7) s += W.soon;
        else if (A.soon === "mid" && d > 7 && d <= 16) s += W.soon;
        else if (A.soon === "slow" && d > 16) s += W.soon;
      }
      return {p: p, s: s, pct: max ? Math.round(s / max * 100) : 0};
    });
    out.sort(function(a, b){
      if (b.s !== a.s) return b.s - a.s;
      var x = GV.daysLeft(a.p.deadline), y = GV.daysLeft(b.p.deadline);
      if (x === null) return 1; if (y === null) return -1; return x - y;
    });
    return {list: out.slice(0, 3), max: max};
  }

  var STEPS = ["topic", "costs", "countries", "prog", "soon"];
  function drawQuiz(){
    var box = $("#gvQuiz"), t = T();
    box.textContent = "";
    var head = el("div", "gv-head");
    head.appendChild(el("h3", null, t.qT));
    head.appendChild(el("p", null, t.qSub));
    box.appendChild(head);
    if (Q.done) return drawResults(box);
    if (Q.step === -1 || (Q.step === 0 && !Q.started)) {
      var intro = el("div", "gv-intro");
      var go = el("button", "btn-primary gv-go", t.start + " →"); go.type = "button"; go.setAttribute("data-qstart", "1");
      intro.appendChild(go);
      box.appendChild(intro); return;
    }
    var bar = el("div", "gv-bar"); var fill = el("i"); fill.style.width = (Q.step / STEPS.length * 100) + "%"; bar.appendChild(fill);
    box.appendChild(bar);
    var meta = el("div", "gv-step", (Q.step + 1) + " " + t.of + " " + STEPS.length); box.appendChild(meta);
    var key = STEPS[Q.step], body = el("div", "gv-qbody in");
    body.appendChild(el("h4", null, t["q" + (Q.step + 1)]));
    var opts = el("div", "gv-opts");
    function opt(label, val, on, multi){
      var b = el("button", "gv-opt" + (on ? " on" : ""), label); b.type = "button"; b.setAttribute("data-q", key); b.setAttribute("data-v", val);
      b.setAttribute("aria-pressed", on ? "true" : "false"); return b;
    }
    if (key === "topic") ["inc", "lead", "dig", "eco", "well", "cre", "any"].forEach(function(v){ opts.appendChild(opt(t.topics[v], v, Q.a.topic === v)); });
    if (key === "costs") ["full", "pf", "any"].forEach(function(v){ opts.appendChild(opt(t.costs[v], v, Q.a.costs === v)); });
    if (key === "prog") ["SALTO", "ESC", "any"].forEach(function(v){ opts.appendChild(opt(t.progs[v], v, Q.a.prog === v)); });
    if (key === "soon") ["fast", "mid", "slow", "any"].forEach(function(v){ opts.appendChild(opt(t.soon[v], v, Q.a.soon === v)); });
    if (key === "countries") {
      var by = byCountry();
      body.appendChild(el("p", "gv-hint", t.q3h));
      Object.keys(by).sort(function(a, b){ return by[b].length - by[a].length || GV.cName(a).localeCompare(GV.cName(b)); }).slice(0, 14).forEach(function(k){
        opts.appendChild(opt(GV.cName(k), k, Q.a.countries.indexOf(k) >= 0));
      });
      opts.appendChild(opt(t.any, "__any", Q.a.countries.length === 0));
    }
    body.appendChild(opts);
    var nav = el("div", "gv-nav");
    if (Q.step > 0) { var bk = el("button", "linklike", "← " + t.back); bk.type = "button"; bk.setAttribute("data-qback", "1"); nav.appendChild(bk); }
    if (key === "countries") { var nx = el("button", "btn-primary gv-go", t.next + " →"); nx.type = "button"; nx.setAttribute("data-qnext", "1"); nav.appendChild(nx); }
    body.appendChild(nav);
    box.appendChild(body);
  }

  function drawResults(box){
    var t = T(), r = compute();
    box.appendChild(el("h4", "gv-res-h", r.list.length ? t.res : t.noRes));
    var list = el("div", "gv-results");
    r.list.forEach(function(x, i){
      var c = miniCard(x.p); c.classList.add("gv-pop"); c.style.animationDelay = (i * 140) + "ms";
      var rank = el("span", "gv-rank", String(i + 1)); c.insertBefore(rank, c.firstChild);
      if (r.max) { var m = el("span", "gv-pct", x.pct + "% " + t.match); c.querySelector(".gv-mini-top").appendChild(m); }
      list.appendChild(c);
    });
    box.appendChild(list);
    var act = el("div", "gv-res-act");
    if (r.list.length) {
      var w = el("button", "btn-primary gv-go", t.share); w.type = "button"; w.setAttribute("data-qshare", "1"); act.appendChild(w);
      var s = el("button", "btn-ghost-dark", "🖼 " + t.story); s.type = "button"; s.setAttribute("data-qstory", "1"); act.appendChild(s);
    }
    var re = el("button", "btn-ghost-dark", "↺ " + t.again); re.type = "button"; re.setAttribute("data-qreset", "1"); act.appendChild(re);
    box.appendChild(act);
    if (r.list.length && !reduce) confetti(box);
  }

  function confetti(box){
    var f = el("div", "gv-confetti"); f.setAttribute("aria-hidden", "true");
    var cols = ["#FFC531", "#1F5EFF", "#4C86FF", "#FF5A6E", "#1FB57A"];
    for (var i = 0; i < 26; i++) {
      var s = el("i"); s.style.left = (Math.random() * 100) + "%"; s.style.background = cols[i % cols.length];
      s.style.animationDelay = (Math.random() * 0.5) + "s"; s.style.animationDuration = (1.4 + Math.random() * 1.2) + "s";
      s.style.transform = "rotate(" + Math.round(Math.random() * 360) + "deg)"; f.appendChild(s);
    }
    box.appendChild(f); setTimeout(function(){ if (f.parentNode) f.parentNode.removeChild(f); }, 3200);
  }

  function shareText(){
    var t = T(), r = compute(), lines = [t.shareHead];
    r.list.forEach(function(x, i){
      lines.push((i + 1) + ". " + x.p.title + (x.p.country ? " (" + GV.cName(x.p.country) + ")" : "") + (x.p.deadline ? " — " + GV.fmtDay(x.p.deadline) : ""));
    });
    lines.push(""); lines.push(t.shareTail + " https://globalvolunteers.page.gd/#kesf");
    return lines.join("\n");
  }

  function wrap(ctx, text, maxW, maxLines){
    var words = String(text).split(/\s+/), lines = [], cur = "";
    words.forEach(function(w){
      var tt = cur ? cur + " " + w : w;
      if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tt;
    });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…"; }
    return lines;
  }
  function rr(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function storyImage(){
    var t = T(), r = compute(), W = 1080, H = 1920;
    function build(logo){
    var cv = doc.createElement("canvas"); cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    function paint(logo){
      var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#0A1B4D"); g.addColorStop(1, "#1F5EFF");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,197,49,.16)"; ctx.beginPath(); ctx.arc(W - 60, 260, 380, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.beginPath(); ctx.arc(80, H - 280, 460, 0, 7); ctx.fill();
      if (logo) { var lw = 360, lh = lw * logo.height / logo.width; ctx.fillStyle = "#fff"; rr(ctx, (W - lw) / 2 - 20, 110, lw + 40, lh + 40, 36); ctx.fill(); ctx.drawImage(logo, (W - lw) / 2, 130, lw, lh); }
      ctx.textAlign = "center"; ctx.fillStyle = "#FFC531"; ctx.font = "700 40px Inter, Arial, sans-serif";
      ctx.fillText("ERASMUS+", W / 2, 640);
      ctx.fillStyle = "#fff"; ctx.font = "800 82px Inter, Arial, sans-serif";
      wrap(ctx, t.storyHead, 900, 2).forEach(function(l, i){ ctx.fillText(l, W / 2, 740 + i * 96); });
      var y = 960;
      r.list.forEach(function(x, i){
        ctx.fillStyle = "#fff"; rr(ctx, 80, y, 920, 250, 32); ctx.fill();
        ctx.fillStyle = "#FFC531"; ctx.beginPath(); ctx.arc(150, y + 70, 36, 0, 7); ctx.fill();
        ctx.fillStyle = "#0A1B4D"; ctx.font = "800 40px Inter, Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(i + 1), 150, y + 84);
        ctx.textAlign = "left"; ctx.font = "700 40px Inter, Arial, sans-serif";
        wrap(ctx, x.p.title, 740, 2).forEach(function(l, j){ ctx.fillText(l, 215, y + 66 + j * 50); });
        ctx.fillStyle = "#4F5B7D"; ctx.font = "500 32px Inter, Arial, sans-serif";
        var meta = [x.p.country ? GV.cName(x.p.country) : "", x.p.deadline ? GV.fmtDay(x.p.deadline) : ""].filter(Boolean).join("  ·  ");
        ctx.fillText(meta, 215, y + 200);
        y += 290;
      });
      ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "600 38px Inter, Arial, sans-serif";
      ctx.fillText(t.storyFoot, W / 2, H - 130);
    }
    return new Promise(function(res, rej){
      try { paint(logo); cv.toBlob(function(b){ b ? res(b) : rej(new Error("blob")); }, "image/png"); } catch(e){ rej(e); }
    });
    }
    return new Promise(function(res, rej){
      var im = new Image();
      im.onload = function(){ build(im).then(res, function(){ build(null).then(res, rej); }); };
      im.onerror = function(){ build(null).then(res, rej); };
      im.src = "images/logo.png";
    });
  }

  /* ---------- bu həftə bitənlər ---------- */
  function drawWeek(){
    var box = $("#gvWeek"), t = T(); box.textContent = "";
    var wk = openItems().filter(function(p){ var d = GV.daysLeft(p.deadline); return d !== null && d <= 7; })
      .sort(function(a, b){ return GV.daysLeft(a.deadline) - GV.daysLeft(b.deadline); });
    box.hidden = !wk.length; if (!wk.length) return;
    var h = el("div", "gv-week-h"); h.appendChild(el("b", null, "⏰ " + t.week + " (" + wk.length + ")"));
    var c = el("button", "btn-ghost-dark", t.copyWa); c.type = "button"; c.setAttribute("data-weekcopy", "1"); h.appendChild(c);
    box.appendChild(h);
    var ul = el("ul");
    wk.forEach(function(p){ var li = el("li"); var b = el("button", "linklike", p.title); b.type = "button"; b.setAttribute("data-show", p.id); li.appendChild(b); li.appendChild(el("span", null, GV.fmtDay(p.deadline) + " · " + leftTxt(p))); ul.appendChild(li); });
    box.appendChild(ul);
  }
  function weekText(){
    var t = T(), wk = openItems().filter(function(p){ var d = GV.daysLeft(p.deadline); return d !== null && d <= 7; })
      .sort(function(a, b){ return GV.daysLeft(a.deadline) - GV.daysLeft(b.deadline); });
    var lines = ["⏰ " + t.week + ":"];
    wk.forEach(function(p){ lines.push("• " + p.title + (p.country ? " (" + GV.cName(p.country) + ")" : "") + " — " + GV.fmtDay(p.deadline)); });
    lines.push(""); lines.push("https://globalvolunteers.page.gd/");
    return lines.join("\n");
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
    if (e.target.closest("[data-weekcopy]")) { GV.copyText(weekText()).then(function(){ GV.toast(T().copied); }); return; }
    if (e.target.closest("[data-qstart]")) { Q.started = true; Q.step = 0; drawQuiz(); return; }
    if ((n = e.target.closest(".gv-opt"))) {
      var key = n.getAttribute("data-q"), v = n.getAttribute("data-v");
      if (key === "countries") {
        if (v === "__any") Q.a.countries = [];
        else { var i = Q.a.countries.indexOf(v); if (i >= 0) Q.a.countries.splice(i, 1); else Q.a.countries.push(v); }
        drawQuiz(); return;
      }
      Q.a[key] = v;
      setTimeout(function(){ if (Q.step < STEPS.length - 1) { Q.step++; drawQuiz(); } else { Q.done = true; drawQuiz(); } }, reduce ? 0 : 160);
      n.classList.add("on"); return;
    }
    if (e.target.closest("[data-qnext]")) { Q.step++; drawQuiz(); return; }
    if (e.target.closest("[data-qback]")) { if (Q.step > 0) Q.step--; drawQuiz(); return; }
    if (e.target.closest("[data-qreset]")) { Q = {step: 0, started: true, a: {topic: null, costs: null, countries: [], prog: null, soon: null}, done: false}; drawQuiz(); return; }
    if (e.target.closest("[data-qshare]")) {
      var txt = shareText();
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) { navigator.share({text: txt}).catch(function(){}); }
      else window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank", "noopener");
      return;
    }
    if (e.target.closest("[data-qstory]")) {
      storyImage().then(function(blob){
        var f = null; try { f = new File([blob], "global-volunteers-story.png", {type: "image/png"}); } catch(x){}
        if (f && navigator.canShare && navigator.canShare({files: [f]})) { return navigator.share({files: [f]}).catch(function(){}); }
        var a = doc.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "global-volunteers-story.png";
        doc.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        GV.toast(T().storyDone);
      }).catch(function(){ GV.toast(T().storyFail); });
      return;
    }
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
