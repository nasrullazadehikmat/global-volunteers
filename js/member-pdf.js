/* Admin panel: yeni üzv üçün "Xoş gəldin" PDF-i (Ad Soyad + paket + tarix → PDF).
   PDF birbaşa brauzerdə hazırlanır, heç bir məlumat serverə göndərilmir.
   Kitabxana (jsPDF) və şrift yalnız bölmə ilk dəfə açılanda yüklənir. */
(function(){
  "use strict";

  var VER = "20261031d";
  var MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];

  var PACKS = {
    six: {
      tag: "6 AYLIQ PAKET", t1: "Sending Organisation", t2: "Dəstək Paketi", price: "30 AZN", sub: "6 ay ərzində aktivdir",
      label: "6 ay", months: 6, file: "6ay",
      bullets: [
        "6 ay ərzində SALTO-Youth, Erasmus+ və digər beynəlxalq gənclər layihələri üzrə Sending Organisation dəstəyi",
        "Global Volunteers AZ Sending Organisation məlumatlarından istifadə",
        "Yaxında açılacaq məlumat xarakterli qrupumuza qoşulma"
      ]
    },
    year: {
      tag: "İLLİK ÜZVLÜK", t1: "Global Volunteers AZ", t2: "İllik Üzvlük", price: "50 AZN", sub: "1 il ərzində aktivdir",
      label: "1 il", months: 12, file: "illik",
      bullets: [
        "1 il ərzində SALTO-Youth, Erasmus+ və digər beynəlxalq gənclər layihələri üzrə Sending Organisation dəstəyi",
        "Viza prosesi üzrə dəstək",
        "Global Volunteers AZ Sending Organisation məlumatlarından istifadə",
        "Yaxında açılacaq məlumat xarakterli qrupumuza qoşulma"
      ]
    }
  };

  /* ---------- tarix köməkçiləri ---------- */
  function pad2(n){ return (n < 10 ? "0" : "") + n; }
  function todayISO(){ var d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function parseISO(s){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    return m ? {y: +m[1], m: +m[2] - 1, d: +m[3]} : null;
  }
  function addMonths(p, n){
    var t = p.m + n, y = p.y + Math.floor(t / 12), m = ((t % 12) + 12) % 12;
    var last = new Date(y, m + 1, 0).getDate();
    return {y: y, m: m, d: Math.min(p.d, last)};
  }
  function fmt(p){ return p.d + " " + MONTHS[p.m] + " " + p.y; }

  function asciiName(s){
    var map = {"ə": "e", "Ə": "E", "ı": "i", "İ": "I", "ö": "o", "Ö": "O", "ü": "u", "Ü": "U", "ç": "c", "Ç": "C", "ş": "s", "Ş": "S", "ğ": "g", "Ğ": "G"};
    return String(s || "").replace(/[əƏıİöÖüÜçÇşŞğĞ]/g, function(c){ return map[c]; })
      .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  /* ---------- skript yükləmə ---------- */
  function loadScript(src){
    return new Promise(function(res, rej){
      var s = document.createElement("script");
      s.src = src + "?v=" + VER; s.onload = res; s.onerror = function(){ rej(new Error("Yüklənmədi: " + src)); };
      document.head.appendChild(s);
    });
  }
  var libsP = null;
  function loadLibs(){
    if (!libsP) libsP = Promise.all([loadScript("js/vendor/jspdf.umd.min.js"), loadScript("js/vendor/gv-pdf-fonts.js")]).catch(function(e){ libsP = null; throw e; });
    return libsP;
  }
  var logoP = null;
  function loadLogo(){
    if (!logoP) logoP = fetch("images/logo-pdf.png?v=" + VER).then(function(r){
      if (!r.ok) throw new Error("Logo tapılmadı");
      return r.blob();
    }).then(function(b){
      return new Promise(function(res){ var fr = new FileReader(); fr.onload = function(){ res(fr.result); }; fr.readAsDataURL(b); });
    }).catch(function(e){ logoP = null; throw e; });
    return logoP;
  }

  /* ---------- PDF qurulması ---------- */
  var C = {
    navy: [20, 57, 92], green: [46, 139, 62], grey: [108, 117, 125], dark: [51, 62, 74],
    line: [208, 215, 221], soft: [238, 241, 240], mint: [227, 240, 230], mintBox: [234, 244, 236], white: [255, 255, 255]
  };
  var PW = 595.28, M = 40, CW = PW - 2 * M;

  function build(opts, logoData){
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({unit: "pt", format: "a4", compress: true});
    var F = window.GV_PDF_FONTS;
    doc.addFileToVFS("DejaVuSans.ttf", F.regular);
    doc.addFileToVFS("DejaVuSans-Bold.ttf", F.bold);
    doc.addFont("DejaVuSans.ttf", "DejaVu", "normal", 400, "Identity-H");
    doc.addFont("DejaVuSans-Bold.ttf", "DejaVuBold", "normal", 400, "Identity-H");
    doc.setProperties({title: "Global Volunteers AZ — Üzvlük", author: "Global Volunteers Azerbaijan", subject: "Xoş gəldin"});

    var DRY = false;
    function setF(bold, size, col){
      doc.setFont(bold ? "DejaVuBold" : "DejaVu", "normal"); doc.setFontSize(size);
      var c = col || C.dark; doc.setTextColor(c[0], c[1], c[2]);
    }
    function tw(str, bold, size){ setF(bold, size); return doc.getTextWidth(str); }
    function text(str, x, y, bold, size, col, align){
      if (DRY) return;
      setF(bold, size, col); doc.text(str, x, y, align ? {align: align} : undefined);
    }
    function rrect(x, y, w, h, r, fill, stroke, lw){
      if (DRY) return;
      if (fill) doc.setFillColor(fill[0], fill[1], fill[2]);
      if (stroke) { doc.setDrawColor(stroke[0], stroke[1], stroke[2]); doc.setLineWidth(lw || 0.8); }
      doc.roundedRect(x, y, w, h, r, r, fill && stroke ? "FD" : fill ? "F" : "S");
    }
    function hline(x1, x2, y, col, lw){
      if (DRY) return;
      doc.setDrawColor(col[0], col[1], col[2]); doc.setLineWidth(lw || 0.6); doc.line(x1, y, x2, y);
    }
    function diamond(x, y){
      if (DRY) return;
      doc.setFillColor(C.green[0], C.green[1], C.green[2]);
      doc.lines([[2.4, 2.4], [-2.4, 2.4], [-2.4, -2.4], [2.4, -2.4]], x, y - 2.4, [1, 1], "F", true);
    }
    /* qarışıq (qalın/adi) mətn, sətir qırılması ilə. segs: [[mətn, qalın?], ...]. Hündürlüyü qaytarır. */
    function rich(x, y, maxW, segs, size, lh, col){
      var words = [];
      segs.forEach(function(s){
        String(s[0]).split(/(\s+)/).forEach(function(p){ if (p !== "") words.push({t: p, b: !!s[1], sp: /^\s+$/.test(p)}); });
      });
      var cx = 0, line = 0, i;
      for (i = 0; i < words.length; i++) {
        var w = words[i];
        var wd = tw(w.t, w.b, size);
        if (w.sp) { if (cx > 0) cx += wd; continue; }
        if (cx > 0 && cx + wd > maxW + 0.5) { line++; cx = 0; }
        text(w.t, x + cx, y + line * lh + size * 0.9, w.b, size, col);
        cx += wd;
      }
      return (line + 1) * lh;
    }
    function bullet(x, y, maxW, segs, size, lh, col){
      diamond(x + 3, y + size * 0.62);
      return rich(x + 14, y, maxW - 14, segs, size, lh, col);
    }
    function pill(x, y, label, size, h){
      var w = tw(label, true, size) + 20;
      rrect(x, y, w, h, h / 2, C.green);
      text(label, x + w / 2, y + h / 2 + size * 0.34, true, size, C.white, "center");
      return w;
    }

    function pageFrame(n){
      doc.setFillColor(C.navy[0], C.navy[1], C.navy[2]); doc.rect(0, 0, 463, 5, "F");
      doc.setFillColor(C.green[0], C.green[1], C.green[2]); doc.rect(463, 0, PW - 463, 5, "F");
      text(n + "/2", PW - M, 30, false, 7.5, C.grey, "right");
      var lh = 70, lw = lh * 531 / 482;
      if (logoData) doc.addImage(logoData, "PNG", M, 22, lw, lh);
      hline(M, PW - M, 800, C.line, 0.6);
      text("globalvolunteers.page.gd", M, 817, false, 7, C.grey);
      text("@global.volunteers.az", PW / 2, 817, false, 7, C.grey, "center");
      text("WhatsApp: +994 70 638 63 53", PW - M, 817, false, 7, C.grey, "right");
      doc.link(M, 808, 120, 12, {url: "https://globalvolunteers.page.gd"});
      doc.link(PW - M - 120, 808, 120, 12, {url: "https://wa.me/994706386353"});
    }

    var pk = opts.pack, name = opts.name, start = opts.start, end = opts.end;
    var YTOP = 112;

    /* ===== 1-ci səhifə ===== */
    pageFrame(1);
    var y = YTOP;
    text("Xoş gəlmisiniz!", M, y + 24, true, 24, C.navy); y += 42;
    y += rich(M, y, CW, [
      ["Hörmətli ", 0], [name, 1],
      [", Global Volunteers AZ-yə qoşulduğunuz üçün sizi təbrik edirik! Seçdiyiniz ödənişə uyğun olaraq ", 0],
      [pk.label, 1], [" müddəti ", 0], [fmt(start) + " tarixindən hesablanaraq", 1], [" bazaya daxil edilmişdir.", 0]
    ], 9.5, 14, C.dark) + 20;

    function card1(y0){
      var ix = M + 22, iw = CW - 44, cy = y0 + 22;
      if (!DRY) pill(ix, cy, pk.tag, 6.5, 14); else tw(pk.tag, true, 6.5);
      cy += 30;
      text(pk.t1, ix, cy, true, 14, C.navy); cy += 19;
      text(pk.t2, ix, cy, true, 14, C.navy); cy += 38;
      text(pk.price, ix, cy, true, 32, C.green); cy += 16;
      text(pk.sub, ix, cy, false, 7.5, C.grey); cy += 18;
      /* üzv / tarixlər zolağı */
      rrect(ix, cy, iw, 42, 6, C.mintBox);
      var cols = [ix + 12, ix + iw * 0.45, ix + iw * 0.73];
      text("ÜZV", cols[0], cy + 14, true, 6, C.grey);
      text("BAŞLAMA TARİXİ", cols[1], cy + 14, true, 6, C.grey);
      text("BİTMƏ TARİXİ", cols[2], cy + 14, true, 6, C.grey);
      var maxNameW = cols[1] - cols[0] - 14, ns = 9.5;
      while (ns > 6.5 && tw(name, true, ns) > maxNameW) ns -= 0.5;
      var shown = name;
      if (tw(shown, true, ns) > maxNameW) { while (shown.length > 3 && tw(shown + "…", true, ns) > maxNameW) shown = shown.slice(0, -1); shown += "…"; }
      text(shown, cols[0], cy + 30, true, ns, C.navy);
      text(fmt(start), cols[1], cy + 30, true, 9, C.navy);
      text(fmt(end), cols[2], cy + 30, true, 9, C.navy);
      cy += 42 + 20;
      text("Paketinizə daxildir:", ix, cy + 7, true, 8.5, C.navy); cy += 20;
      pk.bullets.forEach(function(b){ cy += bullet(ix, cy, iw, [[b, 0]], 8.5, 12, C.dark) + 7; });
      return cy + 12 - y0;
    }
    DRY = true; var h1 = card1(y); DRY = false;
    rrect(M, y, CW, h1, 12, C.white, C.green, 1.6);
    card1(y);
    y += h1 + 22;

    function card2(y0){
      var ix = M + 22, iw = CW - 44, cy = y0 + 22;
      text("Sending Organisation məlumatları", ix, cy + 8, true, 10, C.navy); cy += 24;
      var rows = [["Təşkilat adı", "Global Volunteers Azerbaijan"], ["OID number", "E10445576"], ["Ünvan", "Baku, Azerbaijan (AZ1000)"], ["E-poçt ünvanı", "global.volunteers.az@gmail.com"]];
      rows.forEach(function(r){
        hline(ix, ix + iw, cy, C.line, 0.6);
        text(r[0], ix, cy + 17, false, 8, C.grey);
        text(r[1], ix + iw * 0.27, cy + 17, true, 8.5, C.navy);
        cy += 26;
      });
      hline(ix, ix + iw, cy, C.line, 0.6);
      text("Bu məlumatları müraciət formasında Sending Organisation bölməsinə olduğu kimi daxil edin.", ix, cy + 15, false, 7, C.grey);
      return cy + 15 + 20 - y0;
    }
    DRY = true; var h2 = card2(y); DRY = false;
    rrect(M, y, CW, h2, 12, C.soft, C.line, 0.8);
    card2(y);

    /* ===== 2-ci səhifə ===== */
    doc.addPage();
    pageFrame(2);
    y = YTOP;
    text("Müraciət zamanı nələri qeyd etməli?", M, y + 20, true, 20, C.navy); y += 32;
    text("Formda təşkilatla bağlı sual çıxdıqda aşağıdakı cavablardan istifadə edin.", M, y + 8, false, 9, C.dark); y += 26;

    var INTRO = "Global Volunteers Azerbaijan is a dynamic youth platform that has brought together over 7,000 young people and connects youth in Azerbaijan with international opportunities through mobility, non-formal education and volunteering.";
    var AREAS = [
      ["Sending Partner & International Mobility", "Partnering as a sending organisation in Erasmus+ youth exchanges, European Solidarity Corps (ESC) volunteering projects, and international training courses to connect Azerbaijani youth with global opportunities."],
      ["Volunteer Empowerment & Mentorship", "Organizing local training workshops, mentorship programs, and pre-departure orientation sessions to prepare volunteers for international experiences."],
      ["Global Engagement & Opportunities", "Organizing informational sessions on study abroad and volunteer initiatives, cultural exchange events, and networking activities to foster active citizenship and intercultural dialogue."]
    ];
    function cardA(y0){
      var ix = M + 22, iw = CW - 44, cy = y0 + 20;
      text("Təşkilatın fəaliyyəti haqqında sual verilərsə", ix, cy + 8, true, 9.5, C.navy); cy += 20;
      text("Təşkilat haqqında qısa təqdimat və aşağıdakı 3 əsas fəaliyyət istiqamətini göstərin:", ix, cy + 7, false, 7.5, C.grey); cy += 18;
      DRY = true; var ih = rich(0, 0, iw - 24, [[INTRO, 1]], 8, 11.5, C.navy); DRY = false;
      rrect(ix, cy, iw, ih + 20, 6, C.mint);
      rich(ix + 12, cy + 10, iw - 24, [[INTRO, 1]], 8, 11.5, C.navy);
      cy += ih + 20 + 14;
      AREAS.forEach(function(a){
        diamond(ix + 3, cy + 6);
        text(a[0], ix + 14, cy + 8, true, 8, C.navy); cy += 13;
        cy += rich(ix + 14, cy, iw - 14, [[a[1], 0]], 7.5, 10.5, C.dark) + 9;
      });
      return cy + 8 - y0;
    }
    DRY = true; var ha = cardA(y); DRY = false;
    rrect(M, y, CW, ha, 12, C.white, C.line, 0.8);
    cardA(y);
    y += ha + 14;

    function cardB(y0){
      var ix = M + 22, iw = CW - 44, cy = y0 + 18;
      text("Təşkilatda vəzifəniz soruşulsa", ix, cy + 8, true, 9.5, C.navy); cy += 22;
      text("Cavab olaraq yazın:", ix, cy + 11.5, false, 8, C.dark);
      var lx = ix + tw("Cavab olaraq yazın:", false, 8) + 12;
      if (!DRY) pill(lx, cy, "Active member", 8, 17);
      cy += 28;
      cy += rich(ix, cy, iw, [["Təşkilatın fəaliyyət təsvirini ", 0], ["müraciət etdiyiniz layihəyə uyğunlaşdırın", 1], [": layihənin mövzusuna ən yaxın olan fəaliyyət istiqamətini önə çıxarın.", 0]], 8, 11.5, C.dark);
      return cy + 16 - y0;
    }
    DRY = true; var hb = cardB(y); DRY = false;
    rrect(M, y, CW, hb, 12, C.mint);
    cardB(y);
    y += hb + 18;

    text("Vacib qeydlər", M, y + 10, true, 11, C.navy); y += 22;
    y += bullet(M, y, CW, [["Bu xidmət ", 0], ["yalnız Sending Organisation", 1], [" kimi göstərilmək üçündür. Layihəyə qəbul zəmanəti vermir — iştirakçı seçimini ", 0], ["layihənin komanda rəhbərləri", 1], [" həyata keçirir.", 0]], 8, 11.5, C.dark) + 6;
    y += bullet(M, y, CW, [["Təqdim olunan təşkilati məlumatlar yalnız şəxsi istifadəniz üçündür və üçüncü şəxslərlə paylaşılmamalıdır.", 0]], 8, 11.5, C.dark) + 12;

    rrect(M, y, CW, 56, 12, C.mint);
    text("Hər hansı sualınız yarandıqda yazın", M + 22, y + 24, true, 9.5, C.navy);
    text("WhatsApp: +994 70 638 63 53", M + 22, y + 41, false, 8, C.dark);
    text("Instagram: @global.volunteers.az", M + 22 + CW * 0.45, y + 41, false, 8, C.dark);

    return doc;
  }

  /* ---------- admin paneldə forma ---------- */
  function init(box){
    if (!box || box.getAttribute("data-ready")) return;
    box.setAttribute("data-ready", "1");
    box.innerHTML =
      '<p class="adm-note">ℹ️ Yeni üzv üçün «Xoş gəldin» PDF-i. Ad Soyad yazın, paketi seçin, «PDF yarat» düyməsinə basın. Üzvlük tarixləri avtomatik hesablanır. PDF birbaşa brauzerdə hazırlanır.</p>' +
      '<div class="adm-grid">' +
      '<div class="field full"><label for="mp-name">Ad Soyad *</label><input id="mp-name" type="text" maxlength="80" autocomplete="off" placeholder="məs. Leyla Məmmədova"></div>' +
      '<div class="field full"><label>Paket *</label><div class="adm-toggles">' +
      '<button type="button" class="adm-toggle" data-pack="six" aria-pressed="true">6 aylıq · 30 AZN</button>' +
      '<button type="button" class="adm-toggle" data-pack="year" aria-pressed="false">İllik · 50 AZN</button></div></div>' +
      '<div class="field"><label for="mp-start">Başlama tarixi</label><input id="mp-start" type="date"></div>' +
      '<div class="field"><label>Bitmə tarixi (avtomatik)</label><div id="mp-end" style="padding:10px 0;font-weight:600;">—</div></div></div>' +
      '<div class="adm-actions"><button type="button" class="btn-primary" id="mp-go" style="border:none;cursor:pointer;font-family:Inter,sans-serif;">PDF yarat</button></div>' +
      '<p class="adm-msg" id="mp-msg" role="status"></p>';

    var nameI = box.querySelector("#mp-name"), startI = box.querySelector("#mp-start"), endO = box.querySelector("#mp-end"),
        go = box.querySelector("#mp-go"), msg = box.querySelector("#mp-msg"), cur = "six";
    startI.value = todayISO();

    function say(t, err){ msg.textContent = t || ""; msg.className = "adm-msg" + (err ? " err" : ""); }
    function endDate(){
      var s = parseISO(startI.value);
      return s ? addMonths(s, PACKS[cur].months) : null;
    }
    function refresh(){
      var e = endDate(); endO.textContent = e ? fmt(e) : "—";
      Array.prototype.forEach.call(box.querySelectorAll("[data-pack]"), function(b){
        b.setAttribute("aria-pressed", b.getAttribute("data-pack") === cur ? "true" : "false");
      });
    }
    box.addEventListener("click", function(ev){
      var b = ev.target.closest ? ev.target.closest("[data-pack]") : null;
      if (b) { cur = b.getAttribute("data-pack"); refresh(); }
    });
    startI.addEventListener("input", refresh);
    refresh();

    go.addEventListener("click", function(){
      var name = nameI.value.replace(/\s+/g, " ").trim(), s = parseISO(startI.value);
      if (!name) { say("Ad Soyad yazın.", true); nameI.focus(); return; }
      if (!s) { say("Başlama tarixini seçin.", true); return; }
      var pack = PACKS[cur], e = addMonths(s, pack.months);
      go.disabled = true; say("PDF hazırlanır…");
      Promise.all([loadLibs(), loadLogo()]).then(function(r){
        var doc = build({name: name, pack: pack, start: s, end: e}, r[1]);
        var fn = "Global_Volunteers_AZ_" + (asciiName(name) || "uzv") + "_" + pack.file + ".pdf";
        doc.save(fn);
        say("Hazırdır: " + fn);
      }).catch(function(err){
        say("PDF yaradıla bilmədi: " + ((err && err.message) || "naməlum xəta"), true);
      }).then(function(){ go.disabled = false; });
    });
  }

  window.GV_initMemberPdf = init;
  window.GV_buildMemberPdf = build; /* test üçün */
})();
