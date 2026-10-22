/* Admin paneldə statistika göstərir: ziyarətlər (günlər üzrə), düymə kliklənmələri, layihələr üzrə baxış. */
(function(root){
  "use strict";
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function sum(o){ var n = 0; Object.keys(o || {}).forEach(function(k){ n += +o[k] || 0; }); return n; }
  function dayKey(d){ return d.toISOString().slice(0, 10); }
  var CTA = {member: "Üzv ol", member_info: "Üzvlük: «Ətraflı məlumat»", support: "Dəstək al (layihələrdə)", pkg_1: "Paket: Standard", pkg_2: "Paket: Premium",
    pkg_3: "Paket: VIP", consult: "Konsultasiya", whatsapp: "WhatsApp (ümumi)"};

  function render(box, stats, rows){
    stats = stats || {};
    var visits = stats.visits || {}, cta = stats.cta || {}, pr = stats.projects || {};
    var today = new Date(), days = [], i;
    for (i = 13; i >= 0; i--) { var d = new Date(today.getTime() - i * 864e5); days.push(dayKey(d)); }
    var max = 1; days.forEach(function(k){ if ((visits[k] || 0) > max) max = visits[k]; });
    var t0 = visits[days[13]] || 0, w7 = 0, m30 = 0;
    for (i = 0; i < 30; i++) { var v = visits[dayKey(new Date(today.getTime() - i * 864e5))] || 0; m30 += v; if (i < 7) w7 += v; }
    var all = sum(visits);
    var h = '<div class="st-cards">' +
      [["Bu gün", t0], ["Son 7 gün", w7], ["Son 30 gün", m30], ["Cəmi", all]].map(function(c){ return '<div class="st-card"><small>' + c[0] + '</small><b>' + c[1] + '</b></div>'; }).join("") + '</div>';
    h += '<h3 class="st-h">Sayta giriş (son 14 gün)</h3><div class="st-bars" role="img" aria-label="Günlük ziyarətlər">' +
      days.map(function(k){ var n = visits[k] || 0; return '<div class="st-bar" title="' + k + ': ' + n + '"><i style="height:' + Math.round(n / max * 100) + '%"></i><span>' + k.slice(8) + '</span><em>' + n + '</em></div>'; }).join("") + '</div>';
    h += '<h3 class="st-h">Düymələr</h3><table class="st-table"><tbody>' + Object.keys(CTA).map(function(k){ return '<tr><td>' + CTA[k] + '</td><td class="n">' + (cta[k] || 0) + '</td></tr>'; }).join("") + '</tbody></table>';
    var list = (rows || []).map(function(r){ var s = pr[r.id] || {}; return {t: r.title || "(başlıqsız)", c: r.country || "", v: s.views || 0, s: s.support || 0, o: s.official || 0, k: s.calendar || 0, f: s.fav || 0, p: s.copy || 0}; })
      .sort(function(a, b){ return (b.v + b.s * 3) - (a.v + a.s * 3); });
    h += '<h3 class="st-h">Layihələr üzrə</h3>';
    if (!list.length) h += '<p class="adm-note">Hələ layihə yoxdur.</p>';
    else h += '<div class="st-wrap"><table class="st-table"><thead><tr><th>Layihə</th><th class="n">Baxış</th><th class="n">Dəstək al</th><th class="n">Rəsmi link</th><th class="n">Təqvim</th><th class="n">Link kopya</th><th class="n">Sevimli</th></tr></thead><tbody>' +
      list.map(function(r){ return '<tr><td>' + esc(r.t) + '<small>' + esc(r.c) + '</small></td><td class="n">' + r.v + '</td><td class="n">' + r.s + '</td><td class="n">' + r.o + '</td><td class="n">' + r.k + '</td><td class="n">' + r.p + '</td><td class="n">' + r.f + '</td></tr>'; }).join("") + '</tbody></table></div>';
    h += '<p class="adm-note">Baxış = layihə kartı bir sessiyada ən azı bir dəfə ekranda görünüb. Ziyarət = sayta bir sessiyada bir giriş. Cookie və şəxsi məlumat saxlanmır.</p>';
    box.innerHTML = h;
  }
  root.GV_renderStats = render;
})(window);
