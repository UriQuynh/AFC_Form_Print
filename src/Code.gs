/**
 * Điểm vào web app + menu trên Google Sheet.
 *
 * URL:
 *   <exec>                       -> Form nhập liệu (lập phiếu, danh sách, báo cáo)
 *   <exec>?page=print&px=<ID>    -> Phiếu xuất kho A4 (BM-04/KH-SX), có QR góc phải
 *   <exec>?page=bienban&px=<ID>  -> Biên bản giao nhận A4
 *   <exec>?page=tem&px=<ID>[&cuon=<mã>][&loai=kcs|coa]
 *                                -> Tem KCS (BM-18, A5 ngang) + phiếu COA (A5 dọc)
 */

function doGet(e) {
  var lic = licenseStatus_();
  if (!lic.ok) {
    return HtmlService.createHtmlOutput(licensePageHtml_(lic)).setTitle('Bản sao chưa được cấp phép');
  }
  var params = (e && e.parameter) || {};
  var page = String(params.page || 'form').toLowerCase();
  rememberWebAppUrl_();
  var file = { form: 'Index', print: 'Print', bienban: 'Print', tem: 'Tem' }[page] || 'Index';
  var tpl = HtmlService.createTemplateFromFile(file);
  tpl.boot = bootScript_(getBoot_(page, params));
  var title = { form: 'Phiếu xuất kho · Giấy A.F.C', print: 'In phiếu xuất kho', bienban: 'Biên bản giao nhận', tem: 'Tem KCS & COA' }[page] || APP.NAME;
  return tpl.evaluate()
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Dữ liệu nhúng sẵn vào trang (tránh 1 vòng gọi google.script.run khi mở trang in). */
function getBoot_(page, params) {
  var boot = { page: page, params: params, config: getConfig_(), webAppUrl: webAppUrl_() };
  if (page === 'print' || page === 'bienban' || page === 'tem') {
    boot.phieu = params.px ? getPhieu(String(params.px)) : null;
  }
  return boot;
}

function bootScript_(obj) {
  var LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
  var json = JSON.stringify(obj).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
  return '<script>window.__BOOT__=' + json + ';</script>';
}

/** Ghép file HTML con (css_*, js_*, lib_*) vào trang: dùng scriptlet include('tên') trong file HTML. */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// ===================== Menu trên Google Sheet =====================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('AFC Form');
  // Chưa cấp phép (bản sao): chỉ còn menu Bản quyền. code 'error' (simple trigger không đọc được
  // Properties) thì vẫn dựng menu đủ — mọi thao tác ghi đều kiểm lại bản quyền khi chạy.
  var lic = licenseStatus_();
  if (lic.ok || lic.code === 'error') {
    menu
      .addItem('Nhập PXK: In phiếu (lưu + in)', 'pxkPrint')
      .addItem('Nhập PXK: Phiếu mới', 'pxkNew')
      .addItem('Nhập PXK: Mở phiếu theo số', 'pxkLoad')
      .addSeparator()
      .addItem('Mở form nhập liệu (web app)', 'menuOpenForm_')
      .addItem('In phiếu đang chọn (dòng ở sheet PhieuXuat)', 'menuPrintSelected_')
      .addSeparator()
      .addItem('Cài đặt / cập nhật cấu trúc sheet', 'setupSheets')
      .addItem('Thêm dữ liệu mẫu (demo)', 'seedDemoData')
      .addSeparator();
  } else {
    try { SpreadsheetApp.getActive().toast('Bản sao chưa được cấp phép. Vào AFC Form → Bản quyền để kích hoạt, hoặc liên hệ ' + LICENSE.CONTACT + '.', 'AFC Form', 15); } catch (e) { /* không có toast */ }
  }
  menu.addSubMenu(licenseSubMenu_(ui)).addToUi();
}

function menuOpenForm_() {
  if (!licenseGuardUi_()) return;
  var url = webAppUrl_();
  if (!url) {
    SpreadsheetApp.getUi().alert('Chưa deploy web app. Vào Tiện ích mở rộng → Apps Script → Triển khai → Tùy chọn triển khai mới → Ứng dụng web.');
    return;
  }
  openUrlDialog_(url, 'Mở form nhập liệu');
}

function menuPrintSelected_() {
  if (!licenseGuardUi_()) return;
  var sh = SpreadsheetApp.getActiveSheet();
  var ui = SpreadsheetApp.getUi();
  if (sh.getName() !== 'PhieuXuat' && sh.getName() !== 'ChiTiet') {
    ui.alert('Chọn 1 dòng ở sheet PhieuXuat (hoặc ChiTiet) rồi bấm lại.');
    return;
  }
  var t = readTable_(sh.getName());
  var row = sh.getActiveRange().getRow();
  var key = sh.getName() === 'PhieuXuat' ? 'id' : 'phieuId';
  var hit = t.rows.filter(function (r) { return r._row === row; })[0];
  if (!hit || !hit[key]) { ui.alert('Dòng đang chọn không có ID phiếu.'); return; }
  var url = webAppUrl_();
  if (!url) { ui.alert('Chưa deploy web app.'); return; }
  openUrlDialog_(url + '?page=print&px=' + encodeURIComponent(hit[key]), 'In phiếu ' + hit.so);
}

function openUrlDialog_(url, title) {
  var safe = String(url).replace(/"/g, '&quot;');
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial;padding:8px"><p><a href="' + safe + '" target="_blank" ' +
    'style="font-size:16px">' + title + ' ↗</a></p>' +
    '<script>var w=window.open("' + safe + '","_blank");if(w)google.script.host.close();</script></div>'
  ).setWidth(360).setHeight(90);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}
