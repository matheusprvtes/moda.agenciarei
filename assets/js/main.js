/* =========================================================
   Agência Rei — Acelerador de E-commerce de Moda Feminina
   Degradação elegante: sem este JS a página continua legível,
   navegável e com o formulário utilizável.
   ========================================================= */

/* ---------------------------------------------------------
   CONFIGURAÇÃO — EDITE AQUI
   endpoint : URL que recebe os leads (webhook n8n, CRM, etc.).
              Em branco = o formulário valida e mostra sucesso,
              sem enviar para lugar nenhum.
   recaptcha: chave de site do reCAPTCHA v3 (invisível).
              Em branco = o envio segue sem o token.
--------------------------------------------------------- */
var CONFIG = {
  endpoint: "",
  recaptchaSiteKey: "",
  origem: "lp-moda-acelerador-ecommerce"
};

(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---- Ano do rodapé ---- */
  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---- Navbar: estado ao rolar ---- */
  var nav = $("#nav");
  var sticky = $("#stickyCta");
  var hero = $("#inicio");

  function onScroll() {
    if (nav) nav.setAttribute("data-state", window.scrollY > 12 ? "scrolled" : "top");
    if (sticky && hero) {
      sticky.classList.toggle("is-visible", window.scrollY > hero.offsetHeight * 0.6);
    }
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Menu mobile ---- */
  var toggle = $("#navToggle");
  function closeMenu() {
    if (!nav) return;
    nav.classList.remove("is-open");
    if (toggle) { toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Abrir menu"); }
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });
    $$("#navDrawer a").forEach(function (a) { a.addEventListener("click", closeMenu); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }

  /* ---- Coreografia de entrada (reveal em cascata) ---- */
  var reveals = $$(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in-view"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("in-view"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- Link ativo conforme a seção visível ---- */
  var links = {};
  $$('.nav__links a[href^="#"]').forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
  var sections = Object.keys(links).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].classList.remove("is-active"); });
        var current = links[entry.target.id];
        if (current) current.classList.add("is-active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---- Contadores numéricos (scroll-driven) ---- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = prefix + target.toLocaleString("pt-BR") + suffix; return; }
    var dur = 1600, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased).toLocaleString("pt-BR") + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = $$("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---- Hero: bolsas flutuando em 3D ----
     A força do efeito acompanha a presença do hero na tela: 1 = hero visível,
     0 = hero fora. Em 0 as bolsas ficam exatamente sobre a chapa, sem 3D.
     O laço de animação só roda enquanto o hero está visível. */
  var scene = $("#heroScene");
  if (scene && !reduce) {
    // Cada bolsa guarda o próprio estado: a reação ao mouse é individual,
    // baseada na distância do ponteiro até aquela bolsa.
    var bags = $$(".hero__bag", scene).map(function (el, i) {
      return {
        el: el,
        i: i,
        depth: parseFloat(el.getAttribute("data-depth")) || 1,
        cx: 0, cy: 0, radius: 1,   // geometria (recalculada em measure)
        zoom: 0,                    // proximidade suavizada 0..1
        target: 0                   // proximidade desejada neste instante
      };
    });

    var pointer = { x: null, y: null };   // em coordenadas da viewport
    var strength = 0;
    var targetStrength = 0;
    var running = false;
    var startedAt = 0;

    function measure() {
      var rect = scene.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
      targetStrength = Math.max(0, Math.min(1, visible / Math.min(rect.height, vh)));

      // centro e raio de influência de cada bolsa (offset* ignora transforms)
      bags.forEach(function (b) {
        b.cx = rect.left + b.el.offsetLeft + b.el.offsetWidth / 2;
        b.cy = rect.top + b.el.offsetTop + b.el.offsetHeight / 2;
        b.radius = Math.max(b.el.offsetWidth, b.el.offsetHeight) * 0.95;
      });

      if (targetStrength > 0.02 && !running) { running = true; requestAnimationFrame(frame); }
    }

    function frame(ts) {
      if (!startedAt) startedAt = ts;
      var t = (ts - startedAt) / 1000;

      strength += (targetStrength - strength) * 0.08;

      for (var i = 0; i < bags.length; i++) {
        var b = bags[i];

        // proximidade do ponteiro a ESTA bolsa (0 = longe, 1 = em cima)
        b.target = 0;
        if (pointer.x !== null) {
          var dist = Math.hypot(pointer.x - b.cx, pointer.y - b.cy);
          var p = 1 - dist / b.radius;
          b.target = p > 0 ? p * p * (3 - 2 * p) : 0;   // suavização smoothstep
        }
        // cada bolsa converge no seu próprio ritmo — entra e sai do zoom sozinha
        b.zoom += (b.target - b.zoom) * 0.07;

        // flutuação contínua (inalterada), cada uma com sua fase
        var floatX = Math.sin(t * 0.55 + i * 2.1) * 7 * b.depth;
        var floatY = Math.cos(t * 0.42 + i * 1.4) * 10 * b.depth;
        var rot = Math.sin(t * 0.4 + i) * 1.6 * b.depth * strength;

        // zoom in ao aproximar, zoom out ao afastar — sem deslocamento
        var sc = 1 + (0.035 * b.depth + 0.14 * b.zoom) * strength;

        b.el.style.setProperty("--tx", (floatX * strength).toFixed(2) + "px");
        b.el.style.setProperty("--ty", (floatY * strength).toFixed(2) + "px");
        b.el.style.setProperty("--rot", rot.toFixed(2) + "deg");
        b.el.style.setProperty("--sc", sc.toFixed(4));
        // a sombra acompanha o zoom, reforçando a sensação de aproximar
        b.el.style.setProperty("--sh-y", ((10 * b.depth + 14 * b.zoom) * strength).toFixed(1) + "px");
        b.el.style.setProperty("--sh-b", ((18 * b.depth + 22 * b.zoom) * strength).toFixed(1) + "px");
        b.el.style.setProperty("--sh-a", ((0.18 + 0.14 * b.zoom) * strength).toFixed(3));
      }

      if (strength < 0.005 && targetStrength < 0.02) {
        // devolve tudo ao lugar exato da foto original e encerra o laço
        running = false;
        startedAt = 0;
        scene.classList.remove("is-floating");
        bags.forEach(function (b) {
          b.zoom = 0;
          ["--tx", "--ty", "--rot", "--sc", "--sh-y", "--sh-b", "--sh-a"].forEach(function (p) {
            b.el.style.removeProperty(p);
          });
        });
        return;
      }

      scene.classList.add("is-floating");
      requestAnimationFrame(frame);
    }

    // O ponteiro é acompanhado na seção inteira: a bolsa reage quando o mouse
    // passa perto dela, mesmo que ainda não esteja sobre a imagem.
    var heroSection = scene.closest(".hero") || scene;
    heroSection.addEventListener("mousemove", function (e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    });
    heroSection.addEventListener("mouseleave", function () { pointer.x = null; pointer.y = null; });

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();
  }

  /* ---- Parallax sutil das esferas de fundo ---- */
  var parallax = $$("[data-parallax]");
  if (parallax.length && !reduce) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        parallax.forEach(function (el) {
          var factor = parseFloat(el.getAttribute("data-parallax")) || 0;
          el.style.transform = "translate3d(0," + (y * factor).toFixed(1) + "px,0)";
        });
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---- Vídeos: facade do YouTube (só carrega o iframe ao clicar) ---- */
  $$(".video[data-youtube]").forEach(function (box) {
    var id = box.getAttribute("data-youtube");
    box.addEventListener("click", function () {
      if (box.querySelector("iframe")) return;
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&playsinline=1";
      iframe.title = "Depoimento de cliente da Agência Rei";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.loading = "lazy";
      box.innerHTML = "";
      box.appendChild(iframe);
      if (window.dataLayer) window.dataLayer.push({ event: "video_play", video_id: id });
    });
  });

  /* ---- Selects: label flutuante ---- */
  $$(".field select").forEach(function (sel) {
    function upd() { sel.classList.toggle("has-value", !!sel.value); }
    sel.addEventListener("change", upd);
    upd();
  });

  /* ---- reCAPTCHA v3 (carrega só se a chave estiver configurada) ---- */
  if (CONFIG.recaptchaSiteKey) {
    var rc = document.createElement("script");
    rc.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(CONFIG.recaptchaSiteKey);
    rc.async = true;
    document.head.appendChild(rc);
  }
  function withRecaptcha(cb) {
    if (!CONFIG.recaptchaSiteKey || !window.grecaptcha || !window.grecaptcha.execute) { cb(null); return; }
    try {
      window.grecaptcha.ready(function () {
        window.grecaptcha.execute(CONFIG.recaptchaSiteKey, { action: "lead" })
          .then(function (token) { cb(token); })
          .catch(function () { cb(null); });
      });
    } catch (e) { cb(null); }
  }

  /* ---- Formulário: validação inline + envio ---- */
  var form = $("#lead-form");
  if (form) {
    var alertBox = $("#formAlert");
    var consent = $("#consent");
    var consentWrap = $("#consentWrap");
    var whats = $("#whatsapp");

    var RULES = {
      nome: function (v) { return v.trim().length >= 3 && v.trim().indexOf(" ") > 0; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); },
      whatsapp: function (v) { return v.replace(/\D/g, "").length >= 10; },
      loja: function (v) { return v.trim().length >= 3; },
      faturamento: function (v) { return !!v; }
    };

    function fieldOf(input) { return input.closest(".field"); }

    function validate(input, silent) {
      var rule = RULES[input.name];
      if (!rule) return true;
      var ok = rule(input.value);
      var wrap = fieldOf(input);
      if (!wrap) return ok;
      // Enquanto digita, só marca sucesso; o erro aparece ao sair do campo ou ao enviar.
      wrap.classList.toggle("field--error", !ok && !silent);
      wrap.classList.toggle("field--ok", ok);
      return ok;
    }

    // Máscara de telefone
    if (whats) {
      whats.addEventListener("input", function () {
        var d = whats.value.replace(/\D/g, "").slice(0, 11);
        var out = d;
        if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
        if (d.length > 7) out = "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
        whats.value = out;
      });
    }

    $$("input, select", form).forEach(function (input) {
      if (!RULES[input.name]) return;
      input.addEventListener("input", function () { validate(input, true); });
      input.addEventListener("change", function () { validate(input, false); });
      input.addEventListener("blur", function () { if (input.value) validate(input, false); });
    });

    if (consent) {
      consent.addEventListener("change", function () {
        if (consentWrap) consentWrap.classList.toggle("consent--error", !consent.checked);
      });
    }

    // Sanitização básica antes de enviar ao CRM
    function clean(v) {
      return String(v == null ? "" : v)
        .replace(/<[^>]*>/g, "")                          // remove tags (XSS)
        .replace(/[\u0000-\u001F\u007F]/g, "")            // remove caracteres de controle
        .trim()
        .slice(0, 300);
    }

    function utmParams() {
      var out = {};
      try {
        var q = new URLSearchParams(window.location.search);
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"].forEach(function (k) {
          var v = q.get(k);
          if (v) out[k] = v;
        });
      } catch (e) {}
      return out;
    }

    function send(payload) {
      if (!CONFIG.endpoint || typeof window.fetch !== "function") return Promise.resolve(true);
      return fetch(CONFIG.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).then(function (r) { return r.ok; }).catch(function () { return false; });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: preenchido = bot, ignora silenciosamente
      var hp = form.querySelector('input[name="empresa"]');
      if (hp && hp.value.trim() !== "") return;

      if (alertBox) alertBox.classList.remove("is-visible");

      var ok = true;
      $$("input, select", form).forEach(function (input) {
        if (!RULES[input.name]) return;
        if (!validate(input, false)) ok = false;
      });

      if (consent && !consent.checked) {
        ok = false;
        if (consentWrap) consentWrap.classList.add("consent--error");
      }

      if (!ok) {
        var firstErr = form.querySelector(".field--error input, .field--error select");
        if (firstErr) firstErr.focus();
        else if (consent && !consent.checked) consent.focus();
        return;
      }

      var btn = $("#cta-form");
      if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }

      withRecaptcha(function (token) {
        var payload = {
          origem: CONFIG.origem,
          pagina: window.location.href,
          enviado_em: new Date().toISOString(),
          nome: clean(form.nome.value),
          email: clean(form.email.value),
          whatsapp: clean(form.whatsapp.value),
          whatsapp_e164: "55" + form.whatsapp.value.replace(/\D/g, ""),
          loja: clean(form.loja.value),
          faturamento: clean(form.faturamento.value),
          consentimento_lgpd: true
        };
        if (token) payload.recaptcha_token = token;
        var utm = utmParams();
        Object.keys(utm).forEach(function (k) { payload[k] = utm[k]; });

        send(payload).then(function (sent) {
          if (btn) { btn.disabled = false; btn.textContent = "Agende sua Consultoria Gratuita"; }

          if (!sent) {
            if (alertBox) alertBox.classList.add("is-visible");
            return;
          }

          if (window.dataLayer) window.dataLayer.push({ event: "lead_form_submit", origem: CONFIG.origem });
          if (typeof window.fbq === "function") window.fbq("track", "Lead");
          form.classList.add("is-sent");
        });
      });
    });
  }

  /* ---- Tracking de cliques nos CTAs ---- */
  $$("[data-cta]").forEach(function (el) {
    el.addEventListener("click", function () {
      if (window.dataLayer) window.dataLayer.push({ event: "cta_click", cta: el.getAttribute("data-cta") });
    });
  });

  /* ---- Banner de cookies (LGPD) ---- */
  var cookie = $("#cookie");
  var KEY = "rei_moda_cookie_consent";
  try {
    if (cookie && !localStorage.getItem(KEY)) setTimeout(function () { cookie.hidden = false; }, 1400);
  } catch (e) {}
  function setConsent(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    if (cookie) cookie.hidden = true;
    if (window.dataLayer) window.dataLayer.push({ event: "cookie_consent", value: v });
  }
  var accept = $("#cookieAccept");
  var decline = $("#cookieDecline");
  if (accept) accept.addEventListener("click", function () { setConsent("accepted"); });
  if (decline) decline.addEventListener("click", function () { setConsent("declined"); });
})();
