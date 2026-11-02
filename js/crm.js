/* Admin paneldə CRM: gəlir qrafiki, xidmət sifarişləri (SALTO / ESC paketləri) və Sending Organization üzvləri.
   Məlumat Firebase Realtime Database-də "crm" qovluğunda saxlanır (yalnız admin oxuya və yaza bilər).
   Gəlir növləri:
     - üzvlük: Sending Organization haqqı (50 AZN illik, 30 AZN 6 aylıq), başlama tarixində hesablanır
     - ilkin xidmət haqqı: həmişə bizdə qalır, qəbul olmasa da geri qaytarılmır
     - yekun ödəniş: layihələrdən qəbul gələndə, saytdakı şərtlərə görə (qəbul sayına görə məbləğ dəyişir)
   Sheets-dən köçürmək üçün xanaları kopyalayıb "Sheets-dən import" sahəsinə yapışdırın. Parol sütunu bilərəkdən import olunmur. */
(function(root){
  "use strict";

  /* saytdakı qiymətlər (index.html → Paketlər). tiers: [qəbul sayı (minimum), yekun ödəniş] */
  var PACKS = {
    SALTO: {
      standard: {label: "Standard", initial: 50, projects: 1, tiers: [[1, 100]]},
      premium: {label: "Premium", initial: 80, projects: 2, tiers: [[1, 100], [2, 170]]},
      vip: {label: "VIP", initial: 150, projects: 5, tiers: [[1, 100], [2, 170]]}
    },
    ESC: {
      standard: {label: "Standard", initial: 80, projects: 1, tiers: [[1, 100]]},
      premium: {label: "Premium", initial: 100, projects: 2, tiers: [[1, 100], [2, 130]]},
      vip: {label: "VIP", initial: 130, projects: 4, tiers: [[1, 100], [2, 130], [3, 200]]}
    }
  };
  var PROGRAMS = {SALTO: "SALTO Youth", ESC: "ESC"};
  var MPLANS = {
    y50: {label: "İllik (50 AZN)", amount: 50, months: 12},
    y45: {label: "İllik, köhnə qiymət (45 AZN)", amount: 45, months: 12},
    m30: {label: "6 aylıq (30 AZN)", amount: 30, months: 6},
    free: {label: "Pulsuz / digər", amount: 0, months: 12}
  };
  var STATUS = {applied: "Müraciət edilib", reserve: "Rezerv", rejected: "İmtina", accepted: "Qəbul"};
  var ORG = {member: "Üzvdür", nonmember: "Üzv deyil", project: "Yalnız bu layihə üçün"};
  var KINDS = {member: "Üzvlük", initial: "İlkin xidmət haqqı", final: "Yekun ödəniş"};

  /* ---------- ümumi köməkçilər ---------- */
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function today(){ return new Date().toISOString().slice(0, 10); }
  function isoOk(s){ return /^\d{4}-\d{2}-\d{2}$/.test(s || ""); }
  function ms(iso){ return Date.parse(iso + "T00:00:00Z"); }
  function addDays(iso, n){ return new Date(ms(iso) + n * 864e5).toISOString().slice(0, 10); }
  function addMonths(iso, n){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); if (!m) return "";
    return new Date(Date.UTC(+m[1], +m[2] - 1 + n, +m[3])).toISOString().slice(0, 10);
  }
  function daysTo(iso){ return isoOk(iso) ? Math.round((ms(iso) - ms(today())) / 864e5) : null; }
  function fmtDate(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? m[3] + "." + m[2] + "." + m[1].slice(2) : "—"; }
  function money(n){ return (Math.round((+n || 0) * 100) / 100) + " AZN"; }
  function toArr(v){ return Array.isArray(v) ? v.filter(Boolean) : (v && typeof v === "object" ? Object.keys(v).map(function(k){ return v[k]; }) : []); }
  function plain(v){ return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

  /* telefon: +994XXXXXXXXX formatına salır; alınmasa boş qaytarır */
  function normPhone(v){
    var d = String(v || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.indexOf("994") === 0) { d = d.slice(3); if (d.length === 10 && d.charAt(0) === "0") d = d.slice(1); }
    else if (d.charAt(0) === "0") d = d.slice(1);
    if (d.length !== 9) return "";
    return "+994" + d;
  }
  /* 12.09.26 / 12.09.2026 / 2026-09-12 → 2026-09-12 */
  function normDate(v){
    v = String(v || "").trim();
    if (isoOk(v)) return v;
    var m = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2}|\d{4})$/.exec(v);
    if (!m) return "";
    var y = m[3].length === 2 ? "20" + m[3] : m[3];
    return y + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
  }
  function parseAmount(v){ var m = /(\d+(?:[.,]\d+)?)\s*azn/i.exec(String(v || "")); return m ? parseFloat(m[1].replace(",", ".")) : null; }
  function statusOf(v){
    v = plain(v);
    if (v.indexOf("imtina") >= 0) return "rejected";
    if (v.indexOf("rezerv") >= 0) return "reserve";
    if (v.indexOf("qebul") >= 0 || v.indexOf("qəbul") >= 0) return "accepted";
    return "applied";
  }
  function orgOf(v){
    v = plain(v);
    if (v.indexOf("deyil") >= 0) return "nonmember";
    if (v.indexOf("yalniz") >= 0 || v.indexOf("yalnız") >= 0 || v.indexOf("layih") >= 0) return "project";
    return "member";
  }

  /* ---------- paket və ödəniş məntiqi ---------- */
  function finalAuto(program, pack, n){
    var P = PACKS[program] && PACKS[program][pack], r = 0;
    if (!P) return 0;
    P.tiers.forEach(function(t){ if (n >= t[0]) r = t[1]; });
    return r;
  }
  function guessProgram(link){
    link = String(link || "").toLowerCase();
    if (link.indexOf("salto-youth") >= 0) return "SALTO";
    if (link.indexOf("europa.eu") >= 0 || link.indexOf("solidarity") >= 0) return "ESC";
    return "SALTO";
  }
  function guessPack(program, amount){
    var P = PACKS[program] || {}, k;
    for (k in P) if (P[k].initial === +amount) return k;
    return "custom";
  }
  function normOrder(o){
    var projects = toArr(o.projects).map(function(p){ return {link: p.link || "", status: p.status || "applied", deadline: p.deadline || "", selection: p.selection || ""}; });
    if (!projects.length && (o.link || o.status)) projects = [{link: o.link || "", status: o.status || "applied", deadline: o.deadline || "", selection: o.selection || ""}];
    var initial = o.initialAmount != null ? +o.initialAmount : (+o.amount || 0);
    var program = o.program || guessProgram(projects.length ? projects[0].link : "");
    return {
      id: o.id, name: o.name || "", phone: o.phone || "", email: o.email || "", org: o.org || "member", note: o.note || "",
      program: program, pack: o.pack || guessPack(program, initial), initialAmount: initial, initialDate: o.initialDate || "", initialEstimated: !!o.initialEstimated,
      finalOverride: (o.finalOverride === undefined || o.finalOverride === null || o.finalOverride === "") ? null : +o.finalOverride,
      finalPaid: +o.finalPaid || 0, finalDate: o.finalDate || "", projects: projects
    };
  }
  function calc(o){
    var acc = o.projects.filter(function(p){ return p.status === "accepted"; }).length;
    var due = o.finalOverride !== null ? o.finalOverride : finalAuto(o.program, o.pack, acc);
    return {accepted: acc, due: due, paid: o.finalPaid, pending: Math.max(0, due - o.finalPaid)};
  }
  function packLabel(o){
    var P = PACKS[o.program] && PACKS[o.program][o.pack];
    return (PROGRAMS[o.program] || o.program) + " · " + (P ? P.label : "Digər");
  }

  /* ---------- gəlir hadisələri və qrafik ---------- */
  function buildEvents(members, orders){
    var ev = [], undated = {count: 0, amount: 0}, estimated = 0;
    function add(date, amount, kind, est){
      if (!(amount > 0)) return;
      if (!isoOk(date)) { undated.count++; undated.amount += amount; return; }
      if (est) estimated++;
      ev.push({date: date, amount: amount, kind: kind, est: !!est});
    }
    members.forEach(function(m){ add(m.startDate, +m.amount || 0, "member", false); });
    orders.forEach(function(o){
      add(o.initialDate, o.initialAmount, "initial", o.initialEstimated);
      if (o.finalPaid > 0) add(o.finalDate || today(), o.finalPaid, "final", false);
    });
    return {events: ev, undated: undated, estimated: estimated};
  }
  function pending(orders){
    var sum = 0, cnt = 0;
    orders.forEach(function(o){ var c = calc(o); if (c.pending > 0) { sum += c.pending; cnt++; } });
    return {amount: sum, count: cnt};
  }
  function mondayOf(iso){ var d = new Date(ms(iso)), wd = (d.getUTCDay() + 6) % 7; return addDays(iso, -wd); }
  function bucketKey(iso, g){ return g === "month" ? iso.slice(0, 7) : g === "week" ? mondayOf(iso) : iso; }
  function autoGran(from, to){ var n = (ms(to) - ms(from)) / 864e5 + 1; return n <= 45 ? "day" : n <= 200 ? "week" : "month"; }
  function labelOf(key, g){
    if (g === "month") return key.slice(5) + "." + key.slice(2, 4);
    return key.slice(8) + "." + key.slice(5, 7);
  }
  /* seçilmiş aralıq və növlərə görə nöqtələr; sıfırlı dövrlər də daxildir */
  function series(events, from, to, g, kinds){
    var keys = [], seen = {}, d = from, map = {};
    while (d <= to) { var k = bucketKey(d, g); if (!seen[k]) { seen[k] = 1; keys.push(k); map[k] = 0; } d = addDays(d, 1); }
    var total = 0;
    events.forEach(function(e){
      if (e.date < from || e.date > to || kinds.indexOf(e.kind) < 0) return;
      map[bucketKey(e.date, g)] += e.amount; total += e.amount;
    });
    return {points: keys.map(function(k){ return {key: k, label: labelOf(k, g), value: map[k]}; }), total: total};
  }
  function sumRange(events, from, to, kinds){
    var s = 0; events.forEach(function(e){ if (e.date >= from && e.date <= to && kinds.indexOf(e.kind) >= 0) s += e.amount; }); return s;
  }
  function niceMax(v){
    if (v <= 0) return 10;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }
  /* artan seqment yaşıl, azalan qırmızı, dəyişməyən boz */
  function chartSvg(points, cumulative){
    var W = 680, H = 280, L = 48, R = 14, T = 16, B = 34, n = points.length;
    var vals = [], run = 0;
    points.forEach(function(p){ run += p.value; vals.push(cumulative ? run : p.value); });
    var max = niceMax(Math.max.apply(null, vals.concat([0])));
    function X(i){ return n === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (n - 1); }
    function Y(v){ return T + (H - T - B) * (1 - v / max); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Gəlir qrafiki" style="display:block;max-width:100%;height:auto;font:11px Inter,sans-serif;">', i;
    for (i = 0; i <= 4; i++) {
      var gv = max * i / 4, gy = Y(gv);
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" style="stroke:var(--line);stroke-width:1"/>' +
        '<text x="' + (L - 6) + '" y="' + (gy + 4) + '" text-anchor="end" style="fill:var(--ink-soft)">' + Math.round(gv) + '</text>';
    }
    var step = Math.max(1, Math.ceil(n / 8));
    for (i = 0; i < n; i += step) s += '<text x="' + X(i) + '" y="' + (H - 12) + '" text-anchor="middle" style="fill:var(--ink-soft)">' + esc(points[i].label) + '</text>';
    if (n > 1) {
      var area = "M" + X(0) + "," + Y(0);
      for (i = 0; i < n; i++) area += " L" + X(i) + "," + Y(vals[i]);
      area += " L" + X(n - 1) + "," + Y(0) + " Z";
      s += '<path d="' + area + '" style="fill:var(--teal);opacity:.08"/>';
    }
    for (i = 1; i < n; i++) {
      var col = vals[i] > vals[i - 1] ? "#1a8f5a" : vals[i] < vals[i - 1] ? "#B3402E" : "#8a8f98";
      s += '<line x1="' + X(i - 1) + '" y1="' + Y(vals[i - 1]) + '" x2="' + X(i) + '" y2="' + Y(vals[i]) + '" style="stroke:' + col + ';stroke-width:2.5;stroke-linecap:round"/>';
    }
    for (i = 0; i < n; i++) {
      var diff = i ? vals[i] - vals[i - 1] : 0, c2 = !i ? "var(--teal)" : diff > 0 ? "#1a8f5a" : diff < 0 ? "#B3402E" : "#8a8f98";
      s += '<circle cx="' + X(i) + '" cy="' + Y(vals[i]) + '" r="' + (n > 40 ? 2.5 : 4) + '" style="fill:' + c2 + ';stroke:var(--white);stroke-width:1.5"><title>' +
        esc(points[i].label + ": " + money(vals[i]) + (i ? " (" + (diff >= 0 ? "+" : "") + Math.round(diff * 100) / 100 + ")" : "")) + '</title></circle>';
    }
    return s + '</svg>';
  }

  /* ---------- Sheets-dən import (kopyalanmış cədvəl) ---------- */
  /* Sheets-dən kopyalanan mətn: dırnaq içindəki xanalarda sətir sonu ola bilər, ona görə simvol-simvol oxunur */
  function parseTsv(text){
    text = String(text || "").replace(/\r\n?/g, "\n");
    var rows = [], row = [], cur = "", inQ = false, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      if (inQ) {
        if (ch === '"') { if (text.charAt(i + 1) === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else if (ch === '"' && cur === "") inQ = true;
      else if (ch === "\t") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    row.push(cur); rows.push(row);
    rows = rows.map(function(r){ return r.map(function(c){ return c.replace(/\s+/g, " ").trim(); }); })
      .filter(function(r){ return r.some(function(c){ return c !== ""; }); });
    if (rows.length < 2) return {head: [], rows: []};
    return {head: rows[0].map(function(h){ return h.toLowerCase(); }), rows: rows.slice(1)};
  }
  function colIdx(head, keys){
    for (var i = 0; i < head.length; i++) for (var k = 0; k < keys.length; k++) if (head[i].indexOf(keys[k]) >= 0) return i;
    return -1;
  }
  function cell(row, i){ return i >= 0 && i < row.length ? row[i] : ""; }

  function importMembers(text, existing){
    var t = parseTsv(text), out = {ok: [], errors: [], warnings: [], skipped: 0};
    var iName = colIdx(t.head, ["ad,", "ad soyad", "ad"]), iPh = colIdx(t.head, ["əlaqə", "nömrə", "telefon"]),
        iSt = colIdx(t.head, ["başlama", "baslama"]), iEn = colIdx(t.head, ["bitmə", "bitme"]), iNote = colIdx(t.head, ["qeyd"]);
    if (iName < 0 || iPh < 0 || iSt < 0) { out.errors.push("Başlıq sətri tapılmadı. Başlıqla birlikdə kopyalayın (Ad, Soyad / Əlaqə nömrəsi / Başlama tarixi ...)."); return out; }
    var seen = {};
    existing.forEach(function(m){ seen[(m.phone || "") + "|" + (m.startDate || "")] = 1; });
    t.rows.forEach(function(r, i){
      var name = cell(r, iName).replace(/\s+/g, " ");
      if (!name || /^ad,?\s*soyad$/i.test(name)) return;
      var n = "Sətir " + (i + 2) + " (" + name + "): ", er = [];
      var phone = normPhone(cell(r, iPh)), start = normDate(cell(r, iSt)), end = normDate(cell(r, iEn));
      var note = cell(r, iNote), amount = parseAmount(note);
      if (!phone) er.push("telefon oxunmadı (" + cell(r, iPh) + ")");
      if (!start) er.push("başlama tarixi oxunmadı");
      if (er.length) { out.errors.push(n + er.join(", ")); return; }
      var months = end ? Math.round((ms(end) - ms(start)) / 2629800000) : 12;
      var plan = amount === 30 ? "m30" : amount === 45 ? "y45" : amount === 50 ? "y50" : (amount === null && months === 6) ? "m30" : "free";
      var o = {name: name, phone: phone, plan: plan, amount: amount !== null ? amount : MPLANS[plan].amount, startDate: start,
               endDate: end || addMonths(start, MPLANS[plan].months), note: amount !== null ? "" : note};
      var key = phone + "|" + start;
      if (seen[key]) { out.skipped++; return; }
      seen[key] = 1; out.ok.push(o);
    });
    return out;
  }

  /* eyni telefonlu sətirlər bir sifarişdə birləşir (hər sətir bir layihədir) */
  function importOrders(text, existing){
    var t = parseTsv(text), out = {ok: [], errors: [], warnings: [], skipped: 0};
    var iLink = colIdx(t.head, ["lahiy", "layih", "link"]), iName = colIdx(t.head, ["ad soyad", "ad"]), iMail = colIdx(t.head, ["mail"]),
        iPh = colIdx(t.head, ["əlaqə", "nömrə", "telefon"]), iSt = colIdx(t.head, ["status"]), iDl = colIdx(t.head, ["deadline"]),
        iSel = colIdx(t.head, ["selection"]), iPay = colIdx(t.head, ["ödəniş tarixi", "odenis tarixi"]), iAmt = -1,
        iOrg = colIdx(t.head, ["organization", "organ"]);
    if (iName < 0 || iPh < 0) { out.errors.push("Başlıq sətri tapılmadı. Başlıqla birlikdə kopyalayın (Layihə / Ad Soyad / Mail / Əlaqə nömrəsi ...). Parol sütunu avtomatik atlanır."); return out; }
    iAmt = -1;
    t.head.forEach(function(h, i){ if (iAmt < 0 && (h.indexOf("ödəniş") >= 0 || h.indexOf("odenis") >= 0) && h.indexOf("tarix") < 0) iAmt = i; });
    var groups = {}, order = [];
    t.rows.forEach(function(r, i){
      var name = cell(r, iName).replace(/\s+/g, " ");
      if (!name) return;
      var phone = normPhone(cell(r, iPh));
      if (!phone) { out.errors.push("Sətir " + (i + 2) + " (" + name + "): telefon oxunmadı (" + cell(r, iPh) + ")"); return; }
      var amt = parseAmount(cell(r, iAmt));
      var row = {name: name, email: cell(r, iMail), link: cell(r, iLink), status: statusOf(cell(r, iSt)), deadline: normDate(cell(r, iDl)),
                 selection: normDate(cell(r, iSel)), amount: amt !== null ? amt : 0, org: orgOf(cell(r, iOrg)), payDate: normDate(cell(r, iPay))};
      if (!groups[phone]) { groups[phone] = {phone: phone, rows: []}; order.push(phone); }
      groups[phone].rows.push(row);
    });
    var known = {};
    existing.forEach(function(o){ o.projects.forEach(function(p){ known[o.phone + "|" + String(p.link).toLowerCase()] = 1; }); });
    order.forEach(function(ph){
      var g = groups[ph], rows = g.rows, first = rows[0];
      var fresh = rows.filter(function(r){ return !(r.link && known[ph + "|" + r.link.toLowerCase()]); });
      if (!fresh.length) { out.skipped++; return; }
      var amounts = rows.map(function(r){ return r.amount; }), amt = Math.max.apply(null, amounts);
      var program = guessProgram(first.link), pack = guessPack(program, amt);
      var firstDeadline = rows.map(function(r){ return r.deadline; }).filter(Boolean).sort()[0] || "";
      var payDate = rows.map(function(r){ return r.payDate; }).filter(Boolean)[0] || "";
      var o = {name: first.name, phone: ph, email: rows.map(function(r){ return r.email; }).filter(Boolean)[0] || "", org: first.org,
               program: program, pack: pack, initialAmount: amt, initialDate: payDate || (firstDeadline > today() ? today() : firstDeadline), initialEstimated: !payDate && !!firstDeadline,
               finalPaid: 0, finalDate: "", note: "",
               projects: fresh.map(function(r){ return {link: r.link, status: r.status, deadline: r.deadline, selection: r.selection}; })};
      if (rows.length > 1) out.warnings.push(first.name + ": " + rows.length + " sətir bir sifarişdə birləşdirildi, ilkin ödəniş " + money(amt) + " (sətirlərdə: " + amounts.join(", ") + "). Hər sətir ayrıca ödənişdirsə, redaktə edin.");
      if (pack === "custom") out.warnings.push(first.name + ": " + money(amt) + " heç bir paketə uyğun gəlmir, «Digər» seçildi.");
      out.ok.push(o);
    });
    return out;
  }

  /* ---------- interfeys ---------- */
  function init(box, ctx){
    var fs = ctx.fs, db = ctx.db, denied = ctx.denied;
    var tab = "income", data = {members: [], support: []}, q = "", editing = null, loaded = false, pendingImport = [];
    var inc = {from: "", to: "", gran: "auto", cum: false, kinds: ["member", "initial", "final"], preset: "all"};

    box.innerHTML =
      '<div class="crm-tabs">' +
      '<button type="button" class="adm-toggle" id="crmTabI" aria-pressed="true">Gəlir</button>' +
      '<button type="button" class="adm-toggle" id="crmTabS" aria-pressed="false">Xidmətlər (fərdi dəstək)</button>' +
      '<button type="button" class="adm-toggle" id="crmTabM" aria-pressed="false">Üzvlər (Sending Organization)</button>' +
      '<button type="button" class="adm-btn" id="crmReload">Yenilə</button></div>' +
      '<p class="adm-msg" id="crmMsg" role="status"></p>' +
      '<div id="crmIncome">' +
        '<div class="crm-range">' +
        '<button type="button" class="adm-btn" data-r="30">30 gün</button><button type="button" class="adm-btn" data-r="90">90 gün</button>' +
        '<button type="button" class="adm-btn" data-r="month">Bu ay</button><button type="button" class="adm-btn" data-r="year">Bu il</button><button type="button" class="adm-btn" data-r="all">Hamısı</button></div>' +
        '<div class="crm-range"><label>Başlanğıc <input type="date" id="crmFrom"></label><label>Son <input type="date" id="crmTo"></label>' +
        '<label>Qruplaşdırma <select id="crmGran"><option value="auto">Avtomatik</option><option value="day">Gün</option><option value="week">Həftə</option><option value="month">Ay</option></select></label>' +
        '<button type="button" class="adm-toggle" id="crmCum" aria-pressed="false">Yığımlı</button></div>' +
        '<div class="crm-range" id="crmKinds"></div>' +
        '<div id="crmIncCards" class="st-cards"></div>' +
        '<div id="crmChart" class="crm-chart"></div>' +
        '<p class="adm-note" id="crmIncNote" style="margin-top:12px;"></p></div>' +
      '<div id="crmListPane" hidden>' +
        '<div class="st-cards" id="crmStats"></div>' +
        '<div class="crm-bar"><input id="crmSearch" type="search" placeholder="Ad, telefon və ya layihə üzrə axtar" aria-label="Axtar"><button type="button" class="adm-btn" id="crmAdd">Yeni əlavə et</button></div>' +
        '<form id="crmForm" class="crm-form" hidden autocomplete="off"></form>' +
        '<div id="crmList"></div>' +
        '<details class="crm-import"><summary>Sheets-dən import</summary>' +
        '<p class="adm-note" style="margin:12px 0;" id="crmImpHelp"></p>' +
        '<textarea id="crmPaste" style="width:100%;min-height:160px;font-family:monospace;font-size:0.85rem;" spellcheck="false"></textarea>' +
        '<div class="adm-actions" style="margin-top:12px;"><button type="button" class="adm-btn" id="crmCheck">Yoxla</button>' +
        '<button type="button" class="btn-primary" id="crmGo" disabled style="border:none;cursor:pointer;font-family:Inter,sans-serif;">Əlavə et</button></div>' +
        '<p class="adm-msg" id="crmImpMsg" role="status"></p></details></div>';

    function $(s){ return box.querySelector(s); }
    function msg(t, err){ var m = $("#crmMsg"); m.textContent = t || ""; m.className = "adm-msg" + (err ? " err" : ""); }
    function imsg(t, err){ var m = $("#crmImpMsg"); m.textContent = t || ""; m.className = "adm-msg" + (err ? " err" : ""); }
    function tog(el, on){ el.setAttribute("aria-pressed", on ? "true" : "false"); }

    $("#crmKinds").innerHTML = Object.keys(KINDS).map(function(k){ return '<button type="button" class="adm-toggle" data-k="' + k + '" aria-pressed="true">' + KINDS[k] + '</button>'; }).join("");

    function load(){
      return Promise.all([fs.get(fs.ref(db, "crm/members")), fs.get(fs.ref(db, "crm/support"))]).then(function(s){
        data.members = []; data.support = [];
        s[0].forEach(function(d){ data.members.push(Object.assign({id: d.key}, d.val())); });
        s[1].forEach(function(d){ data.support.push(normOrder(Object.assign({id: d.key}, d.val()))); });
        loaded = true;
        if (!inc.from) setPreset(inc.preset, true);
        draw();
      }).catch(function(err){
        if (err && /permission/i.test(String(err.code || "") + String(err.message || ""))) msg("CRM məlumatını oxumaq mümkün olmadı. Firebase Rules-a «crm» qaydasını əlavə edin (firebase-rules.json faylına bax).", true);
        else denied(err);
      });
    }

    /* ----- gəlir paneli ----- */
    function setPreset(p, silent){
      var t = today(), ev = buildEvents(data.members, data.support).events, dates = ev.map(function(e){ return e.date; }).sort();
      inc.preset = p;
      if (p === "30") { inc.from = addDays(t, -29); inc.to = t; }
      else if (p === "90") { inc.from = addDays(t, -89); inc.to = t; }
      else if (p === "month") { inc.from = t.slice(0, 8) + "01"; inc.to = t; }
      else if (p === "year") { inc.from = t.slice(0, 4) + "-01-01"; inc.to = t; }
      else { inc.from = dates.length ? dates[0] : addDays(t, -29); inc.to = dates.length && dates[dates.length - 1] > t ? dates[dates.length - 1] : t; }
      if (!silent) drawIncome();
    }
    function drawIncome(){
      $("#crmFrom").value = inc.from; $("#crmTo").value = inc.to; $("#crmGran").value = inc.gran; tog($("#crmCum"), inc.cum);
      Array.prototype.forEach.call(box.querySelectorAll("#crmKinds [data-k]"), function(b){ tog(b, inc.kinds.indexOf(b.getAttribute("data-k")) >= 0); });
      Array.prototype.forEach.call(box.querySelectorAll(".crm-range [data-r]"), function(b){ b.classList.toggle("on", b.getAttribute("data-r") === inc.preset); });
      var cards = $("#crmIncCards"), chart = $("#crmChart"), note = $("#crmIncNote");
      if (!loaded) { chart.textContent = "Yüklənir…"; cards.innerHTML = ""; return; }
      if (!isoOk(inc.from) || !isoOk(inc.to) || inc.from > inc.to) { chart.innerHTML = '<p class="adm-note">Tarix aralığı düzgün deyil.</p>'; cards.innerHTML = ""; note.textContent = ""; return; }
      var b = buildEvents(data.members, data.support), g = inc.gran === "auto" ? autoGran(inc.from, inc.to) : inc.gran;
      var kinds = inc.kinds.length ? inc.kinds : [];
      var sr = series(b.events, inc.from, inc.to, g, kinds);
      var len = (ms(inc.to) - ms(inc.from)) / 864e5 + 1, pTo = addDays(inc.from, -1), pFrom = addDays(pTo, -(len - 1));
      var prev = sumRange(b.events, pFrom, pTo, kinds), cur = sr.total;
      var chg = prev > 0 ? Math.round((cur - prev) / prev * 100) : null;
      var best = sr.points.reduce(function(a, p){ return p.value > a.value ? p : a; }, {value: 0, label: "—"});
      var pend = pending(data.support);
      var byKind = {}; Object.keys(KINDS).forEach(function(k){ byKind[k] = sumRange(b.events, inc.from, inc.to, [k]); });
      var cardArr = [
        ["Seçilmiş dövr", money(cur)],
        ["Əvvəlki eyni dövrə görə", chg === null ? "—" : (chg > 0 ? "↑ +" : chg < 0 ? "↓ " : "") + chg + "%"],
        ["Ən yaxşı " + (g === "day" ? "gün" : g === "week" ? "həftə" : "ay"), best.value ? best.label + ": " + money(best.value) : "—"],
        ["Gözlənilən yekun ödəniş", money(pend.amount) + (pend.count ? " (" + pend.count + " nəfər)" : "")]
      ];
      cards.innerHTML = cardArr.map(function(c, i){
        var cls = i === 1 ? (chg > 0 ? " up" : chg < 0 ? " down" : "") : "";
        return '<div class="st-card"><small>' + c[0] + '</small><b class="' + cls.trim() + '">' + esc(c[1]) + '</b></div>';
      }).join("");
      chart.innerHTML = cur || sr.points.some(function(p){ return p.value; }) ? chartSvg(sr.points, inc.cum) : '<p class="adm-note">Bu aralıqda seçilmiş növlər üzrə gəlir yoxdur.</p>';
      var parts = Object.keys(KINDS).map(function(k){ return KINDS[k] + ": " + money(byKind[k]); });
      var txt = parts.join(" · ") + ". Xətt yaşıl olanda əvvəlki dövrdən artıb, qırmızı olanda azalıb.";
      if (b.estimated) txt += "\n" + b.estimated + " ilkin ödənişin tarixi məlum olmadığı üçün layihə deadline-ı ilə təxmin edilib («Xidmətlər» vərəqində redaktə edib dəqiq tarix yaza bilərsiniz).";
      if (b.undated.count) txt += "\n" + b.undated.count + " ödəniş (" + money(b.undated.amount) + ") tarixsiz olduğu üçün qrafikə düşmür.";
      note.textContent = txt; note.style.whiteSpace = "pre-line";
    }
    $(".crm-range").addEventListener("click", function(e){ var b = e.target.closest ? e.target.closest("[data-r]") : null; if (b) setPreset(b.getAttribute("data-r")); });
    $("#crmFrom").addEventListener("change", function(){ inc.from = this.value; inc.preset = ""; drawIncome(); });
    $("#crmTo").addEventListener("change", function(){ inc.to = this.value; inc.preset = ""; drawIncome(); });
    $("#crmGran").addEventListener("change", function(){ inc.gran = this.value; drawIncome(); });
    $("#crmCum").addEventListener("click", function(){ inc.cum = !inc.cum; drawIncome(); });
    $("#crmKinds").addEventListener("click", function(e){
      var b = e.target.closest ? e.target.closest("[data-k]") : null; if (!b) return;
      var k = b.getAttribute("data-k"), i = inc.kinds.indexOf(k);
      if (i >= 0) inc.kinds.splice(i, 1); else inc.kinds.push(k);
      drawIncome();
    });

    /* ----- siyahı paneli ----- */
    function badge(text, cls){ return '<span class="crm-badge ' + cls + '">' + esc(text) + '</span>'; }

    function drawStats(){
      var h;
      if (tab === "members") {
        var act = 0, soon = 0, total = 0, expired = 0;
        data.members.forEach(function(m){
          total += +m.amount || 0;
          var d = daysTo(m.endDate);
          if (d === null || d >= 0) act++; else expired++;
          if (d !== null && d >= 0 && d <= 30) soon++;
        });
        h = [["Aktiv üzv", act], ["30 gün ərzində bitir", soon], ["Müddəti bitib", expired], ["Üzvlük gəliri", money(total)]];
      } else {
        var ini = 0, fin = 0, acc = 0;
        data.support.forEach(function(o){ ini += o.initialAmount; fin += o.finalPaid; acc += calc(o).accepted; });
        var p = pending(data.support);
        h = [["Sifariş sayı", data.support.length], ["Qəbul olunan layihə", acc], ["Alınıb (ilkin + yekun)", money(ini + fin)], ["Gözlənilən yekun", money(p.amount)]];
      }
      $("#crmStats").innerHTML = h.map(function(c){ return '<div class="st-card"><small>' + c[0] + '</small><b>' + esc(c[1]) + '</b></div>'; }).join("");
    }

    function draw(){
      drawIncome();
      if (tab === "income") return;
      drawStats();
      var list = tab === "members" ? data.members.slice() : data.support.slice(), ql = q.trim().toLowerCase();
      if (ql) list = list.filter(function(m){
        var extra = tab === "support" ? m.projects.map(function(p){ return p.link; }).join(" ") : (m.note || "");
        return (m.name + " " + m.phone + " " + (m.email || "") + " " + extra).toLowerCase().indexOf(ql) >= 0;
      });
      if (tab === "members") list.sort(function(a, b){ return (a.endDate || "9999").localeCompare(b.endDate || "9999"); });
      else list.sort(function(a, b){ return (b.initialDate || "").localeCompare(a.initialDate || ""); });
      var out = $("#crmList");
      if (!list.length) { out.innerHTML = '<p class="adm-note">' + (loaded ? "Heç nə tapılmadı." : "Yüklənir…") + '</p>'; return; }
      var h = '<div class="st-wrap"><table class="st-table"><thead><tr>';
      h += tab === "members"
        ? '<th>Ad</th><th>Telefon</th><th>Paket</th><th>Başlama</th><th>Bitmə</th><th>Qeyd</th><th></th>'
        : '<th>Ad</th><th>Telefon</th><th>Paket</th><th>Layihələr</th><th>İlkin ödəniş</th><th>Yekun ödəniş</th><th>Üzvlük</th><th></th>';
      h += '</tr></thead><tbody>';
      list.forEach(function(m){
        h += '<tr><td>' + esc(m.name) + '</td><td><a href="https://wa.me/' + esc(String(m.phone || "").replace(/\D/g, "")) + '" target="_blank" rel="noopener">' + esc(m.phone) + '</a></td>';
        if (tab === "members") {
          var d = daysTo(m.endDate), b = d === null ? "" : d < 0 ? badge("Bitib", "bad") : d <= 30 ? badge(d + " gün qalıb", "warn") : "";
          h += '<td>' + esc((MPLANS[m.plan] || MPLANS.free).label) + '</td><td>' + fmtDate(m.startDate) + '</td><td>' + fmtDate(m.endDate) + ' ' + b + '</td><td>' + esc(m.note || "") + '</td>';
        } else {
          var c = calc(m), cnt = {};
          m.projects.forEach(function(p){ cnt[p.status] = (cnt[p.status] || 0) + 1; });
          var pj = m.projects.length ? Object.keys(STATUS).filter(function(k){ return cnt[k]; }).map(function(k){
            return badge(cnt[k] + " " + STATUS[k].toLowerCase(), k === "rejected" ? "bad" : k === "reserve" ? "warn" : k === "accepted" ? "ok" : "info");
          }).join(" ") : "—";
          var fin = c.due <= 0 ? "—" : c.pending <= 0 ? badge("Alınıb " + money(c.paid), "ok") : badge("Gözlənilir " + money(c.pending), "warn");
          h += '<td>' + esc(packLabel(m)) + '</td><td>' + pj + '</td><td>' + money(m.initialAmount) + '<small>' + (m.initialDate ? fmtDate(m.initialDate) + (m.initialEstimated ? " (təxmini)" : "") : "tarixsiz") + '</small></td><td>' + fin + '</td><td>' + esc(ORG[m.org] || "") + '</td>';
        }
        var payBtn = tab === "support" && calc(m).pending > 0 ? '<button type="button" class="adm-btn" data-p="' + esc(m.id) + '">Yekun alındı</button> ' : "";
        h += '<td class="crm-act">' + payBtn + '<button type="button" class="adm-btn" data-e="' + esc(m.id) + '">Redaktə</button> <button type="button" class="adm-btn danger" data-d="' + esc(m.id) + '">Sil</button></td></tr>';
      });
      out.innerHTML = h + '</tbody></table></div>';
    }

    function opts(map, sel){ return Object.keys(map).map(function(k){ return '<option value="' + k + '"' + (k === sel ? " selected" : "") + '>' + esc(typeof map[k] === "string" ? map[k] : map[k].label) + '</option>'; }).join(""); }
    function packOpts(program, sel){
      var P = PACKS[program] || {};
      return Object.keys(P).map(function(k){ return '<option value="' + k + '"' + (k === sel ? " selected" : "") + '>' + P[k].label + ' (ilkin ' + P[k].initial + ' AZN)</option>'; }).join("") +
        '<option value="custom"' + (sel === "custom" ? " selected" : "") + '>Digər (məbləği özüm yazıram)</option>';
    }
    function projRow(p){
      p = p || {};
      return '<div class="crm-proj"><input type="url" class="p-link" placeholder="Layihə linki" maxlength="500" value="' + esc(p.link || "") + '">' +
        '<select class="p-status">' + opts(STATUS, p.status || "applied") + '</select>' +
        '<label>Deadline <input type="date" class="p-dl" value="' + esc(p.deadline || "") + '"></label>' +
        '<label>Selection <input type="date" class="p-sel" value="' + esc(p.selection || "") + '"></label>' +
        '<button type="button" class="adm-btn danger p-del" aria-label="Layihəni çıxar">×</button></div>';
    }

    function openForm(rec){
      rec = rec || {}; editing = rec.id || null;
      var f = $("#crmForm"), h = '<div class="adm-grid">' +
        '<div class="field"><label>Ad, soyad *</label><input id="c-name" type="text" required maxlength="120" value="' + esc(rec.name || "") + '"></div>' +
        '<div class="field"><label>Telefon *</label><input id="c-phone" type="text" required maxlength="30" placeholder="050 123 45 67" value="' + esc(rec.phone || "") + '"></div>';
      if (tab === "members") {
        h += '<div class="field"><label>Paket *</label><select id="c-plan">' + opts(MPLANS, rec.plan || "y50") + '</select></div>' +
          '<div class="field"><label>Məbləğ (AZN)</label><input id="c-amount" type="number" min="0" step="1" value="' + esc(rec.amount != null ? rec.amount : 50) + '"></div>' +
          '<div class="field"><label>Başlama tarixi *</label><input id="c-start" type="date" required value="' + esc(rec.startDate || today()) + '"></div>' +
          '<div class="field"><label>Bitmə tarixi (boş qalsa avtomatik)</label><input id="c-end" type="date" value="' + esc(rec.endDate || "") + '"></div>' +
          '<div class="field full"><label>Qeyd</label><input id="c-note" type="text" maxlength="200" value="' + esc(rec.note || "") + '"></div>';
      } else {
        var prog = rec.program || "SALTO", pack = rec.pack || "standard", P = PACKS[prog] && PACKS[prog][pack];
        h += '<div class="field"><label>Mail</label><input id="c-email" type="email" maxlength="120" value="' + esc(rec.email || "") + '"></div>' +
          '<div class="field"><label>Üzvlük</label><select id="c-org">' + opts(ORG, rec.org || "member") + '</select></div>' +
          '<div class="field"><label>Proqram *</label><select id="c-prog">' + opts(PROGRAMS, prog) + '</select></div>' +
          '<div class="field"><label>Paket *</label><select id="c-pack">' + packOpts(prog, pack) + '</select></div>' +
          '<div class="field"><label>İlkin ödəniş (AZN)</label><input id="c-initial" type="number" min="0" step="1" value="' + esc(rec.initialAmount != null ? rec.initialAmount : (P ? P.initial : 0)) + '"></div>' +
          '<div class="field"><label>İlkin ödəniş tarixi' + (rec.initialEstimated ? " (təxmini idi)" : "") + '</label><input id="c-idate" type="date" value="' + esc(rec.id && !rec.initialEstimated ? rec.initialDate : (rec.initialDate || today())) + '"></div>' +
          '<div class="field full"><label>Layihələr</label><div id="c-projs">' + (rec.projects && rec.projects.length ? rec.projects : [{}]).map(projRow).join("") + '</div>' +
          '<div><button type="button" class="adm-btn" id="c-addproj">Layihə əlavə et</button></div></div>' +
          '<div class="field full"><div class="adm-note" id="c-due" style="margin:0;"></div></div>' +
          '<div class="field"><label>Yekun məbləği əl ilə yaz (boş = avtomatik)</label><input id="c-fover" type="number" min="0" step="1" value="' + esc(rec.finalOverride !== null && rec.finalOverride !== undefined ? rec.finalOverride : "") + '"></div>' +
          '<div class="field"><label>Alınmış yekun ödəniş (AZN)</label><input id="c-fpaid" type="number" min="0" step="1" value="' + esc(rec.finalPaid || 0) + '"></div>' +
          '<div class="field"><label>Yekun ödəniş tarixi</label><input id="c-fdate" type="date" value="' + esc(rec.finalDate || "") + '"></div>' +
          '<div class="field"><label>Qeyd</label><input id="c-note" type="text" maxlength="200" value="' + esc(rec.note || "") + '"></div>';
      }
      h += '</div><div class="adm-actions"><button type="submit" class="btn-primary" style="border:none;cursor:pointer;font-family:Inter,sans-serif;">' + (editing ? "Yadda saxla" : "Əlavə et") + '</button>' +
        '<button type="button" class="adm-btn" id="crmCancel">Ləğv et</button></div>';
      f.innerHTML = h; f.hidden = false;
      var plan = f.querySelector("#c-plan");
      if (plan) plan.addEventListener("change", function(){ f.querySelector("#c-amount").value = MPLANS[plan.value].amount; });
      if (tab === "support") wireOrderForm(f);
      f.querySelector("#crmCancel").addEventListener("click", closeForm);
      f.querySelector("#c-name").focus({preventScroll: true});
    }
    function readProjects(f){
      return Array.prototype.map.call(f.querySelectorAll(".crm-proj"), function(r){
        return {link: r.querySelector(".p-link").value.trim(), status: r.querySelector(".p-status").value, deadline: r.querySelector(".p-dl").value, selection: r.querySelector(".p-sel").value};
      }).filter(function(p){ return p.link || p.deadline || p.status !== "applied"; });
    }
    function wireOrderForm(f){
      function dueText(){
        var o = {program: f.querySelector("#c-prog").value, pack: f.querySelector("#c-pack").value, projects: readProjects(f),
                 finalOverride: f.querySelector("#c-fover").value === "" ? null : +f.querySelector("#c-fover").value, finalPaid: +f.querySelector("#c-fpaid").value || 0};
        var c = calc(o);
        f.querySelector("#c-due").textContent = "Qəbul olunan layihə: " + c.accepted + ". Yekun ödəniş: " + (c.due ? money(c.due) : "yoxdur") +
          (c.due ? " (alınıb " + money(c.paid) + ", qalıb " + money(c.pending) + ")" : "") + ".";
      }
      f.querySelector("#c-prog").addEventListener("change", function(){
        f.querySelector("#c-pack").innerHTML = packOpts(this.value, "standard");
        f.querySelector("#c-pack").dispatchEvent(new Event("change"));
      });
      f.querySelector("#c-pack").addEventListener("change", function(){
        var P = PACKS[f.querySelector("#c-prog").value] && PACKS[f.querySelector("#c-prog").value][this.value];
        if (P) f.querySelector("#c-initial").value = P.initial;
        dueText();
      });
      f.addEventListener("input", dueText); f.addEventListener("change", dueText);
      f.querySelector("#c-addproj").addEventListener("click", function(){ f.querySelector("#c-projs").insertAdjacentHTML("beforeend", projRow()); dueText(); });
      f.querySelector("#c-projs").addEventListener("click", function(e){
        var b = e.target.closest ? e.target.closest(".p-del") : null; if (!b) return;
        var rows = f.querySelectorAll(".crm-proj");
        if (rows.length > 1) b.parentNode.parentNode.removeChild(b.parentNode); else b.parentNode.querySelector(".p-link").value = "";
        dueText();
      });
      dueText();
    }
    function closeForm(){ var f = $("#crmForm"); f.hidden = true; f.innerHTML = ""; editing = null; }
    function v(id){ var e = $("#" + id); return e ? e.value.trim() : ""; }

    $("#crmForm").addEventListener("submit", function(e){
      e.preventDefault();
      var phone = normPhone(v("c-phone")), rec, f = $("#crmForm");
      if (!v("c-name")) { msg("Ad yazın.", true); return; }
      if (!phone) { msg("Telefon nömrəsi oxunmadı. Nümunə: 050 123 45 67 və ya +994501234567.", true); return; }
      if (tab === "members") {
        var plan = v("c-plan"), start = v("c-start");
        if (!start) { msg("Başlama tarixini seçin.", true); return; }
        var end = v("c-end") || addMonths(start, MPLANS[plan].months);
        if (end < start) { msg("Bitmə tarixi başlama tarixindən əvvəl ola bilməz.", true); return; }
        rec = {name: v("c-name"), phone: phone, plan: plan, amount: +v("c-amount") || 0, startDate: start, endDate: end, note: v("c-note")};
      } else {
        var projects = readProjects(f), bad = projects.filter(function(p){ return p.link && !/^https?:\/\//i.test(p.link); });
        if (bad.length) { msg("Layihə linki http:// və ya https:// ilə başlamalıdır.", true); return; }
        rec = {name: v("c-name"), phone: phone, email: v("c-email"), org: v("c-org"), program: v("c-prog"), pack: v("c-pack"),
               initialAmount: +v("c-initial") || 0, initialDate: v("c-idate"), initialEstimated: false,
               finalPaid: +v("c-fpaid") || 0, finalDate: v("c-fdate"), note: v("c-note"), projects: projects,
               finalOverride: v("c-fover") === "" ? null : +v("c-fover")};
        if (rec.finalPaid > 0 && !rec.finalDate) rec.finalDate = today();
      }
      rec.updatedAt = fs.serverTimestamp();
      var path = "crm/" + tab, job;
      if (editing) job = fs.update(fs.ref(db, path + "/" + editing), rec);
      else { rec.createdAt = fs.serverTimestamp(); job = fs.push(fs.ref(db, path), rec); }
      msg("Saxlanılır…");
      job.then(function(){ var was = editing; closeForm(); msg(was ? "Dəyişikliklər saxlanıldı." : "Əlavə olundu."); return load(); }).catch(denied);
    });

    $("#crmList").addEventListener("click", function(e){
      var b = e.target.closest ? e.target.closest("button") : null; if (!b) return;
      var list = data[tab], id = b.getAttribute("data-e") || b.getAttribute("data-d") || b.getAttribute("data-p"), rec = null;
      list.forEach(function(m){ if (m.id === id) rec = m; });
      if (!rec) return;
      if (b.hasAttribute("data-p")) {
        var c = calc(rec);
        fs.update(fs.ref(db, "crm/support/" + id), {finalPaid: c.due, finalDate: today(), updatedAt: fs.serverTimestamp()})
          .then(function(){ msg("Yekun ödəniş qeyd olundu: " + rec.name + " (" + money(c.due) + ")."); return load(); }).catch(denied);
        return;
      }
      if (b.hasAttribute("data-e")) { openForm(rec); window.scrollTo({top: box.getBoundingClientRect().top + window.scrollY - 20, behavior: "smooth"}); return; }
      if (!window.confirm("Silinsin?\n\n" + rec.name)) return;
      fs.remove(fs.ref(db, "crm/" + tab + "/" + id)).then(function(){ msg("Silindi."); return load(); }).catch(denied);
    });

    function setTab(t){
      tab = t; closeForm(); msg(""); imsg(""); pendingImport = []; $("#crmGo").disabled = true; $("#crmPaste").value = "";
      tog($("#crmTabI"), t === "income"); tog($("#crmTabS"), t === "support"); tog($("#crmTabM"), t === "members");
      $("#crmIncome").hidden = t !== "income"; $("#crmListPane").hidden = t === "income";
      $("#crmImpHelp").textContent = t === "members"
        ? "Google Sheets-də «Sending Organization» cədvəlini başlıq sətri ilə kopyalayıb (Ctrl+C) bura yapışdırın → «Yoxla» → «Əlavə et». Telefonlar +994 formatına salınır, təkrar sətirlər keçilir."
        : "«Fərdi Dəstək» cədvəlini başlıq sətri ilə kopyalayıb bura yapışdırın → «Yoxla» → «Əlavə et». Eyni telefonlu sətirlər bir sifarişdə birləşir, proqram link-dən, paket ilkin ödənişdən təyin olunur. Parol sütunu saxlanılmır. «Ödəniş tarixi» sütunu varsa istifadə olunur, yoxdursa deadline ilə təxmin edilir.";
      draw();
    }
    $("#crmTabI").addEventListener("click", function(){ setTab("income"); });
    $("#crmTabS").addEventListener("click", function(){ setTab("support"); });
    $("#crmTabM").addEventListener("click", function(){ setTab("members"); });
    $("#crmReload").addEventListener("click", load);
    $("#crmAdd").addEventListener("click", function(){ openForm(null); });
    $("#crmSearch").addEventListener("input", function(){ q = this.value; draw(); });

    $("#crmPaste").addEventListener("input", function(){ pendingImport = []; $("#crmGo").disabled = true; });
    $("#crmCheck").addEventListener("click", function(){
      var r = (tab === "members" ? importMembers : importOrders)($("#crmPaste").value, data[tab]);
      pendingImport = r.errors.length ? [] : r.ok; $("#crmGo").disabled = !pendingImport.length;
      if (r.errors.length) { imsg("Xətalar (heç nə əlavə olunmayıb):\n" + r.errors.join("\n"), true); return; }
      if (!r.ok.length) { imsg(r.skipped ? "Hamısı artıq bazada var (" + r.skipped + " təkrar)." : "Əlavə ediləcək sətir tapılmadı."); return; }
      imsg(r.ok.length + " yeni qeyd əlavə olunacaq" + (r.skipped ? ", " + r.skipped + " təkrar keçiləcək" : "") + ".\n" +
        r.ok.map(function(o){ return "• " + o.name + " (" + o.phone + ")" + (tab === "support" ? " — " + packLabel(o) + ", ilkin " + money(o.initialAmount) + ", " + o.projects.length + " layihə" : ""); }).join("\n") +
        (r.warnings.length ? "\n\nDiqqət:\n" + r.warnings.join("\n") : ""));
    });
    $("#crmGo").addEventListener("click", function(){
      var list = pendingImport.slice(); if (!list.length) return;
      var b = $("#crmGo"); b.disabled = true; var done = 0;
      list.reduce(function(chain, o){
        return chain.then(function(){
          o.createdAt = fs.serverTimestamp(); o.updatedAt = fs.serverTimestamp();
          return fs.push(fs.ref(db, "crm/" + tab), o).then(function(){ done++; imsg("Əlavə olunur… " + done + "/" + list.length); });
        });
      }, Promise.resolve()).then(function(){
        pendingImport = []; $("#crmPaste").value = ""; return load().then(function(){ imsg(done + " qeyd əlavə olundu."); });
      }).catch(function(err){
        if (done) imsg(done + "/" + list.length + " əlavə olundu, sonra xəta.", true); else denied(err);
        load();
      });
    });

    setTab("income");
    load();
  }

  root.GV_initCrm = init;
  root.GV_crmUtil = {normPhone: normPhone, normDate: normDate, parseAmount: parseAmount, finalAuto: finalAuto, normOrder: normOrder, calc: calc,
    importMembers: importMembers, importOrders: importOrders, buildEvents: buildEvents, pending: pending, series: series, sumRange: sumRange,
    chartSvg: chartSvg, autoGran: autoGran, bucketKey: bucketKey, guessProgram: guessProgram, guessPack: guessPack};
})(window);
