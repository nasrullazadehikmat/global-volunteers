/* Məxfiliyə hörmət edən sadə sayğac: yalnız ümumi say (cookie yoxdur, şəxsi məlumat yoxdur).
   Firebase Realtime Database-də "stats" yoluna +1 artırma yazılır. Qaydalar yalnız +1-ə icazə verir.
   Admin özü saytda gəzəndə sayılmır (admin paneli açılanda bu brauzerdə söndürülür). */
(function(){
  "use strict";
  var GV = window.GV; if (!GV || !GV.dbUrl) return;
  var base = GV.dbUrl.replace(/\/+$/, "");
  var host = location.hostname, qs = new URLSearchParams(location.search);
  if (qs.has("admin")) return;
  if (location.protocol === "file:" || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host)) { if (!qs.has("track")) return; }
  try { if (localStorage.getItem("gv-notrack") === "1") return; } catch(e){}
  if (navigator.doNotTrack === "1") return;

  var pend = {}, timer = 0, last = {};
  function day(){ return new Date().toISOString().slice(0, 10); }
  function once(k){ try { if (sessionStorage.getItem("gv-s:" + k)) return false; sessionStorage.setItem("gv-s:" + k, "1"); } catch(e){} return true; }
  function flush(){
    timer = 0;
    var body = {}, any = false;
    Object.keys(pend).forEach(function(p){ body[p] = {".sv": {"increment": 1}}; any = true; });
    pend = {};
    if (!any) return;
    try { fetch(base + "/.json", {method: "PATCH", body: JSON.stringify(body), keepalive: true}).catch(function(){}); } catch(e){}
  }
  function bump(path){
    var now = Date.now(); if (last[path] && now - last[path] < 1200) return; last[path] = now;
    pend[path] = 1; if (!timer) timer = setTimeout(flush, 500);
  }
  GV.track = function(metric, id){ if (id) bump("stats/projects/" + id + "/" + metric); };

  /* sayta giriş (sessiya başına 1) */
  if (once("visit")) bump("stats/visits/" + day());

  /* layihənin baxışı: kart ekranda ≥60% görünəndə (sessiyada 1 dəfə) */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var id = (e.target.id || "").replace(/^p-/, ""); io.unobserve(e.target);
        if (id && once("view:" + id)) bump("stats/projects/" + id + "/views");
      });
    }, {threshold: 0.6});
    var watch = function(){ Array.prototype.forEach.call(document.querySelectorAll("#prjList .prj"), function(n){ if (!n.__gvw) { n.__gvw = 1; io.observe(n); } }); };
    document.addEventListener("gv:render", function(){ setTimeout(watch, 50); });
    var list = document.getElementById("prjList");
    new MutationObserver(function(){ var l = document.getElementById("prjList"); if (l) watch(); }).observe(document.body, {childList: true, subtree: true});
    watch();
  }

  /* düymə kliklənməsi */
  document.addEventListener("click", function(e){
    var t = e.target, n;
    if (!t.closest) return;
    var card = t.closest(".prj, .gv-mini"), pid = card ? (card.getAttribute("data-pid") || (card.id || "").replace(/^p-/, "")) : "";
    if (pid) {
      if (t.closest(".prj-btn.wa")) bump("stats/projects/" + pid + "/support");
      else if (t.closest("[data-cal],[data-ics]")) bump("stats/projects/" + pid + "/calendar");
      else if (t.closest("[data-copy]")) bump("stats/projects/" + pid + "/copy");
      else if (t.closest("a.prj-btn[href]") && /^https?:/i.test((t.closest("a.prj-btn") || {}).href || "") && !t.closest("a.prj-btn").getAttribute("href").match(/wa\.me/)) bump("stats/projects/" + pid + "/official");
      if (t.closest(".prj-btn.wa")) bump("stats/cta/support");
    }
    if (t.closest(".nav-cta.member, .btn-member, .member-link")) bump("stats/cta/member");
    else if (t.closest("[data-open=sendingOrgModal]")) bump("stats/cta/member_info");
    else if ((n = t.closest(".pkg-cta"))) {
      var all = Array.prototype.slice.call(document.querySelectorAll(".pkg-cta")); var i = all.indexOf(n) + 1;
      bump("stats/cta/pkg_" + (i > 0 && i <= 3 ? i : 1));
    }
    else if (t.closest(".consult-cta")) bump("stats/cta/consult");
    else if (t.closest(".wa-btn, .contact-link[data-wa]")) bump("stats/cta/whatsapp");
  }, true);
})();
