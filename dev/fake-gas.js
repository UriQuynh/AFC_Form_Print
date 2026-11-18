/*
 * Giả lập tối thiểu các dịch vụ Google Apps Script (SpreadsheetApp, Utilities, ...)
 * để chạy CHÍNH các file src/*.gs trong Node (test) và trong trình duyệt (preview).
 * Không dùng khi deploy thật.
 */
(function (root) {
  'use strict';

  function chain(name) {
    // Proxy trả về chính nó cho mọi method chưa giả lập (định dạng, độ rộng cột, ...)
    const fn = function () { return p; };
    const p = new Proxy(fn, {
      get(_t, k) {
        if (k === 'build') return () => ({ __rule: name });
        if (k === Symbol.toPrimitive) return () => `[${name}]`;
        return () => p;
      },
      apply() { return p; },
    });
    return p;
  }

  function colToNum(s) { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }

  class Sheet {
    constructor(ss, name, id) { this.ss = ss; this.name = name; this.id = id; this.data = []; this.formulas = {}; this.maxCols = 26; this.maxRows = 1000; this.images = []; }
    getName() { return this.name; }
    getSheetId() { return this.id; }
    getLastRow() {
      for (let r = this.data.length - 1; r >= 0; r--) if ((this.data[r] || []).some((v) => v !== '' && v != null)) return r + 1;
      return 0;
    }
    getLastColumn() {
      let m = 0;
      this.data.forEach((row) => { if (!row) return; for (let c = row.length - 1; c >= 0; c--) if (row[c] !== '' && row[c] != null) { m = Math.max(m, c + 1); break; } });
      return m;
    }
    getMaxColumns() { return Math.max(this.maxCols, this.getLastColumn()); }
    getMaxRows() { return this.maxRows; }
    insertColumnsAfter(_after, n) { this.maxCols += n; return this; }
    get(r, c) { return (this.data[r - 1] || [])[c - 1] ?? ''; }
    set(r, c, v) {
      while (this.data.length < r) this.data.push([]);
      const row = this.data[r - 1];
      while (row.length < c) row.push('');
      row[c - 1] = v;
    }
    getRange(a, b, c, d) {
      if (typeof a === 'string') {
        const m = a.replace(/^.*!/, '').match(/^([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/);
        if (!m) throw new Error('A1 không hỗ trợ: ' + a);
        const c1 = colToNum(m[1]), r1 = m[2] ? Number(m[2]) : 1;
        const c2 = m[3] ? colToNum(m[3]) : c1;
        const r2 = m[3] ? (m[4] ? Number(m[4]) : this.maxRows) : r1;
        return new Range(this, r1, c1, r2 - r1 + 1, c2 - c1 + 1);
      }
      return new Range(this, a, b, c || 1, d || 1);
    }
    getDataRange() { return this.getRange(1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
    getActiveRange() { return this.getRange(2, 1); }
    deleteRows(start, n) { this.data.splice(start - 1, n); return this; }
    deleteRow(r) { return this.deleteRows(r, 1); }
    appendRow(vals) { this.getRange(this.getLastRow() + 1, 1, 1, vals.length).setValues([vals]); return this; }
    clear() { this.data = []; this.formulas = {}; return this; }
    getImages() { return this.images.slice(); }
    insertImage(_blob, col, row) {
      const sh = this;
      const img = { col, row, script: '', w: 0, h: 0,
        assignScript(f) { this.script = f; return this; }, getScript() { return this.script; },
        setWidth(w) { this.w = w; return this; }, setHeight(h) { this.h = h; return this; }, setAltTextTitle() { return this; },
        remove() { sh.images.splice(sh.images.indexOf(img), 1); } };
      this.images.push(img);
      return img;
    }
  }
  // các method định dạng của Sheet -> no-op chain
  ['setFrozenRows', 'setColumnWidth', 'setColumnWidths', 'setRowHeight', 'hideColumns', 'setTabColor', 'autoResizeColumns'].forEach((k) => {
    Sheet.prototype[k] = function () { return this; };
  });

  class Range {
    constructor(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
    getRow() { return this.r; }
    getColumn() { return this.c; }
    getNumRows() { return this.nr; }
    getNumColumns() { return this.nc; }
    getValues() {
      const out = [];
      for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.get(this.r + i, this.c + j)); out.push(row); }
      return out;
    }
    getValue() { return this.sh.get(this.r, this.c); }
    setValues(v) {
      if (v.length !== this.nr || v.some((row) => row.length !== this.nc)) {
        throw new Error(`setValues: kích thước ${v.length}x${v[0] && v[0].length} khác range ${this.nr}x${this.nc}`);
      }
      v.forEach((row, i) => row.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x)));
      return this;
    }
    setValue(x) { this.sh.set(this.r, this.c, x); return this; }
    setFormula(f) {
      this.sh.formulas[`${this.r},${this.c}`] = f;
      // mô phỏng dò dấu ngăn đối số theo ngôn ngữ bảng tính
      const val = f === '=SUM(1,2)' ? (this.sh.ss.formulaSep === ';' ? '#ERROR!' : 3) : '';
      this.sh.set(this.r, this.c, val);
      return this;
    }
    getFormula() { return this.sh.formulas[`${this.r},${this.c}`] || ''; }
    offset(dr, dc, nr, nc) { return new Range(this.sh, this.r + dr, this.c + dc, nr || this.nr, nc || this.nc); }
    clear() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) { this.sh.set(this.r + i, this.c + j, ''); delete this.sh.formulas[`${this.r + i},${this.c + j}`]; } return this; }
    clearContent() { return this.clear(); }
    getSheet() { return this.sh; }
    getA1Notation() {
      const L = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
      const a = L(this.c) + this.r;
      return this.nr === 1 && this.nc === 1 ? a : a + ':' + L(this.c + this.nc - 1) + (this.r + this.nr - 1);
    }
  }
  ['setNumberFormat', 'setFontWeight', 'setBackground', 'setWrap', 'setVerticalAlignment', 'setFontSize', 'setFontColor',
    'setDataValidation', 'clearDataValidations', 'merge', 'setFontStyle', 'setFontFamily', 'activate', 'insertCheckboxes', 'setHorizontalAlignment', 'setBorder'].forEach((k) => {
    Range.prototype[k] = function () { return this; };
  });

  class Spreadsheet {
    constructor(formulaSep, id) { this.sheets = []; this.nextId = 1; this.active = null; this.formulaSep = formulaSep || ','; this.id = id || 'FAKE_SPREADSHEET'; }
    getId() { return this.id; }
    getOwner() { return this.owner ? { getEmail: () => this.owner } : null; }
    getUrl() { return 'https://docs.google.com/spreadsheets/d/FAKE/edit'; }
    getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
    getSheets() { return this.sheets.slice(); }
    insertSheet(n) {
      if (this.getSheetByName(n)) throw new Error('Sheet đã có: ' + n);
      const s = new Sheet(this, n, this.nextId++); this.sheets.push(s); return s;
    }
    deleteSheet(s) { this.sheets.splice(this.sheets.indexOf(s), 1); }
    setActiveSheet(s) { this.active = s; return s; }
    getActiveSheet() { return this.active || this.sheets[0]; }
    moveActiveSheet(i) {
      const s = this.getActiveSheet(); this.sheets.splice(this.sheets.indexOf(s), 1); this.sheets.splice(i - 1, 0, s);
    }
    setSpreadsheetTimeZone() {}
    toast() {}
  }

  function pad(n, w) { return String(n).padStart(w, '0'); }
  function formatDate(d, _tz, pattern) {
    // Dùng giờ máy (đặt TZ=Asia/Ho_Chi_Minh khi chạy test).
    if (!(d instanceof Date)) d = new Date(d);
    const map = { yyyy: d.getFullYear(), yy: pad(d.getFullYear() % 100, 2), MM: pad(d.getMonth() + 1, 2), dd: pad(d.getDate(), 2), HH: pad(d.getHours(), 2), mm: pad(d.getMinutes(), 2), ss: pad(d.getSeconds(), 2) };
    return pattern.replace(/yyyy|yy|MM|dd|HH|mm|ss/g, (t) => map[t]);
  }

  function uuid() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });
  }

  // ---- Lưu/khôi phục (preview trong trình duyệt dùng localStorage) ----
  function serialize(ss) {
    return JSON.stringify(ss.sheets.map((s) => ({
      name: s.name, id: s.id, maxCols: s.maxCols, formulas: s.formulas,
      data: s.data.map((row) => (row || []).map((v) => (v instanceof Date ? { __d: v.getTime() } : v))),
    })));
  }
  function deserialize(json) {
    const ss = new Spreadsheet();
    JSON.parse(json).forEach((o) => {
      const s = new Sheet(ss, o.name, o.id);
      s.maxCols = o.maxCols; s.formulas = o.formulas || {};
      s.data = o.data.map((row) => row.map((v) => (v && typeof v === 'object' && '__d' in v ? new Date(v.__d) : v)));
      ss.sheets.push(s); ss.nextId = Math.max(ss.nextId, s.id + 1);
    });
    return ss;
  }

  // Giao diện giả lập (menu / alert / prompt) để test onOpen và các lệnh menu. Bật bằng opts.ui = true.
  function createFakeUi() {
    const ui = { menus: [], alerts: [], toasts: [], prompts: [], promptReplies: [], confirmReplies: [] };
    const Button = { OK: 'OK', YES: 'YES', NO: 'NO', CANCEL: 'CANCEL' };
    function makeMenu(name) {
      const m = { name, items: [] };
      m.addItem = (label, fn) => { m.items.push({ label, fn }); return m; };
      m.addSeparator = () => m;
      m.addSubMenu = (sub) => { m.items.push({ label: sub.name, sub }); return m; };
      m.addToUi = () => { ui.menus.push(m); return m; };
      return m;
    }
    ui.createMenu = makeMenu;
    ui.ButtonSet = { OK: 'OK', OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO' };
    ui.Button = Button;
    // alert(title?, message?, buttons?) -> nút trả lời (YES_NO lấy từ confirmReplies, mặc định YES)
    ui.alert = (a, b, c) => {
      const buttons = c || (typeof b === 'string' ? undefined : b);
      ui.alerts.push({ title: b !== undefined && typeof b === 'string' ? a : '', message: b !== undefined && typeof b === 'string' ? b : a, buttons });
      return buttons === 'YES_NO' ? (ui.confirmReplies.length ? ui.confirmReplies.shift() : 'YES') : 'OK';
    };
    ui.prompt = (title, msg) => {
      ui.prompts.push({ title, message: msg });
      const text = ui.promptReplies.length ? ui.promptReplies.shift() : null;
      return { getSelectedButton: () => (text === null ? 'CANCEL' : 'OK'), getResponseText: () => text || '' };
    };
    ui.showModalDialog = () => {};
    return ui;
  }

  // SHA-512/256 thật chỉ có khi chạy trong Node (test). Như Apps Script: trả mảng byte CÓ DẤU (-128..127).
  function computeDigest(alg, value) {
    if (typeof require === 'undefined') throw new Error('computeDigest chỉ có trong Node');
    const bytes = typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value.map((v) => {
      if (!Number.isInteger(v) || v < -128 || v > 127) throw new Error('computeDigest: byte ngoài -128..127: ' + v);
      return v & 255;
    }));
    const name = { SHA_256: 'sha256', SHA_512: 'sha512', MD5: 'md5', SHA_1: 'sha1' }[alg];
    if (!name) throw new Error('Thuật toán không hỗ trợ: ' + alg);
    return Array.from(require('crypto').createHash(name).update(bytes).digest()).map((v) => (v > 127 ? v - 256 : v));
  }

  function createFakeGas(opts) {
    opts = opts || {};
    let ss = opts.spreadsheet || new Spreadsheet(opts.formulaSep, opts.spreadsheetId);
    const props = {};
    const ui = opts.ui ? createFakeUi() : null;
    // HtmlService: createHtmlOutput giữ lại nội dung để test đọc; phần còn lại là no-op chain.
    const htmlChain = chain('HtmlService');
    const htmlService = new Proxy({}, {
      get(_t, k) {
        if (k !== 'createHtmlOutput') return htmlChain[k];
        return (html) => {
          const out = { html: String(html), title: '' };
          ['setWidth', 'setHeight', 'addMetaTag', 'setXFrameOptionsMode'].forEach((m) => { out[m] = () => out; });
          out.setTitle = (t) => { out.title = t; return out; };
          out.getContent = () => out.html;
          return out;
        };
      },
    });
    const env = {
      SpreadsheetApp: {
        getActiveSpreadsheet: () => ss,
        getActive: () => ss,
        openById: () => ss,
        getActiveSheet: () => ss.getActiveSheet(),
        getUi: () => { if (!ui) throw new Error('No UI in fake'); return ui; },
        flush: () => {},
        newDataValidation: () => chain('DataValidation'),
      },
      Utilities: { formatDate, getUuid: uuid, base64Decode: (s) => s, newBlob: (b) => ({ bytes: b }), computeDigest, DigestAlgorithm: { SHA_256: 'SHA_256', SHA_512: 'SHA_512', MD5: 'MD5', SHA_1: 'SHA_1' } },
      Session: {
        getScriptTimeZone: () => 'Asia/Ho_Chi_Minh',
        getActiveUser: () => ({ getEmail: () => opts.email || 'demo@local' }),
      },
      LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
      PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => Object.assign({}, props) }) },
      ScriptApp: { getService: () => ({ getUrl: () => opts.webAppUrl || '' }) },
      HtmlService: htmlService,
    };
    return {
      env,
      get spreadsheet() { return ss; },
      props,
      ui,
      set spreadsheet(v) { ss = v; },
      serialize: () => serialize(ss),
      load: (json) => { ss = deserialize(json); },
      install(target) { Object.assign(target, env); return env; },
    };
  }

  const api = { createFakeGas, Spreadsheet, formatDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FakeGas = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
