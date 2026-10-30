/* Ümumi sayt axtarışı: layihələr, paketlər, xidmətlər, FAQ və məlumat pəncərələri.
   Axtarış indeksi hazırda göstərilən dilin (AZ/EN) səhifəsindən yığılır. Azərbaycan hərfləri (ə, ı, ö, ü, ç, ş, ğ)
   yazılmasa da tapır. Açmaq üçün: başlıqdakı böyüdücü şüşə, "/" və ya Ctrl/⌘+K. */
(function(){
  "use strict";
  var doc = document, app = doc.getElementById("app");
  var GV = window.GV;
  if (!app || !GV) return;

  var TXT = {
    az: {
      title: "Saytda axtarış", ph: "Layihə, paket, xidmət və ya sual axtarın…", close: "Bağla",
      none: "Heç nə tapılmadı. Başqa söz yoxlayın.", hint: "Məsələn:",
      sugg: ["ESC", "Europass CV", "Motivasiya məktubu", "Sending Organization", "Viza", "Qiymət"],
      groups: {project: "Layihələr", package: "Paketlər", service: "Xidmətlər", faq: "Suallar (FAQ)", info: "Məlumat"},
      kbd: "Esc"
    },
    en: {
      title: "Search the site", ph: "Search projects, packages, services or questions…", close: "Close",
      none: "Nothing found. Try another word.", hint: "For example:",
      sugg: ["ESC", "Europass CV", "Motivation letter", "Sending Organization", "Visa", "Price"],
      groups: {project: "Projects", package: "Packages", service: "Services", faq: "Questions (FAQ)", info: "Information"},
      kbd: "Esc"
    }
  };
  var ORDER = ["project", "package", "service", "faq", "info"];
  var MAX_PER_GROUP = 6;

  function L(){ return doc.documentElement.lang === "en" ? "en" : "az"; }
  function T(){ return TXT[L()]; }
  function $$(s, r){ return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function el(tag, cls, text){ var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function txt(n){ return (n && n.textContent || "").replace(/\s+/g, " ").trim(); }

  /* Azərbaycan hərflərini sadələşdirir: uzunluğu dəyişmir, ona görə işarələmə mövqeləri orijinala uyğun gəlir */
  var MAP = {"ə": "e", "Ə": "e", "ı": "i", "İ": "i", "I": "i", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u", "ç": "c", "Ç": "c", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g"};
  function norm(s){
    var r = String(s == null ? "" : s).replace(/[əƏıİIöÖüÜçÇşŞğĞ]/g, function(c){ return MAP[c]; }).toLowerCase();
    try { r = r.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch(e){}
    return r;
  }

  /* ---------- indeks ---------- */
  var entries = [];
  function add(type, title, body, go, meta){
    title = title || ""; body = body || "";
    if (!title && !body) return;
    entries.push({type: type, title: title, body: body, tn: norm(title), bn: norm(body), go: go, meta: meta || ""});
  }
  function flash(n){
    if (!n) return;
    n.classList.remove("search-hit"); void n.offsetWidth; n.classList.add("search-hit");
    setTimeout(function(){ n.classList.remove("search-hit"); }, 2400);
  }
  function jump(n, prog){
    return function(){
      if (prog && GV.showProgram) GV.showProgram(prog);
      setTimeout(function(){ n.scrollIntoView({behavior: "smooth", block: "center"}); flash(n); }, 60);
    };
  }
  function openModalThen(id, after){
    return function(){ if (GV.openModal) GV.openModal(id); if (after) setTimeout(after, 80); };
  }

  function build(){
    entries = [];
    var az = L() === "az";

    /* layihələr (müddəti bitməyənlər) */
    (GV.items() || []).forEach(function(p){
      var d = GV.daysLeft(p.deadline);
      if (d !== null && d < 0) return;
      var prog = p.program === "ESC" ? "ESC" : p.program === "OTHER" ? (az ? "Digər" : "Other") : "SALTO Youth";
      var meta = [prog, GV.cName(p.country), p.deadline ? ((az ? "Son tarix: " : "Deadline: ") + GV.fmtDay(p.deadline)) : ""].filter(Boolean).join(" · ");
      add("project", p.title, [GV.cName(p.country), p.country, p.about].join(" "), function(){ GV.showProject(p.id); }, meta);
    });

    /* proqramlar (ESC / SALTO Youth) */
    $$(".prog-tab", app).forEach(function(n){
      var prog = n.getAttribute("data-prog");
      add("info", txt($(".pt-name", n)) + " — " + txt($(".pt-sub", n)), txt($(".pt-text", n)), function(){
        if (GV.showProgram) GV.showProgram(prog);
        var s = doc.getElementById("paketler"); if (s) { s.scrollIntoView({behavior: "smooth", block: "start"}); flash(n); }
      }, txt($(".pt-tag", n)));
    });

    /* paketlər */
    $$(".pkg", app).forEach(function(n){
      var panel = n.closest(".prog-panel");
      var label = panel ? panel.getAttribute("data-label") : "";
      var title = (label ? label + " · " : "") + txt($(".pkg-name", n)) + " — " + txt($(".pkg-count", n));
      add("package", title, txt($(".pkg-pay", n)) + " " + txt($("ul", n)), jump(n, panel ? panel.getAttribute("data-prog") : ""), "");
    });

    /* ESC addımları və ayrıca xidmətlər */
    $$(".esc-step", app).forEach(function(n){
      var t = txt($(".st-t", n));
      var phase = n.closest(".esc-phase");
      var meta = phase ? "ESC · " + txt($(".ph-top h4", phase)) : "ESC";
      add("service", t, txt(n), jump(n, "esc"), meta);
    });

    /* sayt bölmələri: üzvlük, konsultasiya, proses addımları, qeydlər */
    $$(".member-card, .consult-card, .strip-card, .step", app).forEach(function(n){
      var h = $("h2, h3", n);
      add("info", txt(h), txt(n), jump(n), "");
    });

    /* FAQ */
    $$("#faqModal .faq-item").forEach(function(n){
      var qn = $(".faq-q", n);
      add("faq", txt(qn), txt($(".faq-a", n)), openModalThen("faqModal", function(){
        $$("#faqModal .faq-item.open").forEach(function(o){ if (o !== n) { o.classList.remove("open"); var b = $(".faq-q", o); if (b) b.setAttribute("aria-expanded", "false"); } });
        n.classList.add("open"); if (qn) qn.setAttribute("aria-expanded", "true");
        setTimeout(function(){ n.scrollIntoView({block: "nearest"}); flash(n); }, 120);
      }), "");
    });

    /* məlumat pəncərələri */
    ["sendingOrgModal", "aboutModal", "termsModal", "privacyModal"].forEach(function(id){
      var m = doc.getElementById(id);
      if (!m) return;
      var h3 = $("h3", m);
      add("info", txt(h3), txt($(".modal", m)), openModalThen(id), "");
      /* alt başlıqlar da ayrıca tapılsın (məs., "Geri qaytarma", "Ödəniş üsulları") */
      $$("h4", m).forEach(function(h4){
        var body = [], n = h4.nextElementSibling;
        while (n && n.tagName !== "H4") { body.push(txt(n)); n = n.nextElementSibling; }
        add("info", txt(h3) + " — " + txt(h4), body.join(" "), openModalThen(id, function(){ h4.scrollIntoView({block: "start"}); flash(h4); }), "");
      });
    });
  }
  function $(s, r){ return (r || doc).querySelector(s); }

  /* ---------- axtarış ---------- */
  function search(q){
    var toks = norm(q).split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    var res = [];
    entries.forEach(function(e){
      var score = 0, ok = true;
      for (var i = 0; i < toks.length; i++) {
        var ti = e.tn.indexOf(toks[i]), bi = e.bn.indexOf(toks[i]);
        if (ti < 0 && bi < 0) { ok = false; break; }
        score += ti >= 0 ? (ti === 0 ? 14 : 9) : 3;
      }
      if (!ok) return;
      if (e.type === "package" || e.type === "service") score += 2;
      res.push({e: e, s: score});
    });
    res.sort(function(a, b){ return b.s - a.s; });
    return {toks: toks, list: res};
  }

  /* mətndə tapılan sözləri <mark> ilə işarələyir (DOM ilə, innerHTML-siz: layihə mətnləri təhlükəsiz qalır) */
  function highlight(parent, text, toks){
    var nt = norm(text), ranges = [];
    toks.forEach(function(t){
      var i = 0;
      while ((i = nt.indexOf(t, i)) >= 0) { ranges.push([i, i + t.length]); i += t.length; }
    });
    ranges.sort(function(a, b){ return a[0] - b[0]; });
    var merged = [];
    ranges.forEach(function(r){
      var l = merged[merged.length - 1];
      if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else merged.push([r[0], r[1]]);
    });
    var pos = 0;
    merged.forEach(function(r){
      if (r[0] > pos) parent.appendChild(doc.createTextNode(text.slice(pos, r[0])));
      parent.appendChild(el("mark", null, text.slice(r[0], r[1])));
      pos = r[1];
    });
    if (pos < text.length) parent.appendChild(doc.createTextNode(text.slice(pos)));
  }
  function snippet(e, toks){
    var body = e.body; if (!body) return "";
    var nb = norm(body), at = -1;
    for (var i = 0; i < toks.length; i++) { var k = nb.indexOf(toks[i]); if (k >= 0 && (at < 0 || k < at)) at = k; }
    var len = 130;
    if (at < 0 || at < 40) return body.length > len ? body.slice(0, len).replace(/\s+\S*$/, "") + "…" : body;
    var start = Math.max(0, at - 40), s = body.slice(start, start + len);
    return "…" + s.replace(/^\S*\s+/, "") + (start + len < body.length ? "…" : "");
  }

  var ov = null, input = null, box = null, active = [];
  function ensure(){
    if (ov) return;
    ov = el("div", "modal-overlay search-overlay"); ov.id = "searchModal"; ov.setAttribute("aria-hidden", "true");
    var m = el("div", "modal search-modal"); m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "searchTitle"); m.tabIndex = -1;
    var h = el("h3", "sr-title"); h.id = "searchTitle"; m.appendChild(h);
    var cb = el("button", "close-btn", "✕"); cb.type = "button"; cb.setAttribute("data-close", ""); m.appendChild(cb);
    var wrap = el("div", "sr-input-wrap");
    wrap.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
    input = el("input", "sr-input"); input.type = "search"; input.autocomplete = "off"; input.spellcheck = false; input.setAttribute("enterkeyhint", "search");
    wrap.appendChild(input);
    m.appendChild(wrap);
    box = el("div", "sr-box"); box.setAttribute("aria-live", "polite"); m.appendChild(box);
    ov.appendChild(m); doc.body.appendChild(ov);

    input.addEventListener("input", function(){ render(input.value); });
    ov.addEventListener("keydown", function(e){
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        var items = $$(".sr-item", ov); if (!items.length) return;
        var i = items.indexOf(doc.activeElement), n;
        if (e.key === "ArrowDown") n = i < 0 ? 0 : Math.min(items.length - 1, i + 1);
        else n = i <= 0 ? -1 : i - 1;
        e.preventDefault();
        if (n < 0) input.focus(); else items[n].focus();
      } else if (e.key === "Enter" && doc.activeElement === input) {
        var f = $(".sr-item", ov); if (f) { e.preventDefault(); f.click(); }
      }
    });
    ov.addEventListener("click", function(e){
      var sg = e.target.closest ? e.target.closest(".sr-chip") : null;
      if (sg) { input.value = sg.getAttribute("data-q"); render(input.value); input.focus(); return; }
      var it = e.target.closest ? e.target.closest(".sr-item") : null;
      if (!it) return;
      var go = active[+it.getAttribute("data-i")];
      if (!go) return;
      close();
      setTimeout(go, 40);
    });
  }

  function render(q){
    var tr = T();
    box.textContent = "";
    active = [];
    if (norm(q).trim().length < 2) {
      var hint = el("div", "sr-hint"); hint.appendChild(el("span", null, tr.hint));
      var wrap = el("div", "sr-sugg");
      tr.sugg.forEach(function(s){ var b = el("button", "sr-chip", s); b.type = "button"; b.setAttribute("data-q", s); wrap.appendChild(b); });
      box.appendChild(hint); box.appendChild(wrap);
      return;
    }
    var r = search(q), groups = {};
    r.list.forEach(function(x){ (groups[x.e.type] = groups[x.e.type] || []).push(x.e); });
    var any = false;
    ORDER.forEach(function(type){
      var arr = groups[type]; if (!arr || !arr.length) return;
      any = true;
      box.appendChild(el("div", "sr-group", tr.groups[type]));
      var ul = el("ul", "sr-list");
      arr.slice(0, MAX_PER_GROUP).forEach(function(e){
        var li = el("li"), b = el("button", "sr-item"); b.type = "button"; b.setAttribute("data-i", active.length);
        active.push(e.go);
        var t = el("div", "sr-t"); highlight(t, e.title, r.toks); b.appendChild(t);
        if (e.meta) b.appendChild(el("div", "sr-m", e.meta));
        var sn = snippet(e, r.toks);
        if (sn) { var sd = el("div", "sr-s"); highlight(sd, sn, r.toks); b.appendChild(sd); }
        li.appendChild(b); ul.appendChild(li);
      });
      box.appendChild(ul);
    });
    if (!any) box.appendChild(el("p", "sr-empty", tr.none));
  }

  function open(){
    ensure();
    var tr = T();
    $("#searchTitle", ov).textContent = tr.title;
    input.placeholder = tr.ph; input.setAttribute("aria-label", tr.ph);
    $(".close-btn", ov).setAttribute("aria-label", tr.close);
    build();
    input.value = "";
    render("");
    if (GV.openModal) GV.openModal("searchModal");
    else { ov.classList.add("open"); ov.setAttribute("aria-hidden", "false"); doc.body.classList.add("modal-open"); }
    setTimeout(function(){ input.focus(); }, 30);
  }
  function close(){
    if (!ov) return;
    ov.classList.remove("open"); ov.setAttribute("aria-hidden", "true");
    if (!$(".modal-overlay.open")) doc.body.classList.remove("modal-open");
  }

  doc.addEventListener("click", function(e){
    var b = e.target.closest ? e.target.closest("[data-search-open]") : null;
    if (b) { e.preventDefault(); open(); }
  });
  doc.addEventListener("keydown", function(e){
    var tg = e.target, typing = tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.tagName === "SELECT" || tg.isContentEditable);
    if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); open(); return; }
    if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); open(); }
  });

  GV.openSearch = open;
})();
