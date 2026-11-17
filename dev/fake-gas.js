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
    constructor(ss, name, id) { this.ss = ss; this.name = name; this.id = id; this.data = []; this.formulas = {}; this.maxCols = 26; this.maxRows = 1000; }
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
  }
  // các method định dạng của Sheet -> no-op chain
  ['setFrozenRows', 'setColumnWidth', 'setColumnWidths', 'hideColumns', 'setTabColor', 'autoResizeColumns'].forEach((k) => {
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
  }
  ['setNumberFormat', 'setFontWeight', 'setBackground', 'setWrap', 'setVerticalAlignment', 'setFontSize', 'setFontColor',
    'setDataValidation', 'clearDataValidations', 'insertCheckboxes', 'setHorizontalAlignment', 'setBorder'].forEach((k) => {
    Range.prototype[k] = function () { return this; };
  });

  class Spreadsheet {
    constructor(formulaSep) { this.sheets = []; this.nextId = 1; this.active = null; this.formulaSep = formulaSep || ','; }
    getId() { return 'FAKE_SPREADSHEET'; }
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

  function createFakeGas(opts) {
    opts = opts || {};
    let ss = opts.spreadsheet || new Spreadsheet(opts.formulaSep);
    const props = {};
    const env = {
      SpreadsheetApp: {
        getActiveSpreadsheet: () => ss,
        getActive: () => ss,
        openById: () => ss,
        getActiveSheet: () => ss.getActiveSheet(),
        getUi: () => { throw new Error('No UI in fake'); },
        flush: () => {},
        newDataValidation: () => chain('DataValidation'),
      },
      Utilities: { formatDate, getUuid: uuid },
      Session: {
        getScriptTimeZone: () => 'Asia/Ho_Chi_Minh',
        getActiveUser: () => ({ getEmail: () => opts.email || 'demo@local' }),
      },
      LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
      PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
      ScriptApp: { getService: () => ({ getUrl: () => opts.webAppUrl || '' }) },
      HtmlService: chain('HtmlService'),
    };
    return {
      env,
      get spreadsheet() { return ss; },
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
