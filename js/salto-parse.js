/* Salto Youth səhifəsinin kopyalanmış mətnindən layihə sahələrini çıxarır (admin panel üçün).
   Brauzer başqa saytı birbaşa oxuya bilmədiyi üçün admin səhifədə Ctrl+A, Ctrl+C edib mətni yapışdırır. */
(function(root){
  "use strict";
  var MONTHS = {january:1, jan:1, february:2, feb:2, march:3, mar:3, april:4, apr:4, may:5, june:6, jun:6, july:7, jul:7,
    august:8, aug:8, september:9, sep:9, sept:9, october:10, oct:10, november:11, nov:11, december:12, dec:12};
  var LABELS = ["Type", "Dates and venue", "Dates", "Venue", "Application deadline", "Date of selection", "Working language",
    "Participants", "Recommended for", "Accessibility", "Organiser", "Organizer", "Contact for questions", "Participation fee",
    "Accommodation and food", "Travel reimbursement", "Travel", "Youthpass", "Description", "Objectives", "Application procedure"];

  function pad(n){ return (n < 10 ? "0" : "") + n; }
  function iso(y, m, d){ return y + "-" + pad(m) + "-" + pad(d); }
  function mon(s){ return s ? MONTHS[String(s).toLowerCase().replace(/\.$/, "")] || 0 : 0; }
  function clean(s){ return String(s || "").replace(/[ \t]+/g, " ").replace(/\s+/g, " ").trim(); }

  function labelRe(l){ return new RegExp("^\\s*" + l.replace(/ /g, "\\s+") + "\\s*:?\\s*(.*)$", "i"); }
  /* sətirləri etiket → dəyər xəritəsinə çevirir (dəyər eyni sətirdə və ya növbəti sətirdə ola bilər) */
  function fields(lines){
    var out = {}, order = [];
    for (var i = 0; i < lines.length; i++) {
      for (var k = 0; k < LABELS.length; k++) {
        var m = lines[i].match(labelRe(LABELS[k]));
        if (!m) continue;
        /* "Type of..." kimi sözlərlə qarışmasın: etiketdən sonra boşluq/iki nöqtə/sətir sonu olmalıdır */
        var rest = m[1];
        var key = LABELS[k].toLowerCase();
        if (key === "organizer") key = "organiser";
        if (out[key] !== undefined) break;
        var val = rest;
        if (!clean(val)) {
          var j = i + 1; while (j < lines.length && !clean(lines[j])) j++;
          var nxt = lines[j] || "";
          var isLabel = LABELS.some(function(l){ return labelRe(l).test(nxt); });
          if (!isLabel) val = nxt;
        }
        out[key] = clean(val); order.push({key: key, line: i});
        break;
      }
    }
    return {map: out, order: order};
  }

  function parseDates(text){
    var t = clean(text).replace(/\|.*$/, "");
    /* 22-26 March 2027 | 28 November - 6 December 2026 | 30 Dec 2026 - 5 Jan 2027 */
    var re = /(\d{1,2})(?:st|nd|rd|th)?\s*([A-Za-z]+\.?)?\s*(\d{4})?\s*(?:-|–|—|to|until)\s*(\d{1,2})(?:st|nd|rd|th)?\s*([A-Za-z]+\.?)\s*(\d{4})/i;
    var m = t.match(re);
    if (m) {
      var d1 = +m[1], d2 = +m[4], m2 = mon(m[5]), y2 = +m[6], m1 = mon(m[2]) || m2, y1 = m[3] ? +m[3] : y2;
      if (!m[3] && m1 > m2) y1 = y2 - 1;
      if (m2) return {start: iso(y1, m1, d1), end: iso(y2, m2, d2)};
    }
    var s = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+\.?)\s+(\d{4})/);
    if (s && mon(s[2])) { var one = iso(+s[3], mon(s[2]), +s[1]); return {start: one, end: one}; }
    return null;
  }
  function parseOneDate(text){
    var m = clean(text).match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+\.?)\s+(\d{4})/);
    if (m && mon(m[2])) return iso(+m[3], mon(m[2]), +m[1]);
    var n = clean(text).match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (n) return iso(+n[3], +n[2], +n[1]);
    return "";
  }
  function parseCountry(venue, countries){
    var v = clean(venue); if (!v) return "";
    var part = v.indexOf("|") >= 0 ? v.split("|").slice(1).join("|") : v;
    if (/\bonline\b/i.test(part) && !/,/.test(part)) return "Online";
    part = clean(part.replace(/\s+[-–—]\s+[A-Z]{2,3}\s*$/, "").replace(/\(.*?\)/g, ""));
    var bits = part.split(",").map(clean).filter(Boolean);
    var cand = bits.length ? bits[bits.length - 1] : "";
    var list = countries || [];
    for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === cand.toLowerCase()) return list[i];
    /* sətirdə siyahıdakı ölkə adı varsa */
    for (var j = 0; j < list.length; j++) if (new RegExp("\\b" + list[j].replace(/ /g, "\\s+") + "\\b", "i").test(part)) return list[j];
    return cand;
  }
  function parseCosts(f, opts_online){
    var fee = (f["participation fee"] || "").toLowerCase(), acc = (f["accommodation and food"] || "").toLowerCase(), trv = (f["travel reimbursement"] || f["travel"] || "").toLowerCase();
    if (!fee && !acc && !trv) return "";
    var feeFree = !fee || /free|no fee|none|0\s*(€|eur)|waived|not required|^no\b/.test(fee);
    var accOk = /cover|provid|includ|paid|free|ensured|organi[sz]er/.test(acc) && !/not\s+(be\s+)?(cover|provid|includ)/.test(acc);
    var trvNone = /not\s+(be\s+)?(cover|reimburs)|no\s+(travel\s+)?reimburs|self[- ]fund/.test(trv);
    var trvPart = /up to|maximum|max\.|%|partial|part of|limit|ceiling/.test(trv);
    var trvOk = !!trv && /cover|reimburs|pay|paid|refund|provid/.test(trv) && !trvNone && !trvPart;
    if (feeFree && accOk && trvOk) return "full";
    if (feeFree && /^\s*(not applicable|n\/a|-)?\s*$/.test(acc) && /^\s*(not applicable|n\/a|-)?\s*$/.test(trv) && opts_online) return "full";
    if (!feeFree && !accOk) return "none";
    if (!accOk && !trvOk) return "none";
    return "partial";
  }
  function parseAbout(lines, F){
    var idx = -1;
    for (var i = 0; i < lines.length; i++) if (/^\s*(description|objectives?)\s*:?\s*$/i.test(lines[i])) { idx = i; break; }
    var paras = [], cur = [];
    var from = idx >= 0 ? idx + 1 : 0;
    for (var k = from; k < lines.length; k++) {
      var s = clean(lines[k]);
      if (!s) { if (cur.length) { paras.push(cur.join(" ")); cur = []; } continue; }
      if (LABELS.some(function(l){ return labelRe(l).test(lines[k]) && l !== "Description" && l !== "Objectives"; })) { if (cur.length) { paras.push(cur.join(" ")); cur = []; } continue; }
      cur.push(s);
    }
    if (cur.length) paras.push(cur.join(" "));
    paras = paras.filter(function(p){ return p.length >= 60 && !/^(cookie|privacy|login|©)/i.test(p); });
    if (!paras.length) return "";
    var text = idx >= 0 ? paras.slice(0, 2).join("\n\n") : paras.sort(function(a, b){ return b.length - a.length; })[0];
    if (text.length > 700) { var cut = text.slice(0, 700), p = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n")); text = (p > 300 ? cut.slice(0, p + 1) : cut.replace(/\s+\S*$/, "") + "…"); }
    return text;
  }
  function parseTitle(lines, F){
    var firstLabel = F.order.length ? F.order[0].line : lines.length;
    var skip = /^(home|search|menu|login|log in|sign in|training|tools|european training calendar|training calendar|›|»|>|salto|back|print|share|youth|erasmus\+?)$/i;
    for (var i = firstLabel - 1, n = 0; i >= 0 && n < 14; i--) {
      var s = clean(lines[i]); if (!s) continue; n++;
      if (s.length < 8 || skip.test(s) || /^[\W_]+$/.test(s)) continue;
      if (/^(\d{4}-|\d{1,2}\s+[A-Za-z]+\s+\d{4})/.test(s)) continue;
      return s;
    }
    return "";
  }

  /* mətn: səhifədən kopyalanmış mətn; opts: {countries: ["Germany", ...], link: "https://..."} */
  function parse(text, opts){
    opts = opts || {};
    var lines = String(text || "").replace(/\r/g, "").split("\n");
    var F = fields(lines), f = F.map;
    var dates = parseDates(f["dates and venue"] || f["dates"] || ""), res = {warnings: []};
    res.title = parseTitle(lines, F);
    res.program = "SALTO";
    res.country = parseCountry(f["dates and venue"] || f["venue"] || "", opts.countries);
    res.deadline = parseOneDate(f["application deadline"] || "");
    res.startDate = dates ? dates.start : ""; res.endDate = dates ? dates.end : "";
    res.costs = parseCosts(f, res.country === "Online");
    res.about = parseAbout(lines, F);
    res.link = opts.link || "";
    var names = {title: "Başlıq", country: "Ölkə", deadline: "Deadline", startDate: "Başlama tarixi", endDate: "Bitmə tarixi", costs: "Xərclər", about: "Haqqında", link: "Rəsmi link"};
    Object.keys(names).forEach(function(k){ if (!res[k]) res.warnings.push(names[k]); });
    res.found = Object.keys(f).length;
    return res;
  }
  var API = {parse: parse, parseDates: parseDates, parseCosts: parseCosts, parseCountry: parseCountry};
  root.GV_parseSalto = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : this);
