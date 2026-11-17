/* Chạy trong trình duyệt (chỉ bản preview): giả lập google.script.run + window.__BOOT__. */
(function () {
  'use strict';
  var KEY = 'afc_preview_sheets_v1';
  var gas = FakeGas.createFakeGas({ email: 'demo@preview' });
  gas.install(window);

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  if (saved) {
    try { gas.load(saved); } catch (e) { saved = null; }
  }
  if (!saved) {
    setupSheets();
    seedDemoData();
    persist();
  }
  function persist() { try { localStorage.setItem(KEY, gas.serialize()); } catch (e) { /* ignore */ } }

  function assertNoDate(o, where) {
    if (o instanceof Date) throw new Error('Server trả về Date tại ' + where + ' — Apps Script sẽ trả null cho cả kết quả!');
    if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { assertNoDate(o[k], where + '.' + k); });
  }

  function runner(ok, fail) {
    return new Proxy({}, {
      get: function (_t, name) {
        if (name === 'withSuccessHandler') return function (f) { return runner(f, fail); };
        if (name === 'withFailureHandler') return function (f) { return runner(ok, f); };
        return function () {
          var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));
          setTimeout(function () {
            try {
              if (typeof window[name] !== 'function') throw new Error('Không có hàm server: ' + name);
              var res = window[name].apply(null, args);
              assertNoDate(res, name);
              persist();
              if (ok) ok(res === undefined ? null : JSON.parse(JSON.stringify(res)));
            } catch (e) {
              console.error(e);
              if (fail) fail(e); else throw e;
            }
          }, 120);
        };
      },
    });
  }
  window.google = { script: { run: runner(null, null) } };

  var params = {};
  new URLSearchParams(location.search).forEach(function (v, k) { params[k] = v; });
  // tiện cho preview / chụp PDF: ?so=230/11 thay cho ?px=<ID>
  if (!params.px && params.so) {
    var hit = listPhieu({ q: params.so }).filter(function (p) { return p.so === params.so; })[0];
    if (hit) params.px = hit.id;
  }
  var page = params.page || window.__PREVIEW_PAGE__;
  window.__BOOT__ = JSON.parse(JSON.stringify(getBoot_(page, params)));

  // Nút reset dữ liệu demo
  window.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('button');
    b.textContent = 'Reset dữ liệu demo';
    b.title = 'Bản xem trước: xoá dữ liệu giả lập trong trình duyệt';
    b.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;font:12px sans-serif;padding:4px 8px;border-radius:6px;border:1px solid #ccc;background:#fff;opacity:.7;cursor:pointer';
    b.className = 'noprint hide-print';
    b.onclick = function () {
      if (!confirm('Xoá toàn bộ dữ liệu preview và tạo lại dữ liệu mẫu?')) return;
      try { localStorage.removeItem(KEY); localStorage.removeItem('afc_px_draft_v1'); } catch (e) { /* ignore */ }
      location.href = location.pathname.replace(/[^/]*$/, 'index.html');
    };
    document.body.append(b);
  });
})();
