(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- Navbar ---------- */
  var nav = $('.nav');
  var solidAlways = document.body.hasAttribute('data-solid-nav');
  function onScroll() { nav.classList.toggle('solid', solidAlways || window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  var burger = $('.burger');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('.links a').forEach(function (a) {
    a.addEventListener('click', function () { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); });
  });

  /* active link on scroll (home only) */
  var secs = $$('main section[id]');
  if (secs.length && 'IntersectionObserver' in window && $('.hero')) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          $$('.links a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Reveal ---------- */
  function initReveal() {
    var els = $$('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .1 });
    els.forEach(function (e) { io.observe(e); });
  }
  initReveal();

  var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Video ---------- */
  var vbox = $('.video');
  if (vbox) {
    var vid = $('video', vbox);
    $('.play', vbox).addEventListener('click', function () {
      vbox.classList.add('playing'); vid.setAttribute('controls', '');
      var p = vid.play(); if (p && p.catch) p.catch(function () {});
    });
    vid.addEventListener('ended', function () { vbox.classList.remove('playing'); vid.removeAttribute('controls'); });
  }

  /* ---------- Foto otomatis dari nama file ---------- */
  var EXTS = ['jpg', 'jpeg', 'png', 'webp'];
  function initCovers(root) {
    $$('img[data-cover]', root || document).forEach(function (img) {
      if (img.getAttribute('data-cover-done')) return;
      img.setAttribute('data-cover-done', '1');
      var cands = [];
      img.getAttribute('data-cover').split(',').forEach(function (s) {
        EXTS.forEach(function (e) { cands.push('assets/tempat/' + s.trim() + '.' + e); });
      });
      (function next(i) {
        if (i >= cands.length) return;
        var probe = new Image();
        probe.onload = function () { img.src = cands[i]; if (probe.naturalHeight > probe.naturalWidth) img.classList.add('portrait'); };
        probe.onerror = function () { next(i + 1); };
        probe.src = cands[i];
      })(0);
    });
  }
  initCovers(document);

  /* ---------- Maps helpers ---------- */
  var enc = encodeURIComponent;
  var mapsSearch = function (q) { return 'https://www.google.com/maps/search/?api=1&query=' + enc(q); };
  var mapsDir = function (q) { return 'https://www.google.com/maps/dir/?api=1&destination=' + enc(q); };
  var mapsEmbed = function (q) { return 'https://www.google.com/maps?q=' + enc(q) + '&output=embed'; };

  /* ---------- Render tempat ---------- */
  var TABS = [['all', 'Semua'], ['food', 'Kuliner'], ['stay', 'Penginapan'], ['local', 'Oleh-oleh'], ['places', 'Wisata'], ['landmark', 'Landmark']];
  function renderPlaces(list) {
    var host = $('#places-grid'); if (!host) return;
    var tabs = $('#place-tabs');
    var present = {}; list.forEach(function (p) { present[p.category] = 1; });
    tabs.innerHTML = TABS.filter(function (t) { return t[0] === 'all' || present[t[0]]; }).map(function (t, i) {
      return '<button class="tab' + (i === 0 ? ' on' : '') + '" type="button" data-f="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    host.innerHTML = list.map(function (p) {
      return '<article class="place reveal in" data-cat="' + esc(p.category) + '"><img data-cover="' + esc((p.cover || [p.id]).join(',')) + '" src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
        '<div class="place-b"><small>' + esc(p.categoryLabel) + '</small><h3>' + esc(p.name) + '</h3><p>' + esc(p.short) + '</p>' +
        '<a class="more" href="tempat.html?id=' + esc(p.id) + '">Lihat detail &rarr;</a></div></article>';
    }).join('');
    initCovers(host);
    tabs.addEventListener('click', function (e) {
      var t = e.target.closest('.tab'); if (!t) return;
      $$('.tab', tabs).forEach(function (x) { x.classList.toggle('on', x === t); });
      var f = t.getAttribute('data-f');
      $$('.place', host).forEach(function (c) { c.classList.toggle('hide', !(f === 'all' || c.getAttribute('data-cat') === f)); });
    });
  }

  /* ---------- Daftar titik peta ---------- */
  function renderMapList(list, siteMap) {
    var ul = $('#map-list'), frame = $('#map-iframe'); if (!ul || !frame) return;
    var items = [{ n: 'Kantor Kelurahan', q: 'Kantor Kelurahan Kakaskasen Satu Tomohon' }]
      .concat(list.filter(function (p) { return p.id !== 'gereja-1000-salib'; }).map(function (p) { return { n: p.name, q: p.mapsQuery || p.name }; }));
    ul.innerHTML = '<li class="on" data-q="">' + '<span><i class="fa-solid fa-location-dot"></i></span>Seluruh Kakaskasen 1</li>' +
      items.map(function (it, i) { return '<li data-q="' + esc(it.q) + '"><span>' + (i + 1) + '</span>' + esc(it.n) + '</li>'; }).join('');
    ul.addEventListener('click', function (e) {
      var li = e.target.closest('li'); if (!li) return;
      $$('li', ul).forEach(function (x) { x.classList.toggle('on', x === li); });
      var q = li.getAttribute('data-q');
      frame.src = q ? mapsEmbed(q) : siteMap.mapsEmbed;
    });
  }

  /* ---------- Halaman detail tempat ---------- */
  function renderDetail(d) {
    var root = $('#place-root'); if (!root) return;
    var id = new URLSearchParams(location.search).get('id');
    var p = d.places.filter(function (x) { return x.id === id; })[0];
    if (!p) { $('#p-missing').hidden = false; $('#p-name').textContent = 'Tempat tidak ditemukan'; return; }
    document.title = p.name + ' — Kelurahan Kakaskasen 1';
    $('#p-cat').textContent = p.categoryLabel; $('#p-name').textContent = p.name; $('#p-short').textContent = p.short;
    var img = $('#p-img'); img.setAttribute('data-cover', (p.cover || [p.id]).join(',')); img.src = p.image; img.alt = p.name; img.hidden = false; initCovers(img.parentNode);
    $('#p-about').innerHTML = (p.about || []).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
    $('#p-sections').innerHTML = (p.sections || []).map(function (s) {
      return '<h3>' + esc(s.title) + '</h3><ul class="chips">' + s.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
    }).join('');
    if (p.note) { var n = $('#p-note'); n.textContent = p.note; n.hidden = false; }
    if (p.sources && p.sources.length) {
      var box = $('#p-src'); $('ul', box).innerHTML = p.sources.map(function (s) { return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a></li>'; }).join(''); box.hidden = false;
    }
    $('#p-facts').innerHTML = (p.facts || []).map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('');
    var q = p.mapsQuery || p.name + ' Tomohon';
    $('#p-open').href = p.maps || mapsSearch(q); $('#p-route').href = mapsDir(q); $('#p-map').src = mapsEmbed(q);
    $('#p-others').innerHTML = d.places.filter(function (x) { return x.id !== p.id; }).slice(0, 3).map(function (o) {
      return '<article class="place"><img data-cover="' + esc((o.cover || [o.id]).join(',')) + '" src="' + esc(o.image) + '" alt="' + esc(o.name) + '" loading="lazy"><div class="place-b"><small>' + esc(o.categoryLabel) + '</small><h3>' + esc(o.name) + '</h3><p>' + esc(o.short) + '</p><a class="more" href="tempat.html?id=' + esc(o.id) + '">Lihat detail &rarr;</a></div></article>';
    }).join('');
    initCovers($('#p-others'));
  }

  /* ---------- Muat data ---------- */
  if ($('#places-grid') || $('#map-list') || $('#place-root')) {
    fetch('data/data.json').then(function (r) { return r.json(); }).then(function (d) {
      renderDetail(d);
      renderPlaces(d.places);
      renderMapList(d.places, d.site);
    }).catch(function () {
      var n = $('#data-note'); if (n) n.hidden = false;
    });
  }
})();
