/* Admin panel: hazır cavab şablonları.
   Saytdakı hər xidmət düyməsi WhatsApp-da hazır mesaj göndərir ("Salam! ESC VIP paketi ilə maraqlanıram...").
   Burada hər xidmət üçün həmin mesaja uyğun cavab saxlanılır: admin panelə girib kopyalayır və göndərirsiniz.
   Mətnlər redaktə edilə bilər, Firebase-də "crm/replies" altında saxlanılır (yalnız admin oxuya/yaza bilər, əlavə qayda lazım deyil).
   Redaktə edilməyibsə aşağıdakı standart mətn göstərilir. «Standarta qaytar» redaktəni silir. */
(function(root){
  "use strict";

  var TAIL_AZ = "\n\nDavam etmək istəyirsinizsə, ad-soyadınızı və yaşınızı yazın 🙂";
  var TAIL_EN = "\n\nIf you'd like to continue, please send your full name and age 🙂";
  var NOTE_AZ = "ℹ️ Qəbul qərarı layihə təşkilatçılarına məxsusdur, qəbula zəmanət verilmir.";
  var NOTE_EN = "ℹ️ The final decision belongs to the project organisers, acceptance is not guaranteed.";

  function escPack(name, n, ini, tiers, azTiers, enTiers){
    return {
      az: "Salam! 🙂 ESC " + name + " paketi ilə maraqlandığınız üçün təşəkkür edirik.\n\n" +
        "⭐ ESC " + name + " – " + n + " layihəyə müraciət\n" +
        "✍️ " + n + " fərdi motivasiya məktubu\n" +
        "📄 Europass CV daxildir (həmişə sizdə qalır)\n" +
        "🔓 Müraciət üçün Sending Organization lazım deyil (yalnız qəbuldan sonra)\n\n" +
        "💰 Ödəniş:\n• İlkin ödəniş: " + ini + " AZN\n• Yekun ödəniş yalnız qəbul gələrsə:\n" + azTiers + "\n" +
        "• Qəbul gəlməzsə, yekun ödəniş yoxdur (ilkin ödəniş geri qaytarılmır)\n\n" +
        "🛠 Biz nə edirik:\n• ESC hesabı və profil hazırlanır\n• Profilinizə uyğun layihələr seçilir\n" +
        "• Sənədlər yoxlanılır və müraciətlər göndərilir\n• Qəbuldan sonra viza sənədlərinə nəzarət və getməzdən əvvəl brifinq\n\n" + NOTE_AZ + TAIL_AZ,
      en: "Hello! 🙂 Thank you for your interest in the ESC " + name + " package.\n\n" +
        "⭐ ESC " + name + " – applications to " + n + " project" + (n > 1 ? "s" : "") + "\n" +
        "✍️ " + n + " personal motivation letter" + (n > 1 ? "s" : "") + "\n" +
        "📄 Europass CV included (it stays with you)\n" +
        "🔓 No Sending Organization needed to apply (only after acceptance)\n\n" +
        "💰 Payment:\n• Initial payment: " + ini + " AZN\n• Final payment only if you are accepted:\n" + enTiers + "\n" +
        "• If you are not accepted, no final payment (the initial payment is non-refundable)\n\n" +
        "🛠 What we do:\n• Set up your ESC account and profile\n• Pick projects that match your profile\n" +
        "• Check your documents and send the applications\n• After acceptance: visa document support and a pre-departure briefing\n\n" + NOTE_EN + TAIL_EN
    };
  }

  function saltoPack(name, n, ini, azTiers, enTiers, azList, enList){
    var soAz = "ℹ️ Qeyd: Salto Youth layihələrinə müraciət üçün Sending Organization tələb olunur.";
    var soEn = "ℹ️ Note: Salto Youth projects require a Sending Organization.";
    return {
      az: "Salam! 🙂 Salto Youth " + name + " paketi ilə maraqlandığınız üçün təşəkkür edirik.\n\n" +
        "⭐ Salto Youth " + name + " – " + n + " layihə\n" + azList + "\n\n" +
        "💰 Ödəniş:\n• İlkin ödəniş: " + ini + " AZN\n• Yekun ödəniş yalnız qəbul gələrsə:\n" + azTiers + "\n" +
        "• Qəbul gəlməzsə, yekun ödəniş yoxdur (ilkin ödəniş geri qaytarılmır)\n\n" + soAz + "\n" + NOTE_AZ + TAIL_AZ,
      en: "Hello! 🙂 Thank you for your interest in the Salto Youth " + name + " package.\n\n" +
        "⭐ Salto Youth " + name + " – " + n + " project" + (n > 1 ? "s" : "") + "\n" + enList + "\n\n" +
        "💰 Payment:\n• Initial payment: " + ini + " AZN\n• Final payment only if you are accepted:\n" + enTiers + "\n" +
        "• If you are not accepted, no final payment (the initial payment is non-refundable)\n\n" + soEn + "\n" + NOTE_EN + TAIL_EN
    };
  }

  /* key = saytdakı düymənin data-stat adı (statistika ilə eyni); msg = müştərinin göndərdiyi hazır mesaj */
  var SERVICES = [
    {key: "esc_1", title: "ESC · Standard (1 layihə)", msg: ["ESC Standard paketi ilə maraqlanıram", "ESC Standard package"],
      r: escPack("Standard", 1, 80, 0, "• 1 layihəyə qəbul: +100 AZN (cəmi 180 AZN)", "• Accepted to the project: +100 AZN (total 180 AZN)")},
    {key: "esc_2", title: "ESC · Premium (2 layihə)", msg: ["ESC Premium paketi ilə maraqlanıram", "ESC Premium package"],
      r: escPack("Premium", 2, 100, 0, "  – 1 layihəyə qəbul: +100 AZN (cəmi 200 AZN)\n  – 2 layihəyə qəbul: +130 AZN (cəmi 230 AZN)", "  – Accepted to 1 project: +100 AZN (total 200 AZN)\n  – Accepted to 2 projects: +130 AZN (total 230 AZN)")},
    {key: "esc_3", title: "ESC · VIP (4 layihə)", msg: ["ESC VIP paketi ilə maraqlanıram", "ESC VIP package"],
      r: escPack("VIP", 4, 130, 0, "  – 1 layihəyə qəbul: +100 AZN (cəmi 230 AZN)\n  – 2 layihəyə qəbul: +130 AZN (cəmi 260 AZN)\n  – 3 və daha çox qəbul: +200 AZN (cəmi 330 AZN)", "  – Accepted to 1 project: +100 AZN (total 230 AZN)\n  – Accepted to 2 projects: +130 AZN (total 260 AZN)\n  – Accepted to 3 or more: +200 AZN (total 330 AZN)")},
    {key: "pkg_1", title: "Salto Youth · Standard (1 layihə)", msg: ["Standart paket ilə maraqlanıram", "interested in the Standard package"],
      r: saltoPack("Standard", 1, 50, "• 1 layihəyə qəbul: +100 AZN (cəmi 150 AZN)", "• Accepted to the project: +100 AZN (total 150 AZN)",
        "• Profilə uyğun 1 layihənin seçilməsi\n• Fərdi Motivation Text hazırlanması\n• Müraciətin reallaşdırılması\n• Viza sənədlərinə dəstək və müsahibəyə hazırlıq",
        "• Choosing 1 project that fits your profile\n• A personal Motivation Text\n• We submit the application\n• Visa document support and interview preparation")},
    {key: "pkg_2", title: "Salto Youth · Premium (2 layihə)", msg: ["Premium paket ilə maraqlanıram", "interested in the Premium package"],
      r: saltoPack("Premium", 2, 80, "  – 1 layihəyə qəbul: +100 AZN (cəmi 180 AZN)\n  – 2 layihəyə qəbul: +170 AZN (cəmi 250 AZN)", "  – Accepted to 1 project: +100 AZN (total 180 AZN)\n  – Accepted to 2 projects: +170 AZN (total 250 AZN)",
        "• Profilə uyğun 2 fərqli layihənin seçilməsi\n• Hər layihə üçün fərdi Motivation Text\n• Müraciətlərin reallaşdırılması\n• Layihələr üzrə fərdi strategiya\n• Viza sənədlərinə tam dəstək və müsahibə hazırlığı",
        "• Choosing 2 different projects that fit your profile\n• A personal Motivation Text for each project\n• We submit the applications\n• A personal strategy for the projects\n• Full visa document support and interview preparation")},
    {key: "pkg_3", title: "Salto Youth · VIP (5 layihə)", msg: ["VIP paket ilə maraqlanıram", "interested in the VIP package"],
      r: saltoPack("VIP", 5, 150, "  – 1 layihəyə qəbul: +100 AZN (cəmi 250 AZN)\n  – 2 və ya daha çox qəbul: +170 AZN (cəmi 320 AZN)", "  – Accepted to 1 project: +100 AZN (total 250 AZN)\n  – Accepted to 2 or more: +170 AZN (total 320 AZN)",
        "• Profilə uyğun 5 fərqli layihənin seçilməsi\n• Hər layihə üçün tam fərqli Motivation Text\n• Bütün müraciətlərin tərəfimizdən reallaşdırılması\n• Viza sənədləri + müsahibəyə tam hazırlıq\n• Müstəqil müraciət video təlimatı",
        "• Choosing 5 different projects that fit your profile\n• A completely different Motivation Text for every project\n• We submit all applications for you\n• Visa documents + full interview preparation\n• A video guide for applying on your own")},
    {key: "esc_cv", title: "Yalnız Europass CV (30 AZN)", msg: ["Europass CV hazırlanması xidməti", "Europass CV only"], r: {
      az: "Salam! 🙂 Europass CV xidməti ilə maraqlandığınız üçün təşəkkür edirik.\n\n📄 Europass CV – 30 AZN\n• Avropa standartında CV hazırlanır\n• ESC layihələrinə, universitetlərə, iş vakansiyalarına və təlimlərə müraciətdə istifadə edə bilərsiniz\n• Hazırlanan CV həmişə sizdə qalır\n\nCV-ni hazırlamaq üçün ad-soyadınızı yazın və mövcud CV-nizi (və ya təhsil/təcrübə məlumatlarınızı) göndərin 🙂",
      en: "Hello! 🙂 Thank you for your interest in the Europass CV service.\n\n📄 Europass CV – 30 AZN\n• A CV prepared to the European standard\n• Usable for ESC projects, universities, job vacancies and trainings\n• The CV stays with you\n\nTo get started, please send your full name and your current CV (or your education/experience details) 🙂"}},
    {key: "esc_letter", title: "Yalnız motivasiya məktubu (25 AZN)", msg: ["motivasiya məktubu hazırlanması xidməti", "motivation letter only"], r: {
      az: "Salam! 🙂 Motivasiya məktubu xidməti ilə maraqlandığınız üçün təşəkkür edirik.\n\n✍️ Motivasiya məktubu – 25 AZN\n• Layihəyə uyğun fərdi məktub yazılır\n\nBaşlamaq üçün ad-soyadınızı, müraciət etmək istədiyiniz layihənin linkini və qısa məlumatınızı (təhsil, təcrübə, maraqlar) göndərin 🙂",
      en: "Hello! 🙂 Thank you for your interest in the motivation letter service.\n\n✍️ Motivation letter – 25 AZN\n• A personal letter written for your project\n\nTo get started, please send your full name, the link to the project and a short background (education, experience, interests) 🙂"}},
    {key: "consult", title: "Konsultasiya (20 AZN)", msg: ["Konsultasiya üçün yazmışam", "about the consultation"], r: {
      az: "Salam! 🙂 Konsultasiya ilə maraqlandığınız üçün təşəkkür edirik.\n\n💬 Erasmus+ ilə tanışlıq konsultasiyası – 20 AZN (45 dəqiqə – 1 saat)\nErasmus+ haqqında ümumi məlumatı olmayanlar üçündür, mövzu sıfırdan izah olunur:\n• Erasmus+ layihələri və növləri\n• Hansı sayt üzərindən, necə müraciət olunur\n• Sending Organization nədir və niyə lazımdır\n• Suallarınıza canlı cavab\n\nSizə uyğun gün və saatı yazın 🙂",
      en: "Hello! 🙂 Thank you for your interest in the consultation.\n\n💬 Introductory Erasmus+ consultation – 20 AZN (45 minutes – 1 hour)\nFor those with no prior knowledge of Erasmus+, explained from scratch:\n• Erasmus+ projects and their types\n• Which website to use and how to apply\n• What a Sending Organization is and why it is needed\n• Live answers to your questions\n\nPlease tell us which day and time suit you 🙂"}},
    {key: "member", title: "Sending Organization üzvlüyü", msg: ["Sending Organization üzvlüyü ilə maraqlanıram", "become a member (Sending Organization)"], r: {
      az: "Salam! 🙂 Sending Organization üzvlüyü ilə maraqlandığınız üçün təşəkkür edirik.\n\n🤝 Global Volunteers Azerbaijan üzvlüyü:\n• 6 aylıq – 30 AZN\n• 1 illik – 50 AZN\n\nÜzvlük müddətində istənilən sayda Erasmus+ layihəsinə müraciət edə bilərsiniz. Sending Organization sizin layihəyə seçildiyiniz halda sizi dəstəkləyən təşkilatdır və müraciət formalarında bu təşkilata aid suallar olur.\n\n" + NOTE_AZ + "\n\nÜzv olmaq istəyirsinizsə, ad-soyadınızı və hansı paketi seçdiyinizi yazın 🙂",
      en: "Hello! 🙂 Thank you for your interest in Sending Organization membership.\n\n🤝 Global Volunteers Azerbaijan membership:\n• 6 months – 30 AZN\n• 1 year – 50 AZN\n\nDuring your membership you can apply to any number of Erasmus+ projects. The Sending Organization supports you if you are selected for a project, and application forms ask questions about it.\n\n" + NOTE_EN + "\n\nIf you'd like to join, please send your full name and the package you choose 🙂"}}
  ];

  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function norm(s){ return String(s || "").toLowerCase().replace(/ı/g, "i").replace(/ə/g, "e").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/\s+/g, " "); }

  function copy(text){
    if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function(res, rej){
      var t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy") ? res() : rej(); } catch(e){ rej(e); } document.body.removeChild(t);
    });
  }

  function init(box, ctx){
    if (!box || box.getAttribute("data-ready")) return;
    box.setAttribute("data-ready", "1");
    var fs = ctx && ctx.fs, db = ctx && ctx.db, denied = (ctx && ctx.denied) || function(){};
    var lang = "az", saved = {}, list;

    box.innerHTML =
      '<p class="adm-note">ℹ️ Saytdakı hər xidmət düyməsi WhatsApp-da hazır mesaj göndərir. Hər xidmətin altında həmin mesaja cavab saxlanılır: «Kopyala» basıb WhatsApp-a yapışdırın. Mətni dəyişib «Yadda saxla» desəniz, dəyişiklik qalır.</p>' +
      '<div class="adm-grid"><div class="field full"><label for="rp-find">Gələn mesajı yapışdırın (uyğun cavabı tapmaq üçün)</label>' +
      '<input id="rp-find" type="text" autocomplete="off" placeholder="məs. Salam! ESC VIP paketi ilə maraqlanıram..."></div></div>' +
      '<div class="adm-toggles" style="margin:12px 0;"><button type="button" class="adm-toggle" data-lang="az" aria-pressed="true">Azərbaycanca</button>' +
      '<button type="button" class="adm-toggle" data-lang="en" aria-pressed="false">English</button></div>' +
      '<p class="adm-msg" id="rp-msg" role="status"></p><div id="rp-list"></div>';
    list = box.querySelector("#rp-list");
    var msgEl = box.querySelector("#rp-msg");
    function say(t, err){ msgEl.textContent = t || ""; msgEl.className = "adm-msg" + (err ? " err" : ""); }

    function text(s){ return saved[s.key + "_" + lang] != null ? saved[s.key + "_" + lang] : s.r[lang]; }

    function draw(hit){
      list.textContent = "";
      SERVICES.forEach(function(s){
        var custom = saved[s.key + "_" + lang] != null;
        var d = document.createElement("details");
        d.className = "adm-card"; d.setAttribute("data-key", s.key);
        if (hit === s.key) d.open = true;
        d.innerHTML = '<summary style="cursor:pointer;font-weight:600;">' + esc(s.title) + (custom ? ' <small style="font-weight:400;opacity:.7;">· redaktə olunub</small>' : '') + '</summary>' +
          '<p class="adm-note" style="margin:10px 0;">Müştəri yazır: «' + esc(s.msg[lang === "en" ? 1 : 0]) + '…»</p>' +
          '<textarea style="width:100%;min-height:260px;font-size:0.92rem;" spellcheck="false"></textarea>' +
          '<div class="adm-actions" style="margin-top:10px;"><button type="button" class="btn-primary" data-act="copy" style="border:none;cursor:pointer;font-family:Inter,sans-serif;">Kopyala</button>' +
          '<button type="button" class="adm-btn" data-act="save">Yadda saxla</button>' +
          '<button type="button" class="adm-btn" data-act="reset"' + (custom ? '' : ' hidden') + '>Standarta qaytar</button></div>';
        d.querySelector("textarea").value = text(s);
        list.appendChild(d);
      });
      if (hit) { var h = list.querySelector('[data-key="' + hit + '"]'); if (h && h.scrollIntoView) h.scrollIntoView({behavior: "smooth", block: "nearest"}); }
    }

    function load(){
      if (!fs || !db) { draw(); return; }
      fs.get(fs.ref(db, "crm/replies")).then(function(snap){ saved = snap.exists() ? snap.val() : {}; draw(); }).catch(function(e){ draw(); denied(e); });
    }

    function match(q){
      var n = norm(q); if (n.length < 4) return null;
      for (var i = 0; i < SERVICES.length; i++) {
        for (var j = 0; j < 2; j++) if (norm(SERVICES[i].msg[j]).indexOf(n) > -1 || n.indexOf(norm(SERVICES[i].msg[j])) > -1) return SERVICES[i];
      }
      return null;
    }

    box.querySelector("#rp-find").addEventListener("input", function(){
      var s = match(this.value);
      if (s) { say("Tapıldı: " + s.title); draw(s.key); } else say(this.value.trim().length > 3 ? "Uyğun xidmət tapılmadı, aşağıdakı siyahıdan seçin." : "");
    });

    box.addEventListener("click", function(e){
      var lb = e.target.closest ? e.target.closest("[data-lang]") : null;
      if (lb) {
        lang = lb.getAttribute("data-lang");
        Array.prototype.forEach.call(box.querySelectorAll("[data-lang]"), function(b){ b.setAttribute("aria-pressed", b === lb ? "true" : "false"); });
        draw(); return;
      }
      var b = e.target.closest ? e.target.closest("[data-act]") : null; if (!b) return;
      var card = b.closest("details"), key = card.getAttribute("data-key"), ta = card.querySelector("textarea"), act = b.getAttribute("data-act"), id = key + "_" + lang, upd = {};
      if (act === "copy") {
        copy(ta.value).then(function(){ say("Kopyalandı ✓"); }).catch(function(){ ta.select(); say("Avtomatik kopyalanmadı, mətn seçildi: Ctrl+C basın.", true); });
      } else if (act === "save") {
        var v = ta.value.trim(); if (!v) { say("Mətn boş ola bilməz.", true); return; }
        upd[id] = v;
        fs.update(fs.ref(db, "crm/replies"), upd).then(function(){ saved[id] = v; say("Yadda saxlandı ✓"); draw(key); }).catch(denied);
      } else if (act === "reset") {
        if (!window.confirm("Bu cavab standart mətnə qayıtsın?")) return;
        fs.remove(fs.ref(db, "crm/replies/" + id)).then(function(){ delete saved[id]; say("Standart mətn bərpa olundu."); draw(key); }).catch(denied);
      }
    });

    load();
  }

  root.GV_initReplies = init;
  root.GV_REPLY_SERVICES = SERVICES; /* test üçün */
})(typeof window !== "undefined" ? window : this);
