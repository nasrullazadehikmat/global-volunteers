/* Tünd / işıqlı rejim düyməsi. Seçim yadda saxlanır; seçilməyibsə cihazın rejiminə uyğun gedir. */
(function(){
  "use strict";
  var root = document.documentElement, KEY = "gv-theme";
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function saved(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } }
  function save(v){ try { localStorage.setItem(KEY, v); } catch(e){} }
  function isDark(){
    var t = root.getAttribute("data-theme");
    return t ? t === "dark" : !!(mq && mq.matches);
  }
  function lang(){ return root.lang === "en" ? "en" : "az"; }
  function paint(){
    var dark = isDark();
    Array.prototype.forEach.call(document.querySelectorAll("[data-theme-toggle]"), function(b){
      b.textContent = dark ? "☀" : "☾";
      var l = lang() === "az" ? (dark ? "İşıqlı rejimə keç" : "Tünd rejimə keç") : (dark ? "Switch to light mode" : "Switch to dark mode");
      b.setAttribute("aria-label", l); b.title = l; b.setAttribute("aria-pressed", dark ? "true" : "false");
    });
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", dark ? "#0A1030" : "#0A1B4D");
  }
  var s = saved(); if (s === "dark" || s === "light") root.setAttribute("data-theme", s);
  document.addEventListener("click", function(e){
    var b = e.target.closest && e.target.closest("[data-theme-toggle]"); if (!b) return;
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next); save(next); paint();
  });
  if (mq && mq.addEventListener) mq.addEventListener("change", function(){ if (!saved()) paint(); });
  document.addEventListener("gv:render", paint);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint); else paint();
})();
