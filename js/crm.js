/* Admin panel CRM: income chart, service orders (SALTO / ESC packages) and Sending Organization members.
   Data lives in Firebase Realtime Database under "crm" (only the admin account can read and write it).
   Income types:
     - membership: Sending Organization fee (50 AZN yearly, 30 AZN for 6 months), dated by the payment date
     - initial service fee: always kept, never refunded, even if the volunteer is rejected
     - final payment: due when a project accepts the volunteer, amount depends on the number of acceptances (site prices)
   Currency: amounts are STORED in AZN (the site's prices and the existing data are in AZN) and SHOWN in USD.
   Every amount input is in USD and shows its AZN equivalent underneath. The conversion uses AZN_PER_USD below.
   Import from Sheets: copy the cells and paste them into "Import from Sheets". The password column is never imported. */
(function(root){
  "use strict";

  /* Central Bank of Azerbaijan official rate, fixed at 1.70 AZN per 1 USD. Change here if it ever moves. */
  var AZN_PER_USD = 1.7;

  /* site prices (index.html, Packages), in AZN. tiers: [minimum accepted projects, final payment] */
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
    y50: {name: "Yearly", amount: 50, months: 12},
    y45: {name: "Yearly, old price", amount: 45, months: 12},
    m30: {name: "6 months", amount: 30, months: 6},
    free: {name: "Free / other", amount: 0, months: 12}
  };
  var STATUS = {applied: "Applied", reserve: "Reserve", rejected: "Rejected", accepted: "Accepted"};
  var ORG = {member: "Member", nonmember: "Non-member", project: "This project only"};
  var KINDS = {member: "Membership", initial: "Initial service fee", final: "Final payment"};

  /* ---------- helpers ---------- */
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
  function toArr(v){ return Array.isArray(v) ? v.filter(Boolean) : (v && typeof v === "object" ? Object.keys(v).map(function(k){ return v[k]; }) : []); }
  function plain(v){ return String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  /* money: stored in AZN, shown in USD */
  function r2(n){ return Math.round((+n || 0) * 100) / 100; }
  function usd(azn){ return (+azn || 0) / AZN_PER_USD; }
  function toAzn(u){ return r2((+u || 0) * AZN_PER_USD); }
  function commas(s){ return String(s).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function fmtUsd(u){ var n = r2(u), p = Math.abs(n).toFixed(2).split("."); return (n < 0 ? "-" : "") + "$" + commas(p[0]) + "." + p[1]; }
  function money(azn){ return fmtUsd(usd(azn)); }
  function fmtAzn(a){ return commas(r2(a)) + " AZN"; }
  function both(azn){ return money(azn) + " (" + fmtAzn(azn) + ")"; }
  function usdStr(azn){ return r2(usd(azn)).toFixed(2); }
  function planLabel(k, withAzn){ var p = MPLANS[k] || MPLANS.free; return p.name + (p.amount ? " · " + (withAzn ? both(p.amount) : money(p.amount)) : ""); }

  /* phone: normalises to +994XXXXXXXXX, returns "" when it can't be read */
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
  /* Sheets store amounts like "50AZN" / "50 AZN" */
  function parseAmount(v){ var m = /(\d+(?:[.,]\d+)?)\s*azn/i.exec(String(v || "")); return m ? parseFloat(m[1].replace(",", ".")) : null; }
  function statusOf(v){
    v = plain(v);
    if (v.indexOf("imtina") >= 0 || v.indexOf("reject") >= 0) return "rejected";
    if (v.indexOf("rezerv") >= 0 || v.indexOf("reserve") >= 0) return "reserve";
    if (v.indexOf("qebul") >= 0 || v.indexOf("accept") >= 0) return "accepted";
    return "applied";
  }
  function orgOf(v){
    v = plain(v);
    if (v.indexOf("deyil") >= 0 || v.indexOf("non") >= 0) return "nonmember";
    if (v.indexOf("yalniz") >= 0 || v.indexOf("layih") >= 0 || v.indexOf("only") >= 0) return "project";
    return "member";
  }

  /* ---------- package and payment logic ---------- */
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
  function packName(o){ var P = PACKS[o.program] && PACKS[o.program][o.pack]; return P ? P.label : "Custom"; }
  function packLabel(o){ return (PROGRAMS[o.program] || o.program) + " · " + packName(o); }

  /* ---------- income events and chart (all values in AZN here, converted to USD only for display) ---------- */
  function buildEvents(members, orders){
    var ev = [], undated = {count: 0, amount: 0}, estimated = 0;
    function add(date, amount, kind, est){
      if (!(amount > 0)) return;
      if (!isoOk(date)) { undated.count++; undated.amount += amount; return; }
      if (est) estimated++;
      ev.push({date: date, amount: amount, kind: kind, est: !!est});
    }
    members.forEach(function(m){ add(m.paidDate || m.startDate, +m.amount || 0, "member", false); });
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
  /* points for the selected range and income types; empty periods are included as zeros */
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
  /* points carry USD values. Rising segment green, falling red, unchanged grey. */
  function chartSvg(points, cumulative){
    var W = 680, H = 280, L = 58, R = 14, T = 16, B = 34, n = points.length;
    var vals = [], run = 0;
    points.forEach(function(p){ run += p.value; vals.push(cumulative ? run : p.value); });
    var max = niceMax(Math.max.apply(null, vals.concat([0])));
    function X(i){ return n === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (n - 1); }
    function Y(v){ return T + (H - T - B) * (1 - v / max); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Income chart in US dollars" style="display:block;max-width:100%;height:auto;font:11px Inter,sans-serif;">', i;
    for (i = 0; i <= 4; i++) {
      var gv = max * i / 4, gy = Y(gv);
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" style="stroke:var(--line);stroke-width:1"/>' +
        '<text x="' + (L - 6) + '" y="' + (gy + 4) + '" text-anchor="end" style="fill:var(--ink-soft)">$' + commas(Math.round(gv)) + '</text>';
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
        esc(points[i].label + ": " + fmtUsd(vals[i]) + (i ? " (" + (diff >= 0 ? "+" : "-") + fmtUsd(Math.abs(diff)) + ")" : "")) + '</title></circle>';
    }
    return s + '</svg>';
  }

  /* ---------- import from Sheets (copied cells) ---------- */
  /* Sheets wraps cells that contain line breaks in double quotes, so the text is read character by character */
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

  /* the sheet headers are in Azerbaijani (as in the existing Sheets); English headers work too */
  function importMembers(text, existing){
    var t = parseTsv(text), out = {ok: [], errors: [], warnings: [], skipped: 0};
    var iName = colIdx(t.head, ["ad,", "ad soyad", "full name", "name", "ad"]), iPh = colIdx(t.head, ["əlaqə", "nömrə", "telefon", "phone"]),
        iSt = colIdx(t.head, ["başlama", "baslama", "start"]), iEn = colIdx(t.head, ["bitmə", "bitme", "end"]), iNote = colIdx(t.head, ["qeyd", "note"]);
    if (iName < 0 || iPh < 0 || iSt < 0) { out.errors.push("Header row not found. Copy the cells together with the header row (Name / Phone / Start date ...). Azerbaijani sheet headers are fine."); return out; }
    var seen = {};
    existing.forEach(function(m){ seen[(m.phone || "") + "|" + (m.startDate || "")] = 1; });
    t.rows.forEach(function(r, i){
      var name = cell(r, iName).replace(/\s+/g, " ");
      if (!name || /^ad,?\s*soyad$/i.test(name)) return;
      var n = "Row " + (i + 2) + " (" + name + "): ", er = [];
      var phone = normPhone(cell(r, iPh)), start = normDate(cell(r, iSt)), end = normDate(cell(r, iEn));
      var note = cell(r, iNote), amount = parseAmount(note);
      if (!phone) er.push("phone not recognized (" + cell(r, iPh) + ")");
      if (!start) er.push("start date not recognized");
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

  /* rows with the same phone number become one order (each row is one project) */
  function importOrders(text, existing){
    var t = parseTsv(text), out = {ok: [], errors: [], warnings: [], skipped: 0};
    var iLink = colIdx(t.head, ["lahiy", "layih", "link", "project"]), iName = colIdx(t.head, ["ad soyad", "full name", "name", "ad"]), iMail = colIdx(t.head, ["mail"]),
        iPh = colIdx(t.head, ["əlaqə", "nömrə", "telefon", "phone"]), iSt = colIdx(t.head, ["status"]), iDl = colIdx(t.head, ["deadline"]),
        iSel = colIdx(t.head, ["selection"]), iPay = colIdx(t.head, ["ödəniş tarixi", "odenis tarixi", "payment date"]), iAmt = -1,
        iOrg = colIdx(t.head, ["organization", "organ"]);
    if (iName < 0 || iPh < 0) { out.errors.push("Header row not found. Copy the cells together with the header row (Project / Name / Mail / Phone ...). The password column is skipped automatically."); return out; }
    t.head.forEach(function(h, i){ if (iAmt < 0 && (h.indexOf("ödəniş") >= 0 || h.indexOf("odenis") >= 0 || h.indexOf("payment") >= 0) && h.indexOf("tarix") < 0 && h.indexOf("date") < 0) iAmt = i; });
    var groups = {}, order = [];
    t.rows.forEach(function(r, i){
      var name = cell(r, iName).replace(/\s+/g, " ");
      if (!name) return;
      var phone = normPhone(cell(r, iPh));
      if (!phone) { out.errors.push("Row " + (i + 2) + " (" + name + "): phone not recognized (" + cell(r, iPh) + ")"); return; }
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
      if (rows.length > 1) out.warnings.push(first.name + ": " + rows.length + " rows merged into one order, initial payment " + both(amt) + " (rows had: " + amounts.join(", ") + " AZN). If each row was a separate payment, edit the order.");
      if (pack === "custom") out.warnings.push(first.name + ": " + both(amt) + " doesn't match any package, \"Custom\" was selected.");
      out.ok.push(o);
    });
    return out;
  }

  /* ---------- interface ---------- */
  function init(box, ctx){
    var fs = ctx.fs, db = ctx.db, denied = ctx.denied;
    var tab = "income", data = {members: [], support: []}, q = "", editing = null, loaded = false, pendingImport = [], renewFrom = null;
    var inc = {from: "", to: "", gran: "auto", cum: false, kinds: ["member", "initial", "final"], preset: "all"};

    box.innerHTML =
      '<div class="crm-tabs">' +
      '<button type="button" class="adm-toggle" id="crmTabI" aria-pressed="true">Income</button>' +
      '<button type="button" class="adm-toggle" id="crmTabS" aria-pressed="false">Services (individual support)</button>' +
      '<button type="button" class="adm-toggle" id="crmTabM" aria-pressed="false">Members (Sending Organization)</button>' +
      '<button type="button" class="adm-btn" id="crmReload">Reload</button>' +
      '<button type="button" class="adm-btn" id="crmCsv" hidden>Download CSV</button>' +
      '<button type="button" class="adm-btn" id="crmBackup">Backup (JSON)</button></div>' +
      '<p class="adm-msg" id="crmMsg" role="status"></p>' +
      '<div id="crmIncome">' +
        '<div class="crm-range">' +
        '<button type="button" class="adm-btn" data-r="30">30 days</button><button type="button" class="adm-btn" data-r="90">90 days</button>' +
        '<button type="button" class="adm-btn" data-r="month">This month</button><button type="button" class="adm-btn" data-r="year">This year</button><button type="button" class="adm-btn" data-r="all">All time</button></div>' +
        '<div class="crm-range"><label>From <input type="date" id="crmFrom"></label><label>To <input type="date" id="crmTo"></label>' +
        '<label>Group by <select id="crmGran"><option value="auto">Auto</option><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></label>' +
        '<button type="button" class="adm-toggle" id="crmCum" aria-pressed="false">Cumulative</button></div>' +
        '<div class="crm-range" id="crmKinds"></div>' +
        '<div id="crmIncCards" class="st-cards"></div>' +
        '<div id="crmChart" class="crm-chart"></div>' +
        '<p class="adm-note" id="crmIncNote" style="margin-top:12px;"></p></div>' +
      '<div id="crmListPane" hidden>' +
        '<div class="st-cards" id="crmStats"></div>' +
        '<div class="crm-bar"><input id="crmSearch" type="search" placeholder="Search by name, phone or project" aria-label="Search"><button type="button" class="adm-btn" id="crmAdd">Add new</button></div>' +
        '<form id="crmForm" class="crm-form" hidden autocomplete="off"></form>' +
        '<div id="crmList"></div>' +
        '<details class="crm-import"><summary>Import from Sheets</summary>' +
        '<p class="adm-note" style="margin:12px 0;" id="crmImpHelp"></p>' +
        '<textarea id="crmPaste" style="width:100%;min-height:160px;font-family:monospace;font-size:0.85rem;" spellcheck="false"></textarea>' +
        '<div class="adm-actions" style="margin-top:12px;"><button type="button" class="adm-btn" id="crmCheck">Check</button>' +
        '<button type="button" class="btn-primary" id="crmGo" disabled style="border:none;cursor:pointer;font-family:Inter,sans-serif;">Add records</button></div>' +
        '<p class="adm-msg" id="crmImpMsg" role="status"></p></details></div>';

    function $(s){ return box.querySelector(s); }
    var F = $("#crmForm");
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
        if (err && /permission/i.test(String(err.code || "") + String(err.message || ""))) msg("Can't read the CRM data. Add the \"crm\" rule to Firebase Rules (see firebase-rules.json).", true);
        else denied(err);
      });
    }

    /* ----- income tab (USD) ----- */
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
      if (!loaded) { chart.textContent = "Loading…"; cards.innerHTML = ""; return; }
      if (!isoOk(inc.from) || !isoOk(inc.to) || inc.from > inc.to) { chart.innerHTML = '<p class="adm-note">The date range is not valid.</p>'; cards.innerHTML = ""; note.textContent = ""; return; }
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
        ["Selected period", money(cur)],
        ["vs previous period", chg === null ? "—" : (chg > 0 ? "↑ +" : chg < 0 ? "↓ " : "") + chg + "%"],
        ["Best " + g, best.value ? best.label + ": " + money(best.value) : "—"],
        ["Expected final payments", money(pend.amount) + (pend.count ? " (" + pend.count + (pend.count === 1 ? " person" : " people") + ")" : "")]
      ];
      cards.innerHTML = cardArr.map(function(c, i){
        var cls = i === 1 ? (chg > 0 ? " up" : chg < 0 ? " down" : "") : "";
        return '<div class="st-card"><small>' + c[0] + '</small><b class="' + cls.trim() + '">' + esc(c[1]) + '</b></div>';
      }).join("");
      var pts = sr.points.map(function(p){ return {key: p.key, label: p.label, value: usd(p.value)}; });
      chart.innerHTML = cur || sr.points.some(function(p){ return p.value; }) ? chartSvg(pts, inc.cum) : '<p class="adm-note">No income in this range for the selected types.</p>';
      var parts = Object.keys(KINDS).map(function(k){ return KINDS[k] + ": " + money(byKind[k]); });
      var txt = parts.join(" · ") + ".\nThe line is green where income rose compared with the previous point and red where it fell. All amounts are in USD (1 USD = " + AZN_PER_USD.toFixed(2) + " AZN).";
      if (b.estimated) txt += "\n" + b.estimated + " initial payment date" + (b.estimated === 1 ? " is" : "s are") + " estimated from the project deadline because the real date is unknown (edit the order in the Services tab to set the exact date).";
      if (b.undated.count) txt += "\n" + b.undated.count + " payment" + (b.undated.count === 1 ? "" : "s") + " (" + money(b.undated.amount) + ") have no date and are not on the chart.";
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

    /* ----- list tabs ----- */
    function badge(text, cls){ return '<span class="crm-badge ' + cls + '">' + esc(text) + '</span>'; }

    function drawStats(){
      var h;
      if (tab === "members") {
        var act = 0, soon = 0, total = 0, expired = 0;
        data.members.forEach(function(m){
          total += +m.amount || 0;
          if (m.renewedTo) return;
          var d = daysTo(m.endDate);
          if (d === null || d >= 0) act++; else expired++;
          if (d !== null && d >= 0 && d <= 30) soon++;
        });
        h = [["Active members", act], ["Ending within 30 days", soon], ["Expired", expired], ["Membership income", money(total)]];
      } else {
        var ini = 0, fin = 0, acc = 0;
        data.support.forEach(function(o){ ini += o.initialAmount; fin += o.finalPaid; acc += calc(o).accepted; });
        var p = pending(data.support);
        h = [["Orders", data.support.length], ["Accepted projects", acc], ["Received (initial + final)", money(ini + fin)], ["Expected final payments", money(p.amount)]];
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
      if (!list.length) { out.innerHTML = '<p class="adm-note">' + (loaded ? "Nothing found." : "Loading…") + '</p>'; return; }
      var h = '<div class="st-wrap"><table class="st-table"><thead><tr>';
      h += tab === "members"
        ? '<th>Name</th><th>Phone</th><th>Plan</th><th>Start</th><th>End</th><th>Note</th><th></th>'
        : '<th>Name</th><th>Phone</th><th>Package</th><th>Projects</th><th>Initial payment</th><th>Final payment</th><th>Membership</th><th></th>';
      h += '</tr></thead><tbody>';
      list.forEach(function(m){
        h += '<tr><td>' + esc(m.name) + '</td><td><a href="https://wa.me/' + esc(String(m.phone || "").replace(/\D/g, "")) + '" target="_blank" rel="noopener">' + esc(m.phone) + '</a></td>';
        if (tab === "members") {
          var d = daysTo(m.endDate), b = m.renewedTo ? badge("Extended", "ok") : d === null ? "" : d < 0 ? badge("Expired", "bad") : d <= 30 ? badge(d + (d === 1 ? " day left" : " days left"), "warn") : "";
          h += '<td>' + esc(planLabel(m.plan)) + '</td><td>' + fmtDate(m.startDate) + '</td><td>' + fmtDate(m.endDate) + ' ' + b + '</td><td>' + esc(m.note || "") + '</td>';
        } else {
          var c = calc(m), cnt = {};
          m.projects.forEach(function(p){ cnt[p.status] = (cnt[p.status] || 0) + 1; });
          var pj = m.projects.length ? Object.keys(STATUS).filter(function(k){ return cnt[k]; }).map(function(k){
            return badge(cnt[k] + " " + STATUS[k].toLowerCase(), k === "rejected" ? "bad" : k === "reserve" ? "warn" : k === "accepted" ? "ok" : "info");
          }).join(" ") : "—";
          var fin = c.due <= 0 ? "—" : c.pending <= 0 ? badge("Received " + money(c.paid), "ok") : badge("Pending " + money(c.pending), "warn");
          h += '<td>' + esc(packLabel(m)) + '</td><td>' + pj + '</td><td>' + money(m.initialAmount) + '<small>' + (m.initialDate ? fmtDate(m.initialDate) + (m.initialEstimated ? " (estimated)" : "") : "no date") + '</small></td><td>' + fin + '</td><td>' + esc(ORG[m.org] || "") + '</td>';
        }
        var payBtn = tab === "support" && calc(m).pending > 0 ? '<button type="button" class="adm-btn" data-p="' + esc(m.id) + '">Final received</button> ' : "";
        if (tab === "members" && !m.renewedTo) payBtn = '<button type="button" class="adm-btn" data-r="' + esc(m.id) + '" title="Extend membership (adds a new term)">Extend</button> ';
        h += '<td class="crm-act">' + payBtn + '<button type="button" class="adm-btn" data-e="' + esc(m.id) + '">Edit</button> <button type="button" class="adm-btn danger" data-d="' + esc(m.id) + '">Delete</button></td></tr>';
      });
      out.innerHTML = h + '</tbody></table></div>';
    }

    /* ----- form: every amount input is in USD and shows its AZN equivalent underneath ----- */
    function usdField(id, label, azn, emptyHint){
      var has = azn !== null && azn !== undefined && azn !== "", val = has ? usdStr(azn) : "";
      return '<div class="field"><label for="' + id + '">' + label + ' (USD)</label>' +
        '<input id="' + id + '" class="usd-in" type="number" min="0" step="0.01" value="' + val + '"' + (has ? ' data-azn="' + r2(azn) + '" data-usd="' + val + '"' : '') + ' data-empty="' + esc(emptyHint || "") + '">' +
        '<small class="crm-hint" id="' + id + '-azn">' + (has ? "= " + fmtAzn(azn) : esc(emptyHint || "")) + '</small></div>';
    }
    /* exact AZN for an input: the stored value when the shown USD wasn't touched, otherwise USD × rate */
    function readAzn(id){
      var el = F.querySelector("#" + id); if (!el) return null;
      var v = el.value.trim(); if (v === "") return null;
      if (el.getAttribute("data-usd") === v && el.getAttribute("data-azn") !== null) return +el.getAttribute("data-azn");
      return toAzn(+v || 0);
    }
    function setUsd(id, azn){
      var el = F.querySelector("#" + id); if (!el) return;
      el.value = usdStr(azn); el.setAttribute("data-azn", r2(azn)); el.setAttribute("data-usd", el.value);
    }
    function updateHints(){
      Array.prototype.forEach.call(F.querySelectorAll(".usd-in"), function(el){
        var a = readAzn(el.id), h = F.querySelector("#" + el.id + "-azn");
        if (h) h.textContent = a === null ? (el.getAttribute("data-empty") || "") : "= " + fmtAzn(a);
      });
    }
    function opts(map, sel, labelFn){ return Object.keys(map).map(function(k){ return '<option value="' + k + '"' + (k === sel ? " selected" : "") + '>' + esc(labelFn ? labelFn(k) : (typeof map[k] === "string" ? map[k] : map[k].name)) + '</option>'; }).join(""); }
    function packOpts(program, sel){
      var P = PACKS[program] || {};
      return Object.keys(P).map(function(k){ return '<option value="' + k + '"' + (k === sel ? " selected" : "") + '>' + P[k].label + ' — initial ' + both(P[k].initial) + '</option>'; }).join("") +
        '<option value="custom"' + (sel === "custom" ? " selected" : "") + '>Custom (enter the amount yourself)</option>';
    }
    function projRow(p){
      p = p || {};
      return '<div class="crm-proj"><input type="url" class="p-link" placeholder="Project link" maxlength="500" value="' + esc(p.link || "") + '">' +
        '<select class="p-status">' + opts(STATUS, p.status || "applied") + '</select>' +
        '<label>Deadline <input type="date" class="p-dl" value="' + esc(p.deadline || "") + '"></label>' +
        '<label>Selection <input type="date" class="p-sel" value="' + esc(p.selection || "") + '"></label>' +
        '<button type="button" class="adm-btn danger p-del" aria-label="Remove project">×</button></div>';
    }
    function readProjects(){
      return Array.prototype.map.call(F.querySelectorAll(".crm-proj"), function(r){
        return {link: r.querySelector(".p-link").value.trim(), status: r.querySelector(".p-status").value, deadline: r.querySelector(".p-dl").value, selection: r.querySelector(".p-sel").value};
      }).filter(function(p){ return p.link || p.deadline || p.status !== "applied"; });
    }
    function dueText(){
      var d = F.querySelector("#c-due"); if (!d) return;
      var o = {program: F.querySelector("#c-prog").value, pack: F.querySelector("#c-pack").value, projects: readProjects(), finalOverride: readAzn("c-fover"), finalPaid: readAzn("c-fpaid") || 0};
      var c = calc(o);
      d.textContent = "Accepted projects: " + c.accepted + ". Final payment: " + (c.due ? both(c.due) : "none") +
        (c.due ? " (received " + money(c.paid) + ", remaining " + money(c.pending) + ")" : "") + ".";
    }
    function applyPack(){
      var P = PACKS[F.querySelector("#c-prog").value] && PACKS[F.querySelector("#c-prog").value][F.querySelector("#c-pack").value];
      if (P) setUsd("c-initial", P.initial);
    }

    function openForm(rec, renewOf){
      rec = rec || {}; editing = rec.id || null; renewFrom = renewOf || null;
      var h = (renewOf ? '<div class="adm-note" style="margin-top:0;">Extending membership for <b>' + esc(renewOf.name) + '</b>. The old record is kept and marked "Extended", and its payment stays in the income history.</div>' : '') + '<div class="adm-grid">' +
        '<div class="field"><label for="c-name">Full name *</label><input id="c-name" type="text" required maxlength="120" value="' + esc(rec.name || "") + '"></div>' +
        '<div class="field"><label for="c-phone">Phone *</label><input id="c-phone" type="text" required maxlength="30" placeholder="050 123 45 67" value="' + esc(rec.phone || "") + '"></div>';
      if (tab === "members") {
        h += '<div class="field"><label for="c-plan">Plan *</label><select id="c-plan">' + opts(MPLANS, rec.plan || "y50", function(k){ return planLabel(k, true); }) + '</select></div>' +
          usdField("c-amount", "Amount", rec.amount != null ? rec.amount : MPLANS.y50.amount) +
          '<div class="field"><label for="c-start">Start date *</label><input id="c-start" type="date" required value="' + esc(rec.startDate || today()) + '"></div>' +
          '<div class="field"><label for="c-end">End date (automatic if empty)</label><input id="c-end" type="date" value="' + esc(rec.endDate || "") + '"></div>' +
          '<div class="field"><label for="c-paid">Payment date (the income chart uses this date)</label><input id="c-paid" type="date" value="' + esc(rec.paidDate || (rec.id ? rec.startDate : today()) || today()) + '"></div>' +
          '<div class="field full"><label for="c-note">Note</label><input id="c-note" type="text" maxlength="200" value="' + esc(rec.note || "") + '"></div>';
      } else {
        var prog = rec.program || "SALTO", pack = rec.pack || "standard", P = PACKS[prog] && PACKS[prog][pack];
        h += '<div class="field"><label for="c-email">Email</label><input id="c-email" type="email" maxlength="120" value="' + esc(rec.email || "") + '"></div>' +
          '<div class="field"><label for="c-org">Membership</label><select id="c-org">' + opts(ORG, rec.org || "member", function(k){ return ORG[k]; }) + '</select></div>' +
          '<div class="field"><label for="c-prog">Program *</label><select id="c-prog">' + opts(PROGRAMS, prog, function(k){ return PROGRAMS[k]; }) + '</select></div>' +
          '<div class="field"><label for="c-pack">Package *</label><select id="c-pack">' + packOpts(prog, pack) + '</select></div>' +
          usdField("c-initial", "Initial payment", rec.initialAmount != null ? rec.initialAmount : (P ? P.initial : 0)) +
          '<div class="field"><label for="c-idate">Initial payment date' + (rec.initialEstimated ? " (was estimated)" : "") + '</label><input id="c-idate" type="date" value="' + esc(rec.id && !rec.initialEstimated ? rec.initialDate : (rec.initialDate || today())) + '"></div>' +
          '<div class="field full"><label>Projects</label><div id="c-projs">' + (rec.projects && rec.projects.length ? rec.projects : [{}]).map(projRow).join("") + '</div>' +
          '<div><button type="button" class="adm-btn" id="c-addproj">Add project</button></div></div>' +
          '<div class="field full"><div class="adm-note" id="c-due" style="margin:0;"></div></div>' +
          usdField("c-fover", "Final amount override", rec.finalOverride !== null && rec.finalOverride !== undefined ? rec.finalOverride : null, "empty = automatic from the site prices") +
          usdField("c-fpaid", "Final payment received", rec.finalPaid || 0) +
          '<div class="field"><label for="c-fdate">Final payment date</label><input id="c-fdate" type="date" value="' + esc(rec.finalDate || "") + '"></div>' +
          '<div class="field"><label for="c-note">Note</label><input id="c-note" type="text" maxlength="200" value="' + esc(rec.note || "") + '"></div>';
      }
      h += '</div><div class="adm-actions"><button type="submit" class="btn-primary" style="border:none;cursor:pointer;font-family:Inter,sans-serif;">' + (editing ? "Save changes" : renewOf ? "Extend membership" : "Add") + '</button>' +
        '<button type="button" class="adm-btn" id="crmCancel">Cancel</button></div>';
      F.innerHTML = h; F.hidden = false;
      if (tab === "support") dueText();
      F.querySelector("#c-name").focus({preventScroll: true});
    }
    function closeForm(){ F.hidden = true; F.innerHTML = ""; editing = null; renewFrom = null; }
    function v(id){ var e = F.querySelector("#" + id); return e ? e.value.trim() : ""; }

    /* the form element lives for the whole session, so its listeners are attached once (delegated) */
    F.addEventListener("input", function(){ updateHints(); dueText(); });
    F.addEventListener("change", function(e){
      var t = e.target;
      if (t.id === "c-plan") setUsd("c-amount", MPLANS[t.value].amount);
      else if (t.id === "c-prog") { F.querySelector("#c-pack").innerHTML = packOpts(t.value, "standard"); applyPack(); }
      else if (t.id === "c-pack") applyPack();
      updateHints(); dueText();
    });
    F.addEventListener("click", function(e){
      var t = e.target.closest ? e.target.closest("button") : null; if (!t) return;
      if (t.id === "crmCancel") closeForm();
      else if (t.id === "c-addproj") { F.querySelector("#c-projs").insertAdjacentHTML("beforeend", projRow()); dueText(); }
      else if (t.classList.contains("p-del")) {
        var row = t.parentNode;
        if (F.querySelectorAll(".crm-proj").length > 1) row.parentNode.removeChild(row); else row.querySelector(".p-link").value = "";
        dueText();
      }
    });

    F.addEventListener("submit", function(e){
      e.preventDefault();
      var phone = normPhone(v("c-phone")), rec;
      if (!v("c-name")) { msg("Enter a name.", true); return; }
      if (!phone) { msg("Phone number not recognized. Example: 050 123 45 67 or +994501234567.", true); return; }
      if (tab === "members") {
        var plan = v("c-plan"), start = v("c-start");
        if (!start) { msg("Choose a start date.", true); return; }
        var end = v("c-end") || addMonths(start, MPLANS[plan].months);
        if (end < start) { msg("The end date can't be before the start date.", true); return; }
        rec = {name: v("c-name"), phone: phone, plan: plan, amount: readAzn("c-amount") || 0, startDate: start, endDate: end, paidDate: v("c-paid") || start, note: v("c-note")};
        if (renewFrom) rec.renewedFrom = renewFrom.id;
      } else {
        var projects = readProjects(), bad = projects.filter(function(p){ return p.link && !/^https?:\/\//i.test(p.link); });
        if (bad.length) { msg("A project link must start with http:// or https://", true); return; }
        rec = {name: v("c-name"), phone: phone, email: v("c-email"), org: v("c-org"), program: v("c-prog"), pack: v("c-pack"),
               initialAmount: readAzn("c-initial") || 0, initialDate: v("c-idate"), initialEstimated: false,
               finalPaid: readAzn("c-fpaid") || 0, finalDate: v("c-fdate"), note: v("c-note"), projects: projects,
               finalOverride: readAzn("c-fover")};
        if (rec.finalPaid > 0 && !rec.finalDate) rec.finalDate = today();
      }
      rec.updatedAt = fs.serverTimestamp();
      var path = "crm/" + tab, job;
      if (editing) job = fs.update(fs.ref(db, path + "/" + editing), rec);
      else { rec.createdAt = fs.serverTimestamp(); job = fs.push(fs.ref(db, path), rec); }
      msg("Saving…");
      var old = renewFrom;
      if (old) job = job.then(function(ref){ return fs.update(fs.ref(db, "crm/members/" + old.id), {renewedTo: ref.key, updatedAt: fs.serverTimestamp()}); });
      job.then(function(){ var was = editing; closeForm(); msg(old ? "Membership extended." : was ? "Changes saved." : "Added."); return load(); }).catch(denied);
    });

    $("#crmList").addEventListener("click", function(e){
      var b = e.target.closest ? e.target.closest("button") : null; if (!b) return;
      var list = data[tab], id = b.getAttribute("data-e") || b.getAttribute("data-d") || b.getAttribute("data-p") || b.getAttribute("data-r"), rec = null;
      list.forEach(function(m){ if (m.id === id) rec = m; });
      if (!rec) return;
      if (b.hasAttribute("data-p")) {
        var c = calc(rec);
        fs.update(fs.ref(db, "crm/support/" + id), {finalPaid: c.due, finalDate: today(), updatedAt: fs.serverTimestamp()})
          .then(function(){ msg("Final payment recorded: " + rec.name + " (" + money(c.due) + ")."); return load(); }).catch(denied);
        return;
      }
      if (b.hasAttribute("data-r")) {
        var d0 = daysTo(rec.endDate), start = d0 !== null && d0 > 0 ? rec.endDate : today();
        var plan = rec.plan === "m30" ? "m30" : "y50";
        openForm({name: rec.name, phone: rec.phone, plan: plan, amount: MPLANS[plan].amount, startDate: start, note: ""}, rec);
        window.scrollTo({top: box.getBoundingClientRect().top + window.scrollY - 20, behavior: "smooth"}); return;
      }
      if (b.hasAttribute("data-e")) { openForm(rec); window.scrollTo({top: box.getBoundingClientRect().top + window.scrollY - 20, behavior: "smooth"}); return; }
      if (!window.confirm("Delete this record?\n\n" + rec.name)) return;
      fs.remove(fs.ref(db, "crm/" + tab + "/" + id)).then(function(){ msg("Deleted."); return load(); }).catch(denied);
    });

    function setTab(t){
      tab = t; closeForm(); msg(""); imsg(""); pendingImport = []; $("#crmGo").disabled = true; $("#crmPaste").value = "";
      tog($("#crmTabI"), t === "income"); tog($("#crmTabS"), t === "support"); tog($("#crmTabM"), t === "members");
      $("#crmIncome").hidden = t !== "income"; $("#crmListPane").hidden = t === "income"; $("#crmCsv").hidden = t === "income";
      $("#crmImpHelp").textContent = t === "members"
        ? "In Google Sheets, copy the \"Sending Organization\" table together with its header row (Ctrl+C), paste it here, press \"Check\", then \"Add records\". Phone numbers are normalised to +994 and duplicates are skipped. Amounts such as 50AZN are read as AZN and shown in USD."
        : "In Google Sheets, copy the \"Fərdi Dəstək\" table together with its header row, paste it here, press \"Check\", then \"Add records\". Rows with the same phone number become one order, the program is taken from the link and the package from the initial payment. The password column is never saved. A \"payment date\" column is used if present, otherwise the date is estimated from the deadline.";
      draw();
    }
    $("#crmTabI").addEventListener("click", function(){ setTab("income"); });
    $("#crmTabS").addEventListener("click", function(){ setTab("support"); });
    $("#crmTabM").addEventListener("click", function(){ setTab("members"); });
    $("#crmReload").addEventListener("click", load);

    /* ----- export ----- */
    function csvCell(v, guard){
      v = String(v == null ? "" : v);
      if (guard && /^[=+\-@]/.test(v)) v = "'" + v;
      return /[",\n\r;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    function csvDate(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? m[3] + "." + m[2] + "." + m[1] : ""; }
    function download(name, text, type){
      var blob = new Blob(["﻿" + text], {type: type + ";charset=utf-8"}), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 500);
    }
    function membersCsv(){
      var rows = [["Name", "Phone", "Plan", "Amount (USD)", "Amount (AZN)", "Payment date", "Start date", "End date", "Extended", "Note"]];
      data.members.forEach(function(m){
        rows.push([m.name, m.phone, (MPLANS[m.plan] || MPLANS.free).name, usdStr(m.amount), r2(m.amount), csvDate(m.paidDate || m.startDate), csvDate(m.startDate), csvDate(m.endDate), m.renewedTo ? "yes" : "", m.note || ""]);
      });
      return rows;
    }
    function ordersCsv(){
      var rows = [["Name", "Phone", "Email", "Membership", "Program", "Package", "Initial payment (USD)", "Initial payment (AZN)", "Initial payment date", "Date is estimated",
        "Final due (USD)", "Final due (AZN)", "Final received (USD)", "Final received (AZN)", "Final payment date", "Project", "Status", "Deadline", "Selection", "Note"]];
      data.support.forEach(function(o){
        var c = calc(o), ps = o.projects.length ? o.projects : [{link: "", status: "", deadline: "", selection: ""}];
        ps.forEach(function(p){
          rows.push([o.name, o.phone, o.email, ORG[o.org] || "", PROGRAMS[o.program] || o.program, packName(o),
            usdStr(o.initialAmount), r2(o.initialAmount), csvDate(o.initialDate), o.initialEstimated ? "yes" : "",
            usdStr(c.due), r2(c.due), usdStr(c.paid), r2(c.paid), csvDate(o.finalDate), p.link, STATUS[p.status] || "", csvDate(p.deadline), csvDate(p.selection), o.note]);
        });
      });
      return rows;
    }
    function toCsv(rows){ return rows.map(function(r, i){ return r.map(function(c, j){ return csvCell(c, i > 0 && j !== 1); }).join(","); }).join("\r\n"); }
    $("#crmCsv").addEventListener("click", function(){
      if (!loaded) { msg("The data hasn't loaded yet.", true); return; }
      var members = tab === "members";
      download(members ? "members-" + today() + ".csv" : "services-" + today() + ".csv", toCsv(members ? membersCsv() : ordersCsv()), "text/csv");
      msg("CSV downloaded. Both USD and AZN columns are included. The CRM doesn't store passwords, so the file has none.");
    });
    $("#crmBackup").addEventListener("click", function(){
      msg("Preparing the backup…");
      Promise.all([fs.get(fs.ref(db, "crm/members")), fs.get(fs.ref(db, "crm/support"))]).then(function(r){
        var out = {exportedAt: new Date().toISOString(), currency: "AZN", aznPerUsd: AZN_PER_USD, members: r[0].exists() ? r[0].val() : {}, support: r[1].exists() ? r[1].val() : {}};
        download("crm-backup-" + today() + ".json", JSON.stringify(out, null, 2), "application/json");
        msg("Backup downloaded (" + Object.keys(out.members).length + " members, " + Object.keys(out.support).length + " orders). The amounts inside are in AZN. Keep the file somewhere safe, it contains phone numbers and emails.");
      }).catch(denied);
    });
    $("#crmAdd").addEventListener("click", function(){ openForm(null); });
    $("#crmSearch").addEventListener("input", function(){ q = this.value; draw(); });

    $("#crmPaste").addEventListener("input", function(){ pendingImport = []; $("#crmGo").disabled = true; });
    $("#crmCheck").addEventListener("click", function(){
      var r = (tab === "members" ? importMembers : importOrders)($("#crmPaste").value, data[tab]);
      pendingImport = r.errors.length ? [] : r.ok; $("#crmGo").disabled = !pendingImport.length;
      if (r.errors.length) { imsg("Errors (nothing was added):\n" + r.errors.join("\n"), true); return; }
      if (!r.ok.length) { imsg(r.skipped ? "Everything is already in the database (" + r.skipped + " duplicates)." : "No rows to add."); return; }
      imsg(r.ok.length + " new record" + (r.ok.length === 1 ? "" : "s") + " will be added" + (r.skipped ? ", " + r.skipped + " duplicate" + (r.skipped === 1 ? "" : "s") + " skipped" : "") + ".\n" +
        r.ok.map(function(o){
          return "• " + o.name + " (" + o.phone + ")" + (tab === "support" ? " — " + packLabel(o) + ", initial " + both(o.initialAmount) + ", " + o.projects.length + (o.projects.length === 1 ? " project" : " projects") : " — " + both(o.amount));
        }).join("\n") + (r.warnings.length ? "\n\nNote:\n" + r.warnings.join("\n") : ""));
    });
    $("#crmGo").addEventListener("click", function(){
      var list = pendingImport.slice(); if (!list.length) return;
      var b = $("#crmGo"); b.disabled = true; var done = 0;
      list.reduce(function(chain, o){
        return chain.then(function(){
          o.createdAt = fs.serverTimestamp(); o.updatedAt = fs.serverTimestamp();
          return fs.push(fs.ref(db, "crm/" + tab), o).then(function(){ done++; imsg("Adding… " + done + "/" + list.length); });
        });
      }, Promise.resolve()).then(function(){
        pendingImport = []; $("#crmPaste").value = ""; return load().then(function(){ imsg(done + " record" + (done === 1 ? "" : "s") + " added."); });
      }).catch(function(err){
        if (done) imsg(done + "/" + list.length + " added, then an error occurred.", true); else denied(err);
        load();
      });
    });

    setTab("income");
    load();
  }

  root.GV_initCrm = init;
  root.GV_crmUtil = {AZN_PER_USD: AZN_PER_USD, usd: usd, toAzn: toAzn, fmtUsd: fmtUsd, fmtAzn: fmtAzn, usdStr: usdStr, money: money,
    normPhone: normPhone, normDate: normDate, parseAmount: parseAmount, finalAuto: finalAuto, normOrder: normOrder, calc: calc,
    importMembers: importMembers, importOrders: importOrders, buildEvents: buildEvents, pending: pending, series: series, sumRange: sumRange,
    chartSvg: chartSvg, autoGran: autoGran, bucketKey: bucketKey, guessProgram: guessProgram, guessPack: guessPack};
})(window);
