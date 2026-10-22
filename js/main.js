(function(){
  "use strict";

  /* ===== SİZİN DƏYİŞƏ BİLƏCƏYİNİZ YERLƏR / SETTINGS YOU CAN EDIT ===== */
  var CONFIG = {
    // Formu e-poçta göndərmək üçün Formspree ünvanını yazın, məs.: "https://formspree.io/f/xxxxxxx"
    // Boş qalsa, form doldurulanda WhatsApp mesajı hazır mətnlə açılır.
    FORM_ENDPOINT: "",
    // Əlaqə nömrələri: nömrəni YALNIZ burada dəyişin (saytdakı bütün düymə və yazılar buradan yenilənir).
    // *_NUMBER — yalnız rəqəmlər (wa.me linki üçün), *_DISPLAY — ekranda görünən yazılış.
    WA_NUMBER: "994706386353",
    WA_DISPLAY: "+994 70 638 63 53",
    CONSULT_NUMBER: "994706386353",
    CONSULT_DISPLAY: "+994 70 638 63 53",
    // Aylıq qalan yer sayı. Rəqəm yazsanız ("Bu ay qalan yer: 3") göstərilir; null olsa ümumi qeyd qalır.
    SLOTS_LEFT: null,
    // Layihə siyahısı və admin panel üçün Firebase məlumatları (təlimata bax). Boş olsa, "Layihələr" bölməsi gizlədilir.
    FIREBASE: { apiKey: "AIzaSyAmevepL4pzg1A0rHVBsSniLOs9KSotgZ8", authDomain: "gloabalvolunteers.firebaseapp.com", databaseURL: "https://gloabalvolunteers-default-rtdb.europe-west1.firebasedatabase.app", projectId: "gloabalvolunteers", appId: "1:260105716392:web:d860ca8c2e003d4bbbf89d" }
  };
  /* ================================================================== */

  var LOGO = "images/logo-icon.png", LOGO_FULL = "images/logo.png";
  var I18N = {"az": {"pj_member": "Üzv ol", "member_wa": "Salam%21%20Sending%20Organization%20%C3%BCzvl%C3%BCy%C3%BC%20il%C9%99%20maraqlan%C4%B1ram%2C%20%C3%BCzv%20olmaq%20ist%C9%99yir%C9%99m%20%F0%9F%99%82", "slots": "Bu ay qalan yer: <b>{n}<\/b>", "ok": "Təşəkkür edirik! Müraciətiniz göndərildi, tezliklə sizinlə əlaqə saxlayacağıq.", "err": "Göndərmək alınmadı. Zəhmət olmasa WhatsApp ilə yazın.", "wa": "WhatsApp açılır — mesajı göndərməyi unutmayın.", "wa_text": "Salam! Qısa müraciət:\nAd: {name}\nYaş: {age}\nMaraq: {interest}\nPaket: {pkg}\nƏlaqə: {contact}", "pj_loading": "Layihələr yüklənir…", "pj_err": "Layihələri yükləmək alınmadı. Səhifəni yeniləyin.", "pj_none": "Hələlik layihə əlavə olunmayıb.", "pj_none_f": "Seçdiyiniz filtrlərə uyğun layihə tapılmadı.", "pj_more_btn": "Daha çox göstər ({n})", "pj_found": "{n} layihə tapıldı", "pj_country": "Ölkə", "pj_deadline": "Son tarix", "pj_dates": "Tarixlər", "pj_left": "{n} gün qalıb", "pj_today": "Bu gün son gün", "pj_expired": "Bitib", "pj_official": "Rəsmi linkə bax", "pj_copy": "Linki kopyala", "pj_copied": "Link kopyalandı", "pj_copy_fail": "Kopyalamaq alınmadı", "pj_wa": "WhatsApp-a göndər", "pj_more": "Daha çox", "pj_less": "Daha az", "pj_so": "Layihələrə müraciət etmək üçün Sending Organization tələb olunur.", "pj_so_more": "Ətraflı", "pj_wa_text": "Salam! Bu layihəyə müraciət etmək istəyirəm:\n{title}\nSon tarix: {deadline}\n{link}", "cost_full": "Tam qarşılanır", "cost_partial": "Qismən qarşılanır", "cost_none": "Qarşılanmır", "ap_show": "Form yaz", "ap_hide": "Formu gizlət"}, "en": {"pj_member": "Become a member", "member_wa": "Hello%21%20I%27d%20like%20to%20become%20a%20member%20%28Sending%20Organization%29.%20Could%20you%20tell%20me%20how%3F%20%F0%9F%99%82", "slots": "Spots left this month: <b>{n}<\/b>", "ok": "Thank you! Your request has been sent — we will contact you soon.", "err": "Sending failed. Please message us on WhatsApp instead.", "wa": "Opening WhatsApp — please remember to send the message.", "wa_text": "Hello! Quick request:\nName: {name}\nAge: {age}\nInterest: {interest}\nPackage: {pkg}\nContact: {contact}", "pj_loading": "Loading projects…", "pj_err": "Could not load the projects. Please refresh the page.", "pj_none": "No projects have been added yet.", "pj_none_f": "No projects match your filters.", "pj_more_btn": "Show more ({n})", "pj_found": "{n} projects found", "pj_country": "Country", "pj_deadline": "Deadline", "pj_dates": "Dates", "pj_left": "{n} days left", "pj_today": "Last day today", "pj_expired": "Expired", "pj_official": "Official page", "pj_copy": "Copy link", "pj_copied": "Link copied", "pj_copy_fail": "Could not copy", "pj_wa": "Send on WhatsApp", "pj_more": "Read more", "pj_less": "Read less", "pj_so": "A Sending Organization is required to apply to projects.", "pj_so_more": "Learn more", "pj_wa_text": "Hello! I would like to apply to this project:\n{title}\nDeadline: {deadline}\n{link}", "cost_full": "Fully covered", "cost_partial": "Partially covered", "cost_none": "Not covered", "ap_show": "Write a request", "ap_hide": "Hide the form"}};
  var META = {"az": {"title": "Global Volunteers — Erasmus+ Dəstək Paketləri", "desc": "Erasmus+ layihələrinə müraciət dəstəyi: profilə uyğun layihə seçimi, fərdi motivasiya məktubu və viza dəstəyi. Yekun ödəniş yalnız qəbul olduqda."}, "en": {"title": "Global Volunteers — Erasmus+ Support Packages", "desc": "Application support for Erasmus+ projects: project matching, a personal motivation letter and visa support. The final payment is due only if you are accepted."}};
  var $ = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var app = $("#app");
  var HTML = { az: app.innerHTML, en: $("#tpl-en").innerHTML };   /* taken before logos are filled in */
  function L(){ return document.documentElement.lang === "en" ? "en" : "az"; }
  function t(k){ return I18N[L()][k]; }
  function fill(tpl, m){ return tpl.replace(/\{(\w+)\}/g, function(_, k){ return m[k] != null ? m[k] : ""; }); }

  /* --- logo (embedded once), favicon, slots counter --- */
  function decorate(){
    $$("img[data-logo]").forEach(function(i){ i.src = i.classList.contains("hero-logo") ? LOGO_FULL : LOGO; });
    if (typeof CONFIG.SLOTS_LEFT === "number") {
      var s = $("#slotsText");
      if (s) s.innerHTML = t("slots").replace("{n}", CONFIG.SLOTS_LEFT);
    }
  }
  var ic = document.createElement("link"); ic.rel = "icon"; ic.href = LOGO; document.head.appendChild(ic);

  /* --- language switch (AZ / EN inside the same file) --- */
  function setLang(l){
    if ((l !== "az" && l !== "en") || l === L()) return;
    $$(".modal-overlay.open").forEach(function(o){ closeModal(o, true); });
    document.body.classList.remove("modal-open");
    app.innerHTML = HTML[l];
    document.documentElement.lang = l;
    document.title = META[l].title;
    var d = $('meta[name="description"]'); if (d) d.setAttribute("content", META[l].desc);
    decorate();
    renderProjects();
    try {
      var u = new URL(location.href);
      if (l === "en") u.searchParams.set("lang", "en"); else u.searchParams.delete("lang");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch(e){}
  }

  /* --- modals --- */
  var lastFocus = null;
  function openModal(id){
    var ov = document.getElementById(id);
    if (!ov) return;
    $$(".modal-overlay.open").forEach(function(o){ if (o !== ov) closeModal(o, true); });
    if (!ov.classList.contains("open")) lastFocus = document.activeElement;
    ov.classList.add("open");
    ov.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    var m = $(".modal", ov); if (m) m.focus();
  }
  function closeModal(ov, keepFocus){
    ov.classList.remove("open");
    ov.setAttribute("aria-hidden", "true");
    if (!$(".modal-overlay.open")) document.body.classList.remove("modal-open");
    if (!keepFocus && lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  document.addEventListener("click", function(e){
    var sw = e.target.closest("[data-set-lang]");
    if (sw) { e.preventDefault(); setLang(sw.getAttribute("data-set-lang")); return; }
    var opener = e.target.closest("[data-open]");
    if (opener) { e.preventDefault(); openModal(opener.getAttribute("data-open")); return; }
    var closer = e.target.closest("[data-close]");
    if (closer) { closeModal(closer.closest(".modal-overlay")); return; }
    if (e.target.classList && e.target.classList.contains("modal-overlay")) { closeModal(e.target); return; }
    var q = e.target.closest(".faq-q");
    if (q) {
      var item = q.parentElement;
      var open = item.classList.toggle("open");
      q.setAttribute("aria-expanded", open ? "true" : "false");
    }
  });
  document.addEventListener("keydown", function(e){
    var ov = $(".modal-overlay.open");
    if (!ov) return;
    if (e.key === "Escape") { closeModal(ov); return; }
    if (e.key === "Tab") {
      var f = $$("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])", ov)
        .filter(function(x){ return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length-1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === $(".modal", ov))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* --- application form (event delegation, survives language switch) --- */
  function say(text, isErr){ var m = $("#formMsg"); m.textContent = text; m.className = "form-msg" + (isErr ? " err" : ""); }
  function waLink(d){
    var tx = fill(t("wa_text"), {name: d.name, age: d.age, interest: d.interest, pkg: d.package, contact: d.contact});
    return "https://wa.me/" + CONFIG.WA_NUMBER + "?text=" + encodeURIComponent(tx);
  }
  document.addEventListener("submit", function(e){
    var form = e.target;
    if (!form || form.id !== "applyForm") return;
    e.preventDefault();
    if (form.elements.website.value) return;               /* honeypot (spam) */
    var d = {
      name: form.elements.name.value.trim(),
      age: form.elements.age.value.trim(),
      interest: form.elements.interest.value,
      package: form.elements["package"].value,
      contact: form.elements.contact.value.trim(),
      lang: L(),
      page: location.href
    };
    if (CONFIG.FORM_ENDPOINT) {
      var btn = $(".submit", form); btn.disabled = true;
      fetch(CONFIG.FORM_ENDPOINT, {
        method: "POST",
        headers: {"Content-Type": "application/json", "Accept": "application/json"},
        body: JSON.stringify(d)
      }).then(function(r){
        if (!r.ok) throw new Error("bad status");
        form.reset(); say(t("ok"), false);
      }).catch(function(){
        say(t("err"), true);
      }).then(function(){ btn.disabled = false; });
    } else {
      say(t("wa"), false);
      window.open(waLink(d), "_blank", "noopener");
    }
  });


  /* =====================================================================
     PROJECTS (public list, read from Firebase Realtime Database through its REST API)
     ===================================================================== */
  var WA_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.29-.15-1.7-.84-1.97-.93-.26-.1-.46-.15-.65.15-.19.29-.75.93-.92 1.12-.17.19-.34.22-.63.07-.29-.15-1.22-.45-2.32-1.43-.86-.76-1.44-1.71-1.6-2-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.65-1.57-.9-2.15-.24-.57-.48-.5-.65-.5-.17-.01-.36-.01-.56-.01-.19 0-.51.07-.78.36-.26.29-1.02 1-1.02 2.43s1.05 2.82 1.19 3.01c.15.19 2.06 3.15 5 4.42.7.3 1.24.48 1.67.61.7.22 1.34.19 1.84.12.56-.08 1.7-.7 1.94-1.37.24-.68.24-1.26.17-1.37-.07-.12-.26-.19-.55-.34z"/><path d="M12.02 2C6.5 2 2 6.48 2 12c0 1.85.5 3.65 1.44 5.23L2 22l4.9-1.28A9.96 9.96 0 0 0 12.02 22C17.55 22 22 17.52 22 12S17.55 2 12.02 2zm0 18.18c-1.63 0-3.23-.44-4.62-1.27l-.33-.2-3.16.83.84-3.08-.22-.32A8.17 8.17 0 0 1 3.82 12c0-4.53 3.68-8.2 8.2-8.2s8.19 3.67 8.19 8.2-3.67 8.18-8.19 8.18z"/></svg>';
  var COUNTRIES = [["Albania", "Albaniya"], ["Algeria", "Əlcəzair"], ["Armenia", "Ermənistan"], ["Austria", "Avstriya"], ["Azerbaijan", "Azərbaycan"], ["Belarus", "Belarus"], ["Belgium", "Belçika"], ["Bosnia and Herzegovina", "Bosniya və Herseqovina"], ["Bulgaria", "Bolqarıstan"], ["Croatia", "Xorvatiya"], ["Cyprus", "Kipr"], ["Czechia", "Çexiya"], ["Denmark", "Danimarka"], ["Egypt", "Misir"], ["Estonia", "Estoniya"], ["Finland", "Finlandiya"], ["France", "Fransa"], ["Georgia", "Gürcüstan"], ["Germany", "Almaniya"], ["Greece", "Yunanıstan"], ["Hungary", "Macarıstan"], ["Iceland", "İslandiya"], ["India", "Hindistan"], ["Ireland", "İrlandiya"], ["Israel", "İsrail"], ["Italy", "İtaliya"], ["Jordan", "İordaniya"], ["Kazakhstan", "Qazaxıstan"], ["Kosovo", "Kosovo"], ["Kyrgyzstan", "Qırğızıstan"], ["Latvia", "Latviya"], ["Lebanon", "Livan"], ["Liechtenstein", "Lixtenşteyn"], ["Lithuania", "Litva"], ["Luxembourg", "Lüksemburq"], ["Malta", "Malta"], ["Moldova", "Moldova"], ["Montenegro", "Monteneqro"], ["Morocco", "Mərakeş"], ["Netherlands", "Niderland"], ["Nigeria", "Nigeriya"], ["North Macedonia", "Şimali Makedoniya"], ["Norway", "Norveç"], ["Palestine", "Fələstin"], ["Poland", "Polşa"], ["Portugal", "Portuqaliya"], ["Romania", "Rumıniya"], ["Serbia", "Serbiya"], ["Slovakia", "Slovakiya"], ["Slovenia", "Sloveniya"], ["Spain", "İspaniya"], ["Sweden", "İsveç"], ["Switzerland", "İsveçrə"], ["Tajikistan", "Tacikistan"], ["Tunisia", "Tunis"], ["Turkey", "Türkiyə"], ["Ukraine", "Ukrayna"], ["United Kingdom", "Birləşmiş Krallıq"], ["Uzbekistan", "Özbəkistan"], ["Online", "Onlayn"], ["Multiple countries", "Bir neçə ölkə"]];
  var cEN2AZ = {};
  COUNTRIES.forEach(function(c){ cEN2AZ[c[0]] = c[1]; });
  function cName(v){ return (L() === "az" && cEN2AZ[v]) ? cEN2AZ[v] : v; }

  var state = { status: CONFIG.FIREBASE.databaseURL ? "loading" : "off", items: [], q: "", program: "", country: "", costs: "", expired: false, focus: "", scrolled: false, limit: 3 };
  var PAGE = 3, STEP = 6;

  function el(tag, cls, text){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function safeUrl(u){ return /^https?:\/\//i.test(u || "") ? u : ""; }
  function parseDay(s){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function fmtDay(s){
    var d = parseDay(s); if (!d) return "";
    var M = L() === "az"
      ? ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return d.getDate() + " " + M[d.getMonth()] + " " + d.getFullYear();
  }
  function daysLeft(s){
    var d = parseDay(s); if (!d) return null;
    var n = new Date(), today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((d - today) / 864e5);
  }
  function projectUrl(id){
    var base = location.protocol === "file:" ? "https://globalvolunteers.page.gd/" : location.origin + location.pathname;
    return base + "?p=" + encodeURIComponent(id);
  }
  function waProject(p){
    var txt = fill(t("pj_wa_text"), {title: p.title, deadline: fmtDay(p.deadline) || "—", link: projectUrl(p.id)});
    return "https://wa.me/" + CONFIG.WA_NUMBER + "?text=" + encodeURIComponent(txt);
  }

  function str(v){ return typeof v === "string" ? v : ""; }
  function loadProjects(){
    var fb = CONFIG.FIREBASE;
    if (!fb.databaseURL) { state.status = "off"; return Promise.resolve(); }
    var url = fb.databaseURL.replace(/\/+$/, "") + "/projects.json";
    return fetch(url).then(function(r){
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function(j){
      var items = [];
      if (j && typeof j === "object") {
        Object.keys(j).forEach(function(id){
          var f = j[id];
          if (!f || typeof f !== "object") return;
          items.push({
            id: id, title: str(f.title), program: str(f.program), country: str(f.country),
            deadline: str(f.deadline), start: str(f.startDate), end: str(f.endDate),
            link: str(f.link), costs: str(f.costs), about: str(f.about)
          });
        });
      }
      state.items = items; state.status = "ok";
    }).catch(function(){ state.status = "err"; });
  }

  function visibleItems(){
    var q = state.q.trim().toLowerCase();
    return state.items.filter(function(p){
      if (p.id === state.focus) return true;
      var dl = daysLeft(p.deadline);
      if (dl !== null && dl < 0 && !state.expired) return false;
      if (state.program && p.program !== state.program) return false;
      if (state.country && p.country !== state.country) return false;
      if (state.costs && p.costs !== state.costs) return false;
      if (q && (p.title + " " + p.country + " " + cName(p.country) + " " + p.about).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function(a, b){
      var da = daysLeft(a.deadline), db = daysLeft(b.deadline);
      var ea = da !== null && da < 0, eb = db !== null && db < 0;
      if (ea !== eb) return ea ? 1 : -1;
      if (da === null) return 1;
      if (db === null) return -1;
      return ea ? db - da : da - db;
    });
  }

  function metaRow(label, value, chip){
    var li = el("li"), s = el("span", null, label), b = el("b", null, value);
    if (chip) b.appendChild(el("span", "chip", chip));
    li.appendChild(s); li.appendChild(b);
    return li;
  }
  function card(p){
    var dl = daysLeft(p.deadline), exp = dl !== null && dl < 0;
    var c = el("article", "prj" + (exp ? " expired" : "") + (p.id === state.focus ? " hl" : ""));
    c.id = "p-" + p.id;
    var badges = el("div", "prj-badges");
    badges.appendChild(el("span", "badge prog", p.program === "ESC" ? "ESC" : "SALTO Youth"));
    if (p.costs === "full" || p.costs === "partial" || p.costs === "none") {
      badges.appendChild(el("span", "badge cost-" + p.costs, t("cost_" + p.costs)));
    }
    if (exp) badges.appendChild(el("span", "badge", t("pj_expired")));
    c.appendChild(badges);
    c.appendChild(el("h3", "prj-title", p.title));

    var meta = el("ul", "prj-meta");
    if (p.country) meta.appendChild(metaRow(t("pj_country"), cName(p.country)));
    if (p.deadline) {
      var chip = "";
      if (dl !== null && dl >= 0) chip = dl === 0 ? t("pj_today") : fill(t("pj_left"), {n: dl});
      meta.appendChild(metaRow(t("pj_deadline"), fmtDay(p.deadline), chip));
    }
    if (p.start || p.end) meta.appendChild(metaRow(t("pj_dates"), fmtDay(p.start) + " – " + fmtDay(p.end)));
    c.appendChild(meta);

    if (p.about) {
      var long = p.about.length > 220;
      var ab = el("p", "prj-about" + (long ? " clamp" : ""), p.about);
      c.appendChild(ab);
      if (long) {
        var more = el("button", "linklike prj-more", t("pj_more"));
        more.type = "button"; more.setAttribute("data-more", "1"); more.setAttribute("aria-expanded", "false");
        c.appendChild(more);
      }
    }

    var note = el("p", "prj-note");
    note.appendChild(document.createTextNode("ⓘ " + t("pj_so") + " "));
    var nb = el("button", "linklike", t("pj_so_more"));
    nb.type = "button"; nb.setAttribute("data-open", "sendingOrgModal");
    note.appendChild(nb);
    var mem = el("a", "linklike member-link", "★ " + t("pj_member"));
    mem.href = "https://wa.me/" + CONFIG.WA_NUMBER + "?text=" + t("member_wa"); mem.target = "_blank"; mem.rel = "noopener";
    note.appendChild(document.createTextNode(" ")); note.appendChild(mem);
    c.appendChild(note);

    var act = el("div", "prj-actions");
    var u = safeUrl(p.link);
    if (u) {
      var a = el("a", "prj-btn primary", t("pj_official"));
      a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer";
      act.appendChild(a);
    }
    if (p.deadline && !exp) {
      var cal = el("button", "prj-btn cal", "📅 " + (L() === "az" ? "Təqvimə əlavə et" : "Add to calendar"));
      cal.type = "button"; cal.setAttribute("data-cal", p.id);
      cal.title = L() === "az" ? "Son tarix və xatırlatmalar təqvimə əlavə olunur" : "Adds the deadline and reminders to your calendar";
      act.appendChild(cal);
    }
    var cp = el("button", "prj-btn", t("pj_copy"));
    cp.type = "button"; cp.setAttribute("data-copy", p.id);
    act.appendChild(cp);
    var w = el("a", "prj-btn wa");
    w.innerHTML = WA_SVG;
    w.appendChild(document.createTextNode(L() === "az" ? "Dəstək al" : "Get support"));
    w.href = waProject(p); w.target = "_blank"; w.rel = "noopener";
    act.appendChild(w);
    c.appendChild(act);
    return c;
  }

  function renderList(){
    var list = $("#prjList"), count = $("#prjCount");
    if (!list) return;
    list.textContent = "";
    if (state.status === "loading") { count.textContent = t("pj_loading"); return; }
    if (state.status === "err") { count.textContent = t("pj_err"); return; }
    var items = visibleItems();
    count.textContent = items.length ? fill(t("pj_found"), {n: items.length}) : (state.items.length ? t("pj_none_f") : t("pj_none"));
    var lim = state.limit;
    if (state.focus) { for (var i = 0; i < items.length; i++) if (items[i].id === state.focus) { lim = Math.max(lim, i + 1); break; } }
    items.slice(0, lim).forEach(function(p){ list.appendChild(card(p)); });
    var mb = $("#prjMore");
    if (mb) {
      var left = items.length - lim;
      mb.hidden = left <= 0;
      if (left > 0) mb.textContent = fill(t("pj_more_btn"), {n: left});
    }
  }
  function syncControls(){
    var sec = $("#layiheler");
    if (!sec) return;
    sec.hidden = state.status === "off";
    var q = $("#prjQ"); if (q) q.value = state.q;
    var pr = $("#prjProgram"); if (pr) pr.value = state.program;
    var co = $("#prjCosts"); if (co) co.value = state.costs;
    var ex = $("#prjExpired"); if (ex) ex.checked = state.expired;
    var cs = $("#prjCountry");
    if (cs) {
      while (cs.options.length > 1) cs.remove(1);
      var seen = {};
      state.items.forEach(function(p){ if (p.country) seen[p.country] = 1; });
      Object.keys(seen).sort(function(a, b){ return cName(a).localeCompare(cName(b)); }).forEach(function(c){
        var o = document.createElement("option"); o.value = c; o.textContent = cName(c); cs.appendChild(o);
      });
      cs.value = state.country;
    }
  }
  function icsEsc(x){ return String(x || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function icsFold(line){
    var out = [], i = 0;
    while (line.length - i > 72) { out.push(line.substr(i, 72)); i += 72; }
    out.push(line.substr(i));
    return out.join("\r\n ");
  }
  function ymd(d){ return d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2); }
  function buildICS(p){
    var d = parseDay(p.deadline); if (!d) return "";
    var d2 = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), az = L() === "az";
    var now = new Date(), stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var desc = (az ? "Son müraciət tarixi: " : "Application deadline: ") + fmtDay(p.deadline) + "\n" +
      (p.country ? (az ? "Ölkə: " : "Country: ") + cName(p.country) + "\n" : "") +
      (safeUrl(p.link) ? (az ? "Rəsmi link: " : "Official link: ") + p.link + "\n" : "") +
      (az ? "Saytda: " : "On our site: ") + projectUrl(p.id);
    function alarm(trig, txt){ return ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(txt), "TRIGGER:" + trig, "END:VALARM"]; }
    var L2 = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Global Volunteers Azerbaijan//AZ", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT", "UID:" + p.id + "@globalvolunteers.page.gd", "DTSTAMP:" + stamp,
      "DTSTART;VALUE=DATE:" + ymd(d), "DTEND;VALUE=DATE:" + ymd(d2),
      "SUMMARY:" + icsEsc((az ? "Son müraciət: " : "Deadline: ") + p.title),
      "DESCRIPTION:" + icsEsc(desc)
    ];
    if (safeUrl(p.link)) L2.push("URL:" + p.link);
    L2 = L2.concat(
      alarm("-P2DT15H", az ? "3 gün qalıb: " + p.title : "3 days left: " + p.title),
      alarm("-PT15H", az ? "Sabah son gündür: " + p.title : "Deadline tomorrow: " + p.title),
      alarm("PT9H", az ? "Bu gün son gündür: " + p.title : "Deadline today: " + p.title),
      ["END:VEVENT", "END:VCALENDAR"]
    );
    return L2.map(icsFold).join("\r\n") + "\r\n";
  }
  function downloadICS(p){
    var txt = buildICS(p); if (!txt) return;
    var blob = new Blob([txt], {type: "text/calendar;charset=utf-8"});
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (p.title || "deadline").replace(/[^\w\-]+/g, "_").slice(0, 40) + ".ics";
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function renderProjects(){ syncControls(); renderList(); document.dispatchEvent(new CustomEvent("gv:render")); }
  window.GV = {
    items: function(){ return state.items; },
    status: function(){ return state.status; },
    lang: function(){ return L(); },
    cName: cName, waProject: waProject, daysLeft: daysLeft, fmtDay: fmtDay, safeUrl: safeUrl, projectUrl: projectUrl, toast: toast, copyText: copyText,
    downloadICS: downloadICS,
    filterCountry: function(c){
      state.country = c || ""; state.focus = ""; state.limit = PAGE; renderProjects();
      var n = document.getElementById("prjList"); if (n) n.scrollIntoView({behavior: "smooth", block: "start"});
    },
    showProject: function(id){
      state.focus = id; state.scrolled = false; state.country = ""; state.q = ""; state.program = ""; state.costs = "";
      renderProjects(); scrollFocus();
    }
  };
  function scrollFocus(){
    if (!state.focus || state.scrolled) return;
    var n = document.getElementById("p-" + state.focus);
    if (n) { state.scrolled = true; n.scrollIntoView({behavior: "smooth", block: "center"}); }
  }

  var toastT;
  function toast(msg){
    var n = $("#toast");
    if (!n) { n = el("div", "toast"); n.id = "toast"; n.setAttribute("role", "status"); document.body.appendChild(n); }
    n.textContent = msg; n.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function(){ n.classList.remove("show"); }, 2200);
  }
  function copyText(txt){
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt);
    return new Promise(function(res, rej){
      var ta = document.createElement("textarea");
      ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch(e){}
      document.body.removeChild(ta);
      ok ? res() : rej(new Error("copy failed"));
    });
  }

  document.addEventListener("input", function(e){
    if (e.target.id === "prjQ") { state.q = e.target.value; state.focus = ""; state.limit = PAGE; renderList(); }
  });
  document.addEventListener("change", function(e){
    var id = e.target.id;
    if (id === "prjProgram") state.program = e.target.value;
    else if (id === "prjCountry") state.country = e.target.value;
    else if (id === "prjCosts") state.costs = e.target.value;
    else if (id === "prjExpired") state.expired = e.target.checked;
    else return;
    state.focus = ""; state.limit = PAGE; renderList();
  });
  document.addEventListener("click", function(e){
    if (e.target.closest("#prjMore")) { state.limit += STEP; renderList(); return; }
    var cl = e.target.closest("[data-cal]");
    if (cl) {
      var pr = state.items.filter(function(x){ return x.id === cl.getAttribute("data-cal"); })[0];
      if (pr) { downloadICS(pr); toast(L() === "az" ? "Təqvim faylı yükləndi — açıb əlavə edin" : "Calendar file downloaded — open it to add"); }
      return;
    }
    var cp = e.target.closest("[data-copy]");
    if (cp) {
      copyText(projectUrl(cp.getAttribute("data-copy")))
        .then(function(){ toast(t("pj_copied")); })
        .catch(function(){ toast(t("pj_copy_fail")); });
      return;
    }
    var mo = e.target.closest("[data-more]");
    if (mo) {
      var ab = mo.previousElementSibling, open = ab.classList.toggle("clamp") === false;
      mo.textContent = open ? t("pj_less") : t("pj_more");
      mo.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    var tg = e.target.closest("[data-toggle-form]");
    if (tg) {
      var w = $("#applyWrap"), opening = w.hidden;
      w.hidden = !opening;
      tg.setAttribute("aria-expanded", opening ? "true" : "false");
      tg.textContent = opening ? t("ap_hide") : t("ap_show");
      if (opening) { var f = $("#f-name"); if (f) f.focus({preventScroll: true}); w.scrollIntoView({behavior: "smooth", block: "nearest"}); }
    }
  });

  /* =====================================================================
     ADMIN PANEL  (open  https://your-site/?admin )
     Only the Google account that is allowed by the database rules can save.
     ===================================================================== */
  function initAdmin(){
    var fb = CONFIG.FIREBASE;
    app.hidden = true; app.style.display = "none";
    document.title = "Admin — Global Volunteers";
    var rb = document.createElement("meta"); rb.name = "robots"; rb.content = "noindex,nofollow"; document.head.appendChild(rb);
    var root = el("div", "admin"); root.id = "adminRoot"; document.body.appendChild(root);

    function msg(text, isErr){ var m = $("#admMsg"); if (m) { m.textContent = text || ""; m.className = "adm-msg" + (isErr ? " err" : ""); } }
    function loginView(text, isErr, showBtn){
      root.innerHTML = '<div class="adm-card adm-login"><h1>Admin panel</h1><p id="admIntro"></p>' +
        (showBtn ? '<button type="button" class="btn-primary" id="admSignIn">Google ilə daxil ol</button>' : '') +
        '<p class="adm-msg" id="admMsg" role="alert"></p></div>';
      $("#admIntro").textContent = showBtn ? "Yalnız admin hesabı ilə daxil olmaq mümkündür." : "";
      msg(text, isErr);
    }
    if (!fb.databaseURL || !fb.apiKey || !fb.authDomain || !fb.appId) {
      loginView("Firebase hələ quraşdırılmayıb. index.html faylında CONFIG → FIREBASE hissəsini doldurun.", true, false);
      return;
    }
    loginView("Yüklənir…", false, false);
    var V = "10.14.1", B = "https://www.gstatic.com/firebasejs/" + V + "/";
    Promise.all([import(B + "firebase-app.js"), import(B + "firebase-auth.js"), import(B + "firebase-database.js")])
      .then(function(m){ start(m[0], m[1], m[2]); })
      .catch(function(){ loginView("Firebase yüklənmədi. İnternet bağlantısını yoxlayın.", true, false); });

    function start(appM, authM, fs){
      var fapp = appM.initializeApp({apiKey: fb.apiKey, authDomain: fb.authDomain, databaseURL: fb.databaseURL, projectId: fb.projectId || undefined, appId: fb.appId});
      var auth = authM.getAuth(fapp), db = fs.getDatabase(fapp);
      authM.onAuthStateChanged(auth, function(u){ if (u) dash(u); else login(); });

      function login(){
        loginView("", false, true);
        $("#admSignIn").addEventListener("click", function(){
          msg("");
          authM.signInWithPopup(auth, new authM.GoogleAuthProvider()).catch(function(err){
            var c = err && err.code;
            if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return;
            if (c === "auth/unauthorized-domain") msg("Bu domen Firebase-də icazəli deyil (Authentication → Settings → Authorized domains).", true);
            else if (c === "auth/popup-blocked") msg("Brauzer popup pəncərəsini blokladı. İcazə verib yenidən cəhd edin.", true);
            else msg("Daxil olmaq alınmadı (" + (c || "xəta") + ").", true);
          });
        });
      }

      function normCountry(v){
        v = (v || "").trim();
        var low = v.toLowerCase();
        for (var i = 0; i < COUNTRIES.length; i++) {
          if (COUNTRIES[i][0].toLowerCase() === low || COUNTRIES[i][1].toLowerCase() === low) return COUNTRIES[i][0];
        }
        return v;
      }

      function dash(user){
        var opts = COUNTRIES.map(function(c){ return '<option value="' + c[0] + '" label="' + c[1] + '"></option>'; }).join("");
        root.innerHTML =
          '<header class="adm-top"><h1>Layihələr — Admin</h1><div><span class="who" id="admWho"></span>' +
          '<a class="adm-btn" href="./" style="margin-right:8px;">Sayta bax</a><button type="button" class="adm-btn" id="admOut">Çıxış</button></div></header>' +
          '<details class="adm-card" id="admSalto" open><summary style="cursor:pointer;font-weight:600;font-size:1.1rem;">Salto səhifəsindən avtomatik doldur</summary>' +
          '<p class="adm-note" style="margin:12px 0;">1) Salto layihə səhifəsini açın → <b>Ctrl+A</b>, <b>Ctrl+C</b>. 2) Mətni aşağıya yapışdırın və linki yazın. 3) «Doldur» — aşağıdakı forma özü dolacaq, yoxlayıb «Əlavə et» deyin.</p>' +
          '<div class="field full"><label for="a-slink">Salto linki</label><input id="a-slink" type="url" maxlength="500" placeholder="https://www.salto-youth.net/tools/european-training-calendar/training/..."></div>' +
          '<div class="field full"><label for="a-spaste">Səhifənin kopyalanmış mətni</label><textarea id="a-spaste" style="min-height:120px;" spellcheck="false" placeholder="Səhifədən kopyaladığınız mətni bura yapışdırın"></textarea></div>' +
          '<div class="adm-actions" style="margin-top:12px;"><button type="button" class="btn-primary" id="admSaltoGo" style="border:none;cursor:pointer;font-family:Inter,sans-serif;">Doldur</button></div>' +
          '<p class="adm-msg" id="admSaltoMsg" role="status"></p></details>' +
          '<form id="admForm" class="adm-card" autocomplete="off"><h2 id="admFormTitle">Yeni layihə</h2><div class="adm-grid">' +
          '<div class="field full"><label for="a-title">Başlıq *</label><input id="a-title" type="text" required maxlength="200"></div>' +
          '<div class="field"><label for="a-program">Proqram *</label><select id="a-program" required><option value="">Seçin…</option><option value="SALTO">SALTO Youth</option><option value="ESC">ESC</option></select></div>' +
          '<div class="field"><label for="a-country">Ölkə *</label><input id="a-country" type="text" list="a-countries" required maxlength="80" placeholder="məs. Germany və ya Almaniya"><datalist id="a-countries">' + opts + '</datalist></div>' +
          '<div class="field"><label for="a-deadline">Deadline *</label><input id="a-deadline" type="date" required></div>' +
          '<div class="field"><label for="a-costs">Xərclər *</label><select id="a-costs" required><option value="">Seçin…</option><option value="full">Tam qarşılanır</option><option value="partial">Qismən qarşılanır</option><option value="none">Qarşılanmır</option></select></div>' +
          '<div class="field"><label for="a-start">Başlama tarixi *</label><input id="a-start" type="date" required></div>' +
          '<div class="field"><label for="a-end">Bitmə tarixi *</label><input id="a-end" type="date" required></div>' +
          '<div class="field full"><label for="a-link">Rəsmi link *</label><input id="a-link" type="url" required maxlength="500" placeholder="https://www.salto-youth.net/..."></div>' +
          '<div class="field full"><label for="a-about">Haqqında</label><textarea id="a-about" maxlength="3000"></textarea></div></div>' +
          '<p class="adm-note">ℹ️ Hər layihənin kartında avtomatik yazılacaq: «Layihələrə müraciət etmək üçün Sending Organization tələb olunur.»</p>' +
          '<div class="adm-actions"><button type="submit" class="btn-primary" id="admSave" style="border:none;cursor:pointer;font-family:Inter,sans-serif;">Əlavə et</button>' +
          '<button type="button" class="adm-btn" id="admCancel" hidden>Ləğv et</button></div><p class="adm-msg" id="admMsg" role="status"></p></form>' +
          '<details class="adm-card" id="admBulk"><summary style="cursor:pointer;font-weight:600;font-size:1.1rem;">Toplu əlavə et (JSON)</summary>' +
          '<p class="adm-note" style="margin:12px 0;">Hazır JSON blokunu bura yapışdırın → «Yoxla» → «Hamısını əlavə et». Eyni linkli layihələr təkrar əlavə olunmur.</p>' +
          '<textarea id="a-bulk" style="width:100%;min-height:200px;font-family:monospace;font-size:0.85rem;" spellcheck="false" placeholder=\'[{"title":"...","program":"SALTO","country":"Lithuania","deadline":"2026-10-11","startDate":"2026-11-28","endDate":"2026-12-06","link":"https://...","costs":"none","about":"..."}]\'></textarea>' +
          '<div class="adm-actions" style="margin-top:12px;"><button type="button" class="adm-btn" id="admBulkCheck">Yoxla</button>' +
          '<button type="button" class="btn-primary" id="admBulkGo" disabled style="border:none;cursor:pointer;font-family:Inter,sans-serif;">Hamısını əlavə et</button></div>' +
          '<p class="adm-msg" id="admBulkMsg" role="status"></p></details>' +
          '<section class="adm-card"><h2>Əlavə olunmuş layihələr (<span id="admCount">0</span>)</h2><div id="admList"></div></section>';
        $("#admWho").textContent = user.email || "";
        $("#admOut").addEventListener("click", function(){ authM.signOut(auth); });

        var editing = null, rows = [];
        var ids = ["title", "program", "country", "deadline", "costs", "start", "end", "link", "about"];
        function f(n){ return $("#a-" + n); }
        function reset(){
          editing = null; $("#admForm").reset();
          $("#admFormTitle").textContent = "Yeni layihə"; $("#admSave").textContent = "Əlavə et"; $("#admCancel").hidden = true;
        }
        $("#admCancel").addEventListener("click", function(){ reset(); msg(""); });

        function denied(err){
          if (err && /permission[_ -]?denied/i.test(String(err.code || "") + " " + String(err.message || ""))) {
            msg("Bu hesabın icazəsi yoxdur. Yalnız admin e-poçtu ilə daxil olun.", true);
            setTimeout(function(){ authM.signOut(auth); }, 2500);
          } else msg("Xəta baş verdi: " + ((err && (err.code || err.message)) || "naməlum"), true);
        }

        function loadRows(){
          return fs.get(fs.ref(db, "projects")).then(function(snap){
            rows = [];
            snap.forEach(function(d){ rows.push(Object.assign({id: d.key}, d.val())); });
            rows.sort(function(a, b){ return (a.deadline || "9999").localeCompare(b.deadline || "9999"); });
            drawRows();
          }).catch(denied);
        }
        function drawRows(){
          var box = $("#admList"); box.textContent = "";
          $("#admCount").textContent = rows.length;
          if (!rows.length) { box.appendChild(el("p", null, "Hələ layihə yoxdur.")); return; }
          rows.forEach(function(r){
            var row = el("div", "adm-row"), info = el("div");
            info.appendChild(el("b", null, r.title || "(başlıqsız)"));
            info.appendChild(el("small", null, (r.program === "ESC" ? "ESC" : "SALTO Youth") + " · " + (r.country || "—") + " · Deadline: " + (r.deadline || "—")));
            var act = el("div", "adm-actions");
            var e1 = el("button", "adm-btn", "Redaktə"); e1.type = "button";
            var e2 = el("button", "adm-btn danger", "Sil"); e2.type = "button";
            e1.addEventListener("click", function(){
              editing = r.id;
              f("title").value = r.title || ""; f("program").value = r.program || ""; f("country").value = r.country || "";
              f("deadline").value = r.deadline || ""; f("costs").value = r.costs || ""; f("start").value = r.startDate || "";
              f("end").value = r.endDate || ""; f("link").value = r.link || ""; f("about").value = r.about || "";
              $("#admFormTitle").textContent = "Layihəni redaktə et"; $("#admSave").textContent = "Yadda saxla"; $("#admCancel").hidden = false;
              msg(""); window.scrollTo({top: 0, behavior: "smooth"}); f("title").focus({preventScroll: true});
            });
            e2.addEventListener("click", function(){
              if (!window.confirm("Bu layihə silinsin?\n\n" + (r.title || ""))) return;
              fs.remove(fs.ref(db, "projects/" + r.id)).then(function(){
                if (editing === r.id) reset();
                msg("Layihə silindi."); return loadRows();
              }).catch(denied);
            });
            act.appendChild(e1); act.appendChild(e2);
            row.appendChild(info); row.appendChild(act); box.appendChild(row);
          });
        }

        /* ---- Salto səhifəsindən avtomatik doldurma ---- */
        $("#admSaltoGo").addEventListener("click", function(){
          var sm = $("#admSaltoMsg");
          function say2(t, err){ sm.textContent = t; sm.className = "adm-msg" + (err ? " err" : ""); }
          var P = window.GV_parseSalto, txt = $("#a-spaste").value, lk = $("#a-slink").value.trim();
          if (!P) { say2("Parser yüklənməyib (js/salto-parse.js).", true); return; }
          if (!txt.trim()) { say2("Əvvəlcə Salto səhifəsinin mətnini yapışdırın.", true); return; }
          var r = P.parse(txt, {countries: COUNTRIES.map(function(c){ return c[0]; }), link: lk});
          if (!r.found) { say2("Salto səhifəsinin sahələri tapılmadı. Səhifədə Ctrl+A etdiyinizdən əmin olun.", true); return; }
          if (editing) reset();
          f("title").value = r.title; f("program").value = "SALTO"; f("country").value = r.country; f("deadline").value = r.deadline;
          f("costs").value = r.costs; f("start").value = r.startDate; f("end").value = r.endDate; f("link").value = lk; f("about").value = r.about;
          var miss = r.warnings.slice(); if (!lk) { if (miss.indexOf("Rəsmi link") < 0) miss.push("Rəsmi link"); }
          say2(miss.length ? "Doldu. Tapılmadı, əllə yazın: " + miss.join(", ") + "." : "Doldu. Aşağıdakı formanı yoxlayıb «Əlavə et» düyməsini basın. «Haqqında» ingiliscədir, istəsəniz tərcümə edin.", miss.length > 0);
          $("#admForm").scrollIntoView({behavior: "smooth", block: "start"});
        });
        $("#admForm").addEventListener("submit", function(e){
          e.preventDefault();
          var data = {
            title: f("title").value.trim(), program: f("program").value, country: normCountry(f("country").value),
            deadline: f("deadline").value, startDate: f("start").value, endDate: f("end").value,
            link: f("link").value.trim(), costs: f("costs").value, about: f("about").value.trim()
          };
          if (!data.title || !data.program || !data.country || !data.deadline || !data.startDate || !data.endDate || !data.link || !data.costs) { msg("Ulduzlu sahələrin hamısını doldurun.", true); return; }
          if (!/^https?:\/\//i.test(data.link)) { msg("Link http:// və ya https:// ilə başlamalıdır.", true); return; }
          if (data.endDate < data.startDate) { msg("Bitmə tarixi başlama tarixindən əvvəl ola bilməz.", true); return; }
          data.updatedAt = fs.serverTimestamp();
          var btn = $("#admSave"); btn.disabled = true; msg("Saxlanılır…");
          var job;
          if (editing) job = fs.update(fs.ref(db, "projects/" + editing), data);
          else { data.createdAt = fs.serverTimestamp(); job = fs.push(fs.ref(db, "projects"), data); }
          job.then(function(){ var was = editing; reset(); msg(was ? "Dəyişikliklər saxlanıldı." : "Layihə əlavə olundu."); return loadRows(); })
            .catch(denied).then(function(){ btn.disabled = false; });
        });
        /* ---- bulk add ---- */
        var bulkOk = [];
        function bmsg(t, err){ var m = $("#admBulkMsg"); m.textContent = t || ""; m.className = "adm-msg" + (err ? " err" : ""); }
        function parseBulk(){
          var raw = $("#a-bulk").value.trim().replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
          var out = {ok: [], errors: [], skipped: 0};
          if (!raw) { out.errors.push("Boş sahə."); return out; }
          var data;
          /* tolerate line breaks that got inserted inside strings when pasting */
          var fixed = "", inStr = false, esc = false;
          for (var ci = 0; ci < raw.length; ci++) {
            var ch = raw.charAt(ci);
            if (inStr) {
              if (esc) { esc = false; fixed += ch; }
              else if (ch === "\\") { esc = true; fixed += ch; }
              else if (ch === '"') { inStr = false; fixed += ch; }
              else if (ch === "\n" || ch === "\r" || ch === "\t") { fixed += " "; }
              else fixed += ch;
            } else { if (ch === '"') inStr = true; fixed += ch; }
          }
          raw = fixed;
          try { data = JSON.parse(raw); } catch(e){ out.errors.push("JSON oxunmadı: " + e.message); return out; }
          if (!Array.isArray(data)) data = [data];
          var seen = {};
          rows.forEach(function(r){ if (r.link) seen[String(r.link).trim().toLowerCase()] = 1; });
          var D = /^\d{4}-\d{2}-\d{2}$/;
          data.forEach(function(x, i){
            var n = "#" + (i + 1) + ": ", er = [];
            if (!x || typeof x !== "object") { out.errors.push(n + "obyekt deyil"); return; }
            var p = String(x.program || "").trim().toUpperCase();
            if (p === "SALTO YOUTH" || p === "SALTO-YOUTH") p = "SALTO";
            var o = {
              title: String(x.title || "").trim(), program: p, country: normCountry(String(x.country || "")),
              deadline: String(x.deadline || "").trim(), startDate: String(x.startDate || "").trim(), endDate: String(x.endDate || "").trim(),
              link: String(x.link || "").trim(), costs: String(x.costs || "").trim().toLowerCase(), about: String(x.about || "").trim()
            };
            if (!o.title) er.push("title yoxdur");
            if (!o.country) er.push("country yoxdur");
            if (p !== "SALTO" && p !== "ESC") er.push("program SALTO və ya ESC olmalıdır");
            ["deadline", "startDate", "endDate"].forEach(function(k){ if (!D.test(o[k])) er.push(k + " YYYY-MM-DD olmalıdır"); });
            if (D.test(o.startDate) && D.test(o.endDate) && o.endDate < o.startDate) er.push("endDate startDate-dən əvvəldir");
            if (!/^https?:\/\//i.test(o.link)) er.push("link http(s) olmalıdır");
            if (["full", "partial", "none"].indexOf(o.costs) < 0) er.push("costs full/partial/none olmalıdır");
            if (er.length) { out.errors.push(n + (o.title || "?") + " — " + er.join(", ")); return; }
            var key = o.link.toLowerCase();
            if (seen[key]) { out.skipped++; return; }
            seen[key] = 1; out.ok.push(o);
          });
          return out;
        }
        $("#a-bulk").addEventListener("input", function(){ bulkOk = []; $("#admBulkGo").disabled = true; });
        $("#admBulkCheck").addEventListener("click", function(){
          var r = parseBulk(); bulkOk = r.errors.length ? [] : r.ok;
          $("#admBulkGo").disabled = !bulkOk.length;
          if (r.errors.length) { bmsg("Xətalar (heç nə əlavə olunmayıb):\n" + r.errors.join("\n"), true); return; }
          bmsg(r.ok.length + " yeni layihə əlavə olunacaq" + (r.skipped ? ", " + r.skipped + " təkrar link keçiləcək" : "") + ".\n" +
            r.ok.map(function(o){ return "• " + o.title + " (" + o.country + ", " + o.deadline + ")"; }).join("\n"));
        });
        $("#admBulkGo").addEventListener("click", function(){
          var list = bulkOk.slice(); if (!list.length) return;
          var b = $("#admBulkGo"); b.disabled = true; var done = 0;
          bmsg("Əlavə olunur… 0/" + list.length);
          list.reduce(function(chain, o){
            return chain.then(function(){
              o.createdAt = fs.serverTimestamp(); o.updatedAt = fs.serverTimestamp();
              return fs.push(fs.ref(db, "projects"), o).then(function(){ done++; bmsg("Əlavə olunur… " + done + "/" + list.length); });
            });
          }, Promise.resolve()).then(function(){
            bulkOk = []; $("#a-bulk").value = "";
            return loadRows().then(function(){ bmsg(done + " layihə əlavə olundu."); });
          }).catch(function(err){
            if (done) bmsg(done + "/" + list.length + " əlavə olundu, sonra xəta.", true); else denied(err);
            loadRows();
          });
        });
        loadRows();
      }
    }
  }

  /* --- əlaqə nömrələrini CONFIG-dən saytdakı bütün link və yazılara tətbiq edir --- */
  function applyContacts() {
    var nums = { main: CONFIG.WA_NUMBER, consult: CONFIG.CONSULT_NUMBER };
    var disp = { main: CONFIG.WA_DISPLAY, consult: CONFIG.CONSULT_DISPLAY };
    Array.prototype.forEach.call(document.querySelectorAll("a[data-wa]"), function (a) {
      var n = nums[a.getAttribute("data-wa")];
      if (n) a.setAttribute("href", a.getAttribute("href").replace(/wa\.me\/\d+/, "wa.me/" + n));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-phone]"), function (e) {
      var d = disp[e.getAttribute("data-phone")];
      if (d) e.textContent = d;
    });
  }

  /* --- start --- */
  var qs;
  try { qs = new URLSearchParams(location.search); } catch(e){ qs = { get: function(){ return ""; }, has: function(){ return false; } }; }
  if (qs.has("admin")) { initAdmin(); return; }
  applyContacts();
  decorate();
  if (qs.get("lang") === "en") setLang("en");
  state.focus = qs.get("p") || "";
  renderProjects();
  loadProjects().then(function(){ renderProjects(); scrollFocus(); });
})();
