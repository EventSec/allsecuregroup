/* ==========================================================================
   All Secure Group — main.js
   Renders text + images from content.json into the page and powers the
   photo carousel. The page has static defaults baked in, so if content.json
   is absent or cannot be fetched, the site still renders perfectly.
   ========================================================================== */

(function () {
  "use strict";

  var DEFAULTS = {
    nav: { location: "BANGKOK, THAILAND", contactLabel: "CONTACT US", contactHref: "#contact" },
    logo: { src: "assets/9exs6MbUys3znOG6NQgxVSiV6mM.png", alt: "Event Sec logo", href: "#" },
    hero: { kicker: "EVENT SECURITY CONSULTANCY", title: "PROACTIVE SECURITY.", statement: "Command-ready safety planning and live operational support for Thailand's largest public gatherings." },
    scaleSignal: { stat: "400,000+", label: "ATTENDEES, AN UNBLEMISHED RECORD.", note: "Built around the realities of mass participation: venue complexity, multiple agencies, high-value guests and live incident response." },
    operatingModel: { titleLine1: "SAFE CROWDS,", titleLine2: "SEAMLESS EVENTS.", note: "A focused consultancy for the moments with no margin for error.", capabilities: [
      { icon: "assets/icons/plan.svg", title: "ADVANCE PLANNING", description: "Threat assessment, crowd-flow review, command protocols." },
      { icon: "assets/icons/operations.svg", title: "LIVE OPERATIONS", description: "Decision support, control room coordination, field oversight." },
      { icon: "assets/icons/crisis.svg", title: "CRISIS READINESS", description: "Response playbooks, rehearsals, escalation pathways." }
    ]},
    gallery: { titleLine1: "RECENT", titleLine2: "OPERATIONS.", note: "A record of the environments we help keep ready.", slides: [
      { label: "IMG 20260322_143655_904", src: "assets/7sNhKPMEdG3qwEftvBAW7cHms0.jpg", width: 480 },
      { label: "Wf24", src: "assets/yCtJNEDXvgttNEgd6tblX1Vn4.png", width: 872 },
      { label: "Training", src: "assets/dB8bsoYZnSuIFfmy5avRx2LyB8.png", width: 680 },
      { label: "Rl-th", src: "assets/7k18PGvXtVfTMQ7fKG0qOvBPc.png", width: 649 },
      { label: "Hkt-edc1", src: "assets/4agzThVBQJLnheOkwfAizh49p74.png", width: 351 },
      { label: "Wf24", src: "assets/yCtJNEDXvgttNEgd6tblX1Vn4.png", width: 872 },
      { label: "WhatsApp Image 2026-03-19 at 9.28.27 AM", src: "assets/nOiBYW74uqLytAoFCFwn40gyk8.jpeg", width: 540 },
      { label: "Hkt-redact", src: "assets/imCgZ5mA0dkm0GiT8681nrE8y8w.png", width: 800 }
    ]},
    contact: { kicker: "GET IN TOUCH", titleLine1: "SAFETY FOR", titleEmphasis: "YOUR", titleLine2: "STAGE.", note: "Tell us what's ahead. We'll help define the safest way through it.", location: "BANGKOK, THAILAND", email: "hello@allsecure.group" },
    footer: { copyright: "© All Secure Group Co., Ltd. 2026" }
  };

  // Merge fetched content over defaults (deep for known shapes)
  function getVal(obj, path) {
    return path.split(".").reduce(function (o, k) { return (o == null ? undefined : o[k]); }, obj);
  }

  function setText(el, text) {
    if (el == null) return;
    // preserve inner emphasis/br structure? We only replace plain text nodes.
    el.innerHTML = "";
    el.appendChild(document.createTextNode(text));
  }

  // Reassemble the contact email at runtime from its parts so the full address
  // never appears as a single contiguous string in the delivered markup. This
  // deters naive regex scrapers; it is not a substitute for a spam filter.
  function assembleEmail(c) {
    var raw = c && c.contact && c.contact.email;
    if (typeof raw !== "string" || !raw) return;
    var at = raw.lastIndexOf("@");
    if (at < 1) return;
    var local = raw.slice(0, at);
    var domain = raw.slice(at + 1);
    var el = document.getElementById("contact-email");
    if (!el) return;
    var full = local + "@" + domain;
    el.textContent = full;
    el.setAttribute("href", "mai" + "lto:" + local + "@" + domain);
    el.removeAttribute("target");
  }

  function applyContent(c) {
    // Simple text fields
    document.querySelectorAll("[data-edit]").forEach(function (el) {
      var v = getVal(c, el.getAttribute("data-edit"));
      if (typeof v === "string" && v.length) el.textContent = v;
    });

    assembleEmail(c);

    // Multiline headings (Arrays of lines joined by <br>)
    document.querySelectorAll("[data-edit-multiline]").forEach(function (el) {
      var base = getVal(c, el.getAttribute("data-edit-multiline"));
      if (!base) return;
      var lines = [];
      if (typeof base === "object" && "titleLine1" in base) {
        lines = [base.titleLine1, base.titleLine2].filter(Boolean);
      }
      if (lines.length) {
        el.innerHTML = "";
        lines.forEach(function (line, i) {
          if (i > 0) el.appendChild(document.createElement("br"));
          var tn = document.createTextNode(line);
          el.appendChild(tn);
        });
      }
    });

    // Contact title: line1 + <em>emphasis</em> + line2
    var ct = c.contact;
    if (ct) {
      var contactTitle = document.querySelector(".contact-copy h2[data-edit-contact-title]");
      if (contactTitle) {
        contactTitle.innerHTML = "";
        if (ct.titleLine1) contactTitle.appendChild(document.createTextNode(ct.titleLine1 + " "));
        var em = document.createElement("em");
        em.textContent = ct.titleEmphasis || "";
        contactTitle.appendChild(em);
        if (ct.titleLine2) contactTitle.appendChild(document.createTextNode(" " + ct.titleLine2));
      }
    }

    // Images
    document.querySelectorAll("[data-edit-img]").forEach(function (el) {
      var key = el.getAttribute("data-key");
      var src = getVal(c, key);
      if (typeof src === "string" && src) {
        var img = el.querySelector("img");
        if (img) img.src = src;
      }
    });

    // Link hrefs
    document.querySelectorAll("[data-key]").forEach(function (el) {
      if (el.hasAttribute("data-edit-img")) return;
      var v = getVal(c, el.getAttribute("data-key"));
      if (typeof v === "string" && v) el.setAttribute("href", v);
    });

    // Capabilities
    var caps = c.operatingModel && c.operatingModel.capabilities;
    var capsEl = document.getElementById("capabilities");
    if (caps && Array.isArray(caps) && capsEl) {
      capsEl.innerHTML = "";
      caps.forEach(function (cap) {
        var card = document.createElement("div");
        card.className = "cap-card";
        var img = document.createElement("img");
        img.className = "cap-icon";
        img.src = cap.icon || "";
        img.alt = "";
        var body = document.createElement("div");
        body.className = "cap-body";
        var h = document.createElement("p");
        h.className = "txt-cap-title";
        h.textContent = cap.title || "";
        var p = document.createElement("p");
        p.className = "txt-cap-copy";
        p.textContent = cap.description || "";
        body.appendChild(h); body.appendChild(p);
        card.appendChild(img); card.appendChild(body);
        capsEl.appendChild(card);
      });
    }

    // Carousel slides
    var slides = c.gallery && c.gallery.slides;
    var track = document.getElementById("carousel-track");
    if (slides && Array.isArray(slides) && track) {
      track.innerHTML = "";
      slides.forEach(function (s, i) {
        var li = document.createElement("li");
        li.className = "carousel-slide w" + (s.width || 400);
        li.setAttribute("aria-label", (i + 1) + " of " + slides.length);
        var img = document.createElement("img");
        img.src = s.src || "";
        img.alt = s.label || "";
        li.appendChild(img);
        track.appendChild(li);
      });
      initCarousel(track);
    }
  }

  /* ---------- Carousel scroll control ---------- */
  function initCarousel(track) {
    var prev = document.querySelector(".carousel-btn.prev");
    var next = document.querySelector(".carousel-btn.next");

    // Gap between slides is fixed at 16px in styles.css.
    var GAP = 16;

    // Step by the width of the first (target) slide so we always land on a
    // slide boundary and never fight the scroll-snap rules.
    function slideExtent() {
      var slide = track.querySelector(".carousel-slide");
      return slide ? Math.round(slide.getBoundingClientRect().width + GAP) : 640;
    }

    // Manual animation loop. Unlike `scrollBy(behavior:"smooth")`, this is not
    // cancelled by an in-flight scroll-snap, so rapid/repeated clicks always land.
    var raf = 0;
    function animateTo(target) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      var start = track.scrollLeft;
      var dist = target - start;
      if (Math.abs(dist) < 1) return;
      var dur = 320, t0 = null;
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        track.scrollLeft = start + dist * eased;
        if (p < 1) raf = requestAnimationFrame(frame);
        else raf = 0;
      }
      raf = requestAnimationFrame(frame);
    }

    var moveBy = function (dir) {
      var slides = track.querySelectorAll(".carousel-slide");
      if (!slides.length) return;
      // True left edge (in scroll coordinates) of each slide, relative to the track.
      var trackLeft = track.getBoundingClientRect().left;
      var scrollLeft = track.scrollLeft;
      var edges = [];
      slides.forEach(function (s) {
        edges.push(Math.round(s.getBoundingClientRect().left - trackLeft + scrollLeft));
      });
      var target = -1;
      if (dir > 0) {
        // land on the next slide edge strictly ahead of the current scroll position
        for (var i = 0; i < edges.length; i++) {
          if (edges[i] > scrollLeft + 1) { target = edges[i]; break; }
        }
        if (target < 0) target = track.scrollWidth; // already at the end
      } else {
        // back to the previous slide edge before the current position
        for (var j = edges.length - 1; j >= 0; j--) {
          if (edges[j] < scrollLeft - 1) { target = edges[j]; break; }
        }
        if (target < 0) target = 0;
      }
      var max = track.scrollWidth - track.clientWidth;
      animateTo(Math.max(0, Math.min(target, max)));
    };

    if (next) next.addEventListener("click", function () { moveBy(1); });
    if (prev) prev.addEventListener("click", function () { moveBy(-1); });

    track.addEventListener("scroll", function () {
      if (!prev) return;
      prev.style.opacity = track.scrollLeft > 10 ? "1" : "0";
      prev.style.pointerEvents = track.scrollLeft > 10 ? "auto" : "none";
    }, { passive: true });
  }

  /* ---------- Load content.json (optional) ---------- */
  function load() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "content.json", true);
    xhr.onload = function () {
      var merged = JSON.parse(JSON.stringify(DEFAULTS));
      if (xhr.status === 200) {
        try { var data = JSON.parse(xhr.responseText); deepMerge(merged, data); }
        catch (e) { /* fall back to defaults */ }
      }
      applyContent(merged);
    };
    xhr.onerror = function () { applyContent(DEFAULTS); };
    xhr.send();
  }

  function deepMerge(target, src) {
    if (src == null || typeof src !== "object") return target;
    Object.keys(src).forEach(function (k) {
      if (src[k] != null && typeof src[k] === "object" && !Array.isArray(src[k]) && typeof target[k] === "object") {
        deepMerge(target[k], src[k]);
      } else {
        target[k] = src[k];
      }
    });
    return target;
  }

  // Render inline defaults immediately (no flash), then sync from json.
  applyContent(DEFAULTS);
  if (typeof fetch !== "undefined" && window.location.protocol !== "file:") {
    load();
  }

  // Live-preview hook: the admin editor posts edited content here so the
  // preview iframe updates in real time without needing a server.
  window.addEventListener("message", function (ev) {
    var msg = ev.data;
    if (msg && msg.type === "allsecure-apply") {
      var merged = JSON.parse(JSON.stringify(DEFAULTS));
      deepMerge(merged, msg.content || {});
      applyContent(merged);
    }
  });
})();
