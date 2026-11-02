/* Admin paneldə CRM: Sending Organization üzvləri və Fərdi dəstək müraciətləri.
   Məlumat Firebase Realtime Database-də "crm" qovluğunda saxlanır (yalnız admin oxuya və yaza bilər).
   Sheets-dən köçürmək üçün: cədvəl xanalarını kopyalayıb "Sheets-dən import" sahəsinə yapışdırın.
   Parol sütunu bilərəkdən import olunmur. */
(function(root){
  "use strict";

  var PLANS = {
    y50: {label: "İllik (50 AZN)", amount: 50, months: 12},
    y45: {label: "İllik, köhnə qiymət (45 AZN)", amount: 45, months: 12},
    m30: {label: "6 aylıq (30 AZN)", amount: 30, months: 6},
    free: {label: "Pulsuz / digər", amount: 0, months: 12}
  };
  var STATUS = {applied: "Müraciət edilib", reserve: "Rezerv", rejected: "İmtina", accepted: "Qəbul"};
  var ORG = {member: "Üzvdür", nonmember: "Üzv deyil", project: "Yalnız bu layihə üçün"};

  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function today(){ return new Date().toISOString().slice(0, 10); }
  function addMonths(iso, n){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); if (!m) return "";
    var d = new Date(Date.UTC(+m[1], +m[2] - 1 + n, +m[3]));
    return d.toISOString().slice(0, 10);
  }
  function daysTo(iso){
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
    return Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(today() + "T00:00:00Z")) / 864e5);
  }
  function fmtDate(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? m[3] + "." + m[2] + "." + m[1].slice(2) : "—"; }

  /* telefon: 994XXXXXXXXX formatına salır; alınmasa boş qaytarır */
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    var m = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2}|\d{4})$/.exec(v);
    if (!m) return "";
    var y = m[3].length === 2 ? "20" + m[3] : m[3];
    return y + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
  }
  function parseAmount(v){ var m = /(\d+(?:[.,]\d+)?)\s*azn/i.exec(String(v || "")); return m ? parseFloat(m[1].replace(",", ".")) : null; }
  function planOf(amount, months){
    if (amount === 30) return "m30";
    if (amount === 45) return "y45";
    if (amount === 50) return "y50";
    if (amount === null && months === 6) return "m30";
    return "free";
  }
  function plain(v){ return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function statusOf(v){
    v = plain(v);
    if (v.indexOf("imtina") >= 0) return "rejected";
    if (v.indexOf("rezerv") >= 0) return "reserve";
    if (v.indexOf("qəbul") >= 0 || v.indexOf("qebul") >= 0) return "accepted";
    return "applied";
  }
  function orgOf(v){
    v = plain(v);
    if (v.indexOf("deyil") >= 0) return "nonmember";
    if (v.indexOf("yalnız") >= 0 || v.indexOf("yalniz") >= 0 || v.indexOf("layih") >= 0) return "project";
    return "member";
  }
  function money(n){ return (Math.round(n * 100) / 100) + " AZN"; }

  /* TSV (Sheets-dən kopyalanmış) → obyektlər; başlıq sətrinə görə sütunlar tapılır */
  function parseTsv(text){
    var lines = String(text || "").replace(/\r/g, "").split("\n").filter(function(l){ return l.trim() !== ""; });
    if (lines.length < 2) return {head: [], rows: []};
    var head = lines[0].split("\t").map(function(h){ return h.trim().toLowerCase(); });
    var rows = lines.slice(1).map(function(l){ return l.split("\t").map(function(c){ return c.trim(); }); });
    return {head: head, rows: rows};
  }
  function colIdx(head, keys){
    for (var i = 0; i < head.length; i++) for (var k = 0; k < keys.length; k++) if (head[i].indexOf(keys[k]) >= 0) return i;
    return -1;
  }
  function cell(row, i){ return i >= 0 && i < row.length ? row[i] : ""; }

  function importMembers(text, existing){
    var t = parseTsv(text), out = {ok: [], errors: [], skipped: 0};
    var iName = colIdx(t.head, ["ad,", "ad soyad", "ad, soyad", "ad"]), iPh = colIdx(t.head, ["əlaqə", "nömrə", "telefon"]),
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
      var months = end ? Math.round((Date.parse(end) - Date.parse(start)) / 2629800000) : 12;
      var plan = planOf(amount, months);
      var o = {name: name, phone: phone, plan: plan, amount: amount !== null ? amount : PLANS[plan].amount, startDate: start,
               endDate: end || addMonths(start, PLANS[plan].months), note: amount !== null ? "" : note};
      var key = phone + "|" + start;
      if (seen[key]) { out.skipped++; return; }
      seen[key] = 1; out.ok.push(o);
    });
    return out;
  }

  function importSupport(text, existing){
    var t = parseTsv(text), out = {ok: [], errors: [], skipped: 0};
    var iLink = colIdx(t.head, ["lahiy", "layih", "link"]), iName = colIdx(t.head, ["ad soyad", "ad"]), iMail = colIdx(t.head, ["mail"]),
        iPh = colIdx(t.head, ["əlaqə", "nömrə", "telefon"]), iSt = colIdx(t.head, ["status"]), iDl = colIdx(t.head, ["deadline"]),
        iSel = colIdx(t.head, ["selection"]), iPay = colIdx(t.head, ["ödəniş", "odenis"]), iOrg = colIdx(t.head, ["organization", "organ"]);
    if (iName < 0 || iPh < 0) { out.errors.push("Başlıq sətri tapılmadı. Başlıqla birlikdə kopyalayın (Layihə / Ad Soyad / Mail / Əlaqə nömrəsi ...). Parol sütunu avtomatik atlanır."); return out; }
    var seen = {};
    existing.forEach(function(m){ seen[(m.phone || "") + "|" + String(m.link || "").toLowerCase()] = 1; });
    t.rows.forEach(function(r, i){
      var name = cell(r, iName).replace(/\s+/g, " ");
      if (!name) return;
      var n = "Sətir " + (i + 2) + " (" + name + "): ";
      var phone = normPhone(cell(r, iPh));
      if (!phone) { out.errors.push(n + "telefon oxunmadı (" + cell(r, iPh) + ")"); return; }
      var pay = cell(r, iPay), amount = parseAmount(pay);
      var o = {name: name, phone: phone, email: cell(r, iMail), link: cell(r, iLink), status: statusOf(cell(r, iSt)),
               deadline: normDate(cell(r, iDl)), selection: normDate(cell(r, iSel)), amount: amount !== null ? amount : 0, org: orgOf(cell(r, iOrg))};
      var key = phone + "|" + o.link.toLowerCase();
      if (seen[key]) { out.skipped++; return; }
      seen[key] = 1; out.ok.push(o);
    });
    return out;
  }

  function init(box, ctx){
    var fs = ctx.fs, db = ctx.db, denied = ctx.denied;
    var tab = "members", data = {members: [], support: []}, q = "", editing = null, loaded = false;

    box.innerHTML =
      '<div class="crm-tabs" role="tablist">' +
      '<button type="button" class="adm-toggle" id="crmTabM" aria-pressed="true">Üzvlər (Sending Organization)</button>' +
      '<button type="button" class="adm-toggle" id="crmTabS" aria-pressed="false">Fərdi dəstək</button>' +
      '<button type="button" class="adm-btn" id="crmReload">Yenilə</button></div>' +
      '<div id="crmStats" class="st-cards"></div>' +
      '<div class="crm-bar"><input id="crmSearch" type="search" placeholder="Ad, telefon və ya qeyd üzrə axtar" aria-label="Axtar">' +
      '<button type="button" class="adm-btn" id="crmAdd">Yeni əlavə et</button></div>' +
      '<form id="crmForm" class="crm-form" hidden autocomplete="off"></form>' +
      '<p class="adm-msg" id="crmMsg" role="status"></p>' +
      '<div id="crmList"></div>' +
      '<details class="crm-import"><summary>Sheets-dən import</summary>' +
      '<p class="adm-note" style="margin:12px 0;">Google Sheets-də başlıq sətri ilə birlikdə xanaları seçib kopyalayın (Ctrl+C), bura yapışdırın → «Yoxla» → «Əlavə et». Telefon nömrələri +994 formatına salınır, təkrar sətirlər keçilir. Parol sütunu saxlanılmır.</p>' +
      '<textarea id="crmPaste" style="width:100%;min-height:160px;font-family:monospace;font-size:0.85rem;" spellcheck="false"></textarea>' +
      '<div class="adm-actions" style="margin-top:12px;"><button type="button" class="adm-btn" id="crmCheck">Yoxla</button>' +
      '<button type="button" class="btn-primary" id="crmGo" disabled style="border:none;cursor:pointer;font-family:Inter,sans-serif;">Əlavə et</button></div>' +
      '<p class="adm-msg" id="crmImpMsg" role="status"></p></details>';

    function $(s){ return box.querySelector(s); }
    function msg(t, err){ var m = $("#crmMsg"); m.textContent = t || ""; m.className = "adm-msg" + (err ? " err" : ""); }
    function imsg(t, err){ var m = $("#crmImpMsg"); m.textContent = t || ""; m.className = "adm-msg" + (err ? " err" : ""); }
    var pending = [];

    function load(){
      return Promise.all([fs.get(fs.ref(db, "crm/members")), fs.get(fs.ref(db, "crm/support"))]).then(function(s){
        ["members", "support"].forEach(function(k, i){
          data[k] = []; s[i].forEach(function(d){ data[k].push(Object.assign({id: d.key}, d.val())); });
        });
        loaded = true; draw();
      }).catch(function(err){
        if (err && /permission/i.test(String(err.code || "") + String(err.message || ""))) {
          msg("CRM məlumatını oxumaq mümkün olmadı. Firebase Rules-a «crm» qaydasını əlavə edin (firebase-rules.json faylına bax).", true);
        } else denied(err);
      });
    }

    function stats(){
      var h = "", i;
      if (tab === "members") {
        var act = 0, soon = 0, total = 0, expired = 0;
        data.members.forEach(function(m){
          total += +m.amount || 0;
          var d = daysTo(m.endDate);
          if (d === null || d >= 0) act++; else expired++;
          if (d !== null && d >= 0 && d <= 30) soon++;
        });
        h = [["Aktiv üzv", act], ["30 gün ərzində bitir", soon], ["Müddəti bitib", expired], ["Cəmi gəlir", money(total)]];
      } else {
        var paid = 0, ap = 0, rej = 0, acc = 0;
        data.support.forEach(function(m){
          paid += +m.amount || 0;
          if (m.status === "applied") ap++; else if (m.status === "rejected") rej++; else if (m.status === "accepted") acc++;
        });
        h = [["Müraciət edilib", ap], ["Qəbul", acc], ["İmtina", rej], ["Cəmi gəlir", money(paid)]];
      }
      $("#crmStats").innerHTML = h.map(function(c){ return '<div class="st-card"><small>' + c[0] + '</small><b>' + c[1] + '</b></div>'; }).join("");
    }

    function badge(text, cls){ return '<span class="crm-badge ' + cls + '">' + esc(text) + '</span>'; }

    function draw(){
      stats();
      var list = tab === "members" ? data.members.slice() : data.support.slice();
      var ql = q.trim().toLowerCase();
      if (ql) list = list.filter(function(m){ return (m.name + " " + m.phone + " " + (m.note || "") + " " + (m.email || "") + " " + (m.link || "")).toLowerCase().indexOf(ql) >= 0; });
      if (tab === "members") list.sort(function(a, b){ return (a.endDate || "9999").localeCompare(b.endDate || "9999"); });
      else list.sort(function(a, b){ return (a.deadline || "9999").localeCompare(b.deadline || "9999"); });
      var out = $("#crmList");
      if (!list.length) { out.innerHTML = '<p class="adm-note">' + (loaded ? "Heç nə tapılmadı." : "Yüklənir…") + '</p>'; return; }
      var h = '<div class="st-wrap"><table class="st-table"><thead><tr>';
      h += tab === "members"
        ? '<th>Ad</th><th>Telefon</th><th>Paket</th><th>Başlama</th><th>Bitmə</th><th>Qeyd</th><th></th>'
        : '<th>Ad</th><th>Telefon</th><th>Status</th><th>Deadline</th><th>Ödəniş</th><th>Üzvlük</th><th></th>';
      h += '</tr></thead><tbody>';
      list.forEach(function(m){
        h += '<tr><td>' + esc(m.name) + (tab === "support" && m.link ? '<small><a href="' + esc(m.link) + '" target="_blank" rel="noopener">layihə linki</a></small>' : '') + '</td>' +
          '<td><a href="https://wa.me/' + esc(String(m.phone || "").replace(/\D/g, "")) + '" target="_blank" rel="noopener">' + esc(m.phone) + '</a></td>';
        if (tab === "members") {
          var d = daysTo(m.endDate), b = d === null ? "" : d < 0 ? badge("Bitib", "bad") : d <= 30 ? badge(d + " gün qalıb", "warn") : "";
          h += '<td>' + esc((PLANS[m.plan] || PLANS.free).label) + '</td><td>' + fmtDate(m.startDate) + '</td><td>' + fmtDate(m.endDate) + ' ' + b + '</td><td>' + esc(m.note || "") + '</td>';
        } else {
          var cls = m.status === "rejected" ? "bad" : m.status === "reserve" ? "warn" : m.status === "accepted" ? "ok" : "info";
          h += '<td>' + badge(STATUS[m.status] || m.status, cls) + '</td><td>' + fmtDate(m.deadline) + '</td><td>' + (m.amount ? money(+m.amount) : "—") + '</td><td>' + esc(ORG[m.org] || "") + '</td>';
        }
        h += '<td class="crm-act"><button type="button" class="adm-btn" data-e="' + esc(m.id) + '">Redaktə</button> <button type="button" class="adm-btn danger" data-d="' + esc(m.id) + '">Sil</button></td></tr>';
      });
      out.innerHTML = h + '</tbody></table></div>';
    }

    function opts(map, sel){ return Object.keys(map).map(function(k){ return '<option value="' + k + '"' + (k === sel ? " selected" : "") + '>' + esc(typeof map[k] === "string" ? map[k] : map[k].label) + '</option>'; }).join(""); }

    function openForm(rec){
      rec = rec || {}; editing = rec.id || null;
      var f = $("#crmForm"), h = '<div class="adm-grid">' +
        '<div class="field"><label>Ad, soyad *</label><input id="c-name" type="text" required maxlength="120" value="' + esc(rec.name || "") + '"></div>' +
        '<div class="field"><label>Telefon *</label><input id="c-phone" type="text" required maxlength="30" placeholder="050 123 45 67" value="' + esc(rec.phone || "") + '"></div>';
      if (tab === "members") {
        h += '<div class="field"><label>Paket *</label><select id="c-plan">' + opts(PLANS, rec.plan || "y50") + '</select></div>' +
          '<div class="field"><label>Məbləğ (AZN)</label><input id="c-amount" type="number" min="0" step="1" value="' + esc(rec.amount != null ? rec.amount : 50) + '"></div>' +
          '<div class="field"><label>Başlama tarixi *</label><input id="c-start" type="date" required value="' + esc(rec.startDate || today()) + '"></div>' +
          '<div class="field"><label>Bitmə tarixi (boş qalsa avtomatik)</label><input id="c-end" type="date" value="' + esc(rec.endDate || "") + '"></div>' +
          '<div class="field full"><label>Qeyd</label><input id="c-note" type="text" maxlength="200" value="' + esc(rec.note || "") + '"></div>';
      } else {
        h += '<div class="field"><label>Mail</label><input id="c-email" type="email" maxlength="120" value="' + esc(rec.email || "") + '"></div>' +
          '<div class="field"><label>Layihə linki</label><input id="c-link" type="url" maxlength="500" value="' + esc(rec.link || "") + '"></div>' +
          '<div class="field"><label>Status</label><select id="c-status">' + opts(STATUS, rec.status || "applied") + '</select></div>' +
          '<div class="field"><label>Üzvlük</label><select id="c-org">' + opts(ORG, rec.org || "member") + '</select></div>' +
          '<div class="field"><label>Deadline</label><input id="c-deadline" type="date" value="' + esc(rec.deadline || "") + '"></div>' +
          '<div class="field"><label>Selection</label><input id="c-selection" type="date" value="' + esc(rec.selection || "") + '"></div>' +
          '<div class="field"><label>Ödəniş (AZN)</label><input id="c-amount" type="number" min="0" step="1" value="' + esc(rec.amount != null ? rec.amount : 0) + '"></div>';
      }
      h += '</div><div class="adm-actions"><button type="submit" class="btn-primary" style="border:none;cursor:pointer;font-family:Inter,sans-serif;">' + (editing ? "Yadda saxla" : "Əlavə et") + '</button>' +
        '<button type="button" class="adm-btn" id="crmCancel">Ləğv et</button></div>';
      f.innerHTML = h; f.hidden = false;
      var plan = f.querySelector("#c-plan");
      if (plan) plan.addEventListener("change", function(){ f.querySelector("#c-amount").value = PLANS[plan.value].amount; });
      f.querySelector("#crmCancel").addEventListener("click", closeForm);
      f.querySelector("#c-name").focus({preventScroll: true});
    }
    function closeForm(){ var f = $("#crmForm"); f.hidden = true; f.innerHTML = ""; editing = null; }
    function v(id){ var e = $("#" + id); return e ? e.value.trim() : ""; }

    $("#crmForm").addEventListener("submit", function(e){
      e.preventDefault();
      var phone = normPhone(v("c-phone")), rec;
      if (!v("c-name")) { msg("Ad yazın.", true); return; }
      if (!phone) { msg("Telefon nömrəsi oxunmadı. Nümunə: 050 123 45 67 və ya +994501234567.", true); return; }
      if (tab === "members") {
        var plan = v("c-plan"), start = v("c-start");
        if (!start) { msg("Başlama tarixini seçin.", true); return; }
        var end = v("c-end") || addMonths(start, PLANS[plan].months);
        if (end < start) { msg("Bitmə tarixi başlama tarixindən əvvəl ola bilməz.", true); return; }
        rec = {name: v("c-name"), phone: phone, plan: plan, amount: +v("c-amount") || 0, startDate: start, endDate: end, note: v("c-note")};
      } else {
        var link = v("c-link");
        if (link && !/^https?:\/\//i.test(link)) { msg("Link http:// və ya https:// ilə başlamalıdır.", true); return; }
        rec = {name: v("c-name"), phone: phone, email: v("c-email"), link: link, status: v("c-status"), org: v("c-org"),
               deadline: v("c-deadline"), selection: v("c-selection"), amount: +v("c-amount") || 0};
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
      var list = data[tab], id = b.getAttribute("data-e") || b.getAttribute("data-d"), rec = null;
      list.forEach(function(m){ if (m.id === id) rec = m; });
      if (!rec) return;
      if (b.hasAttribute("data-e")) { openForm(rec); window.scrollTo({top: box.getBoundingClientRect().top + window.scrollY - 20, behavior: "smooth"}); return; }
      if (!window.confirm("Silinsin?\n\n" + rec.name)) return;
      fs.remove(fs.ref(db, "crm/" + tab + "/" + id)).then(function(){ msg("Silindi."); return load(); }).catch(denied);
    });

    function setTab(t){
      tab = t; closeForm(); msg(""); imsg(""); pending = []; $("#crmGo").disabled = true; $("#crmPaste").value = "";
      $("#crmTabM").setAttribute("aria-pressed", t === "members" ? "true" : "false");
      $("#crmTabS").setAttribute("aria-pressed", t === "support" ? "true" : "false");
      draw();
    }
    $("#crmTabM").addEventListener("click", function(){ setTab("members"); });
    $("#crmTabS").addEventListener("click", function(){ setTab("support"); });
    $("#crmReload").addEventListener("click", load);
    $("#crmAdd").addEventListener("click", function(){ openForm(null); });
    $("#crmSearch").addEventListener("input", function(){ q = this.value; draw(); });

    $("#crmPaste").addEventListener("input", function(){ pending = []; $("#crmGo").disabled = true; });
    $("#crmCheck").addEventListener("click", function(){
      var r = (tab === "members" ? importMembers : importSupport)($("#crmPaste").value, data[tab]);
      pending = r.errors.length ? [] : r.ok; $("#crmGo").disabled = !pending.length;
      if (r.errors.length) { imsg("Xətalar (heç nə əlavə olunmayıb):\n" + r.errors.join("\n"), true); return; }
      if (!r.ok.length) { imsg(r.skipped ? "Hamısı artıq bazada var (" + r.skipped + " təkrar)." : "Əlavə ediləcək sətir tapılmadı."); return; }
      imsg(r.ok.length + " yeni qeyd əlavə olunacaq" + (r.skipped ? ", " + r.skipped + " təkrar keçiləcək" : "") + ".\n" +
        r.ok.map(function(o){ return "• " + o.name + " (" + o.phone + ")"; }).join("\n"));
    });
    $("#crmGo").addEventListener("click", function(){
      var list = pending.slice(); if (!list.length) return;
      var b = $("#crmGo"); b.disabled = true; var done = 0;
      list.reduce(function(chain, o){
        return chain.then(function(){
          o.createdAt = fs.serverTimestamp(); o.updatedAt = fs.serverTimestamp();
          return fs.push(fs.ref(db, "crm/" + tab), o).then(function(){ done++; imsg("Əlavə olunur… " + done + "/" + list.length); });
        });
      }, Promise.resolve()).then(function(){
        pending = []; $("#crmPaste").value = ""; return load().then(function(){ imsg(done + " qeyd əlavə olundu."); });
      }).catch(function(err){
        if (done) imsg(done + "/" + list.length + " əlavə olundu, sonra xəta.", true); else denied(err);
        load();
      });
    });

    draw();
    load();
  }

  root.GV_initCrm = init;
  root.GV_crmUtil = {normPhone: normPhone, normDate: normDate, parseAmount: parseAmount, importMembers: importMembers, importSupport: importSupport};
})(window);
