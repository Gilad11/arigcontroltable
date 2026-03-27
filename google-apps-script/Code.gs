/**
 * Google Apps Script — Personnel Manager API
 *
 * Deploy as Web App:
 *   1. Open Google Sheets → Extensions → Apps Script
 *   2. Paste this entire code into Code.gs
 *   3. Click Deploy → New Deployment → Web App
 *   4. Set "Execute as" = Me, "Who has access" = Anyone
 *   5. Copy the deployment URL → paste into .env VITE_GOOGLE_SCRIPT_URL
 *
 * Column order:
 *   מס"ד, גוף, דרגה, Rank, שם מלא, Full Name, מ.א, ת.ז, דרכון, ת. לידה, טלפון, ביקורת דרכונים, קבוצה, מלון
 */

const SHEET_NAME = 'Personnel';

/* ─── Column definitions (order matters for the sheet layout) ─── */
const COLUMNS = [
  { key: 'id',              hebrew: 'מס"ד' },
  { key: 'organization',    hebrew: 'גוף' },
  { key: 'rankHebrew',      hebrew: 'דרגה' },
  { key: 'rankEnglish',     hebrew: 'Rank' },
  { key: 'fullNameHebrew',  hebrew: 'שם מלא' },
  { key: 'fullNameEnglish', hebrew: 'Full Name' },
  { key: 'personalId',      hebrew: 'מ.א' },
  { key: 'nationalId',      hebrew: 'ת.ז' },
  { key: 'passportNumber',  hebrew: 'דרכון' },
  { key: 'birthDate',       hebrew: 'ת. לידה' },
  { key: 'phone',           hebrew: 'טלפון' },
  { key: 'passportControl', hebrew: 'ביקורת דרכונים' },
  { key: 'group',           hebrew: 'קבוצה' },
  { key: 'hotel',           hebrew: 'מלון' },
];

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    setupSheet_(sheet);
  } else {
    // Auto-migrate: if row 2 doesn't have technical keys, insert them
    migrateIfNeeded_(sheet);
  }
  return sheet;
}

/** Check if sheet needs migration from 1-header-row to 2-header-row format */
function migrateIfNeeded_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return; // empty sheet

  const row2 = sheet.getRange(2, 1, 1, Math.min(lastCol, COLUMNS.length)).getValues()[0];
  // If row 2 already has the technical key 'id' in the first cell, no migration needed
  if (String(row2[0]).trim() === 'id') return;

  // Insert a new row 2 with technical keys, shifting existing data down
  sheet.insertRowBefore(2);
  const techHeaders = COLUMNS.map(c => c.key);
  sheet.getRange(2, 1, 1, techHeaders.length).setValues([techHeaders]);
  sheet.getRange(2, 1, 1, techHeaders.length)
    .setFontSize(8)
    .setFontColor('#94a3b8')
    .setBackground('#f1f5f9')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(2);
}

/** Create headers with Hebrew display names and formatting */
function setupSheet_(sheet) {
  const techHeaders = COLUMNS.map(c => c.key);
  const hebrewHeaders = COLUMNS.map(c => c.hebrew);
  const numCols = COLUMNS.length;

  // Row 1: Hebrew display names (what the user sees)
  sheet.getRange(1, 1, 1, numCols).setValues([hebrewHeaders]);
  sheet.getRange(1, 1, 1, numCols)
    .setFontWeight('bold')
    .setBackground('#4338ca')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center')
    .setFontSize(10);

  // Row 2: Technical keys (used by the API — hidden via row height)
  sheet.getRange(2, 1, 1, numCols).setValues([techHeaders]);
  sheet.getRange(2, 1, 1, numCols)
    .setFontSize(8)
    .setFontColor('#94a3b8')
    .setBackground('#f1f5f9')
    .setHorizontalAlignment('center');

  // Freeze top 2 rows
  sheet.setFrozenRows(2);
  sheet.setRightToLeft(true);

  // Set reasonable column widths
  // מס"ד, גוף, דרגה, Rank, שם מלא, Full Name, מ.א, ת.ז, דרכון, ת.לידה, טלפון, ביק.דרכ, קבוצה, מלון
  const widths = [60, 120, 80, 80, 140, 140, 90, 100, 100, 100, 120, 120, 120, 120];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
}

function getHeaders(sheet) {
  // Read technical headers from row 2
  return sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    // Pass passportControl as raw string so frontend can check for "החלקה"
    obj[h] = row[i] !== undefined && row[i] !== null ? String(row[i]) : '';
  });
  return obj;
}

function objectToRow(headers, obj) {
  return headers.map(h => {
    return obj[h] !== undefined && obj[h] !== null ? String(obj[h]) : '';
  });
}

/* ─── GET: Read all personnel ─── */
function doGet(e) {
  try {
    const sheet = getSheet();
    const headers = getHeaders(sheet);
    const lastRow = sheet.getLastRow();

    // Data starts from row 3 (row 1 = Hebrew, row 2 = tech keys)
    if (lastRow <= 2) {
      return jsonResponse({ success: true, data: [] });
    }

    const dataRange = sheet.getRange(3, 1, lastRow - 2, headers.length);
    const rows = dataRange.getValues();
    const data = rows
      .map((row, idx) => {
        const obj = rowToObject(headers, row);
        // Auto-generate id if missing — use row number as fallback
        if (!obj.id || obj.id.trim() === '') {
          obj.id = 'auto-' + (idx + 1) + '-' + Date.now();
          // Write the generated id back to the sheet
          const idCol = headers.indexOf('id') + 1;
          if (idCol > 0) sheet.getRange(idx + 3, idCol).setValue(obj.id);
        }
        return obj;
      })
      // Keep any row that has at least one meaningful field (name, phone, org, etc.)
      .filter(obj => {
        return obj.fullNameHebrew || obj.fullNameEnglish || obj.phone ||
               obj.organization || obj.nationalId || obj.personalId;
      });

    return jsonResponse({ success: true, data: data });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

/* ─── POST: Create / Update / Delete / Sync ─── */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case 'add':
        return handleAdd(body.record);
      case 'update':
        return handleUpdate(body.record);
      case 'delete':
        return handleDelete(body.id);
      case 'sync':
        return handleSync(body.records);
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function handleAdd(record) {
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const row = objectToRow(headers, record);
  sheet.appendRow(row);
  return jsonResponse({ success: true, action: 'added', id: record.id });
}

function handleUpdate(record) {
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const idCol = headers.indexOf('id') + 1;
  const lastRow = sheet.getLastRow();

  for (let r = 3; r <= lastRow; r++) {
    if (sheet.getRange(r, idCol).getValue() == record.id) {
      const row = objectToRow(headers, record);
      sheet.getRange(r, 1, 1, headers.length).setValues([row]);
      return jsonResponse({ success: true, action: 'updated', id: record.id });
    }
  }
  // Not found — add it
  return handleAdd(record);
}

function handleDelete(id) {
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const idCol = headers.indexOf('id') + 1;
  const lastRow = sheet.getLastRow();

  for (let r = lastRow; r >= 3; r--) {
    if (sheet.getRange(r, idCol).getValue() == id) {
      sheet.deleteRow(r);
      return jsonResponse({ success: true, action: 'deleted', id: id });
    }
  }
  return jsonResponse({ success: false, error: 'Record not found: ' + id });
}

function handleSync(records) {
  const sheet = getSheet();
  const headers = getHeaders(sheet);

  // Clear existing data (keep header rows 1-2)
  const lastRow = sheet.getLastRow();
  if (lastRow > 2) {
    sheet.getRange(3, 1, lastRow - 2, headers.length).clear();
  }

  // Write all records starting from row 3
  if (records && records.length > 0) {
    const rows = records.map(r => objectToRow(headers, r));
    sheet.getRange(3, 1, rows.length, headers.length).setValues(rows);
  }

  return jsonResponse({ success: true, action: 'synced', count: records ? records.length : 0 });
}

/* ─── Helpers ─── */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ─── Run once to reset the sheet with new column order ─── */
function resetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const old = ss.getSheetByName(SHEET_NAME);
  if (old) ss.deleteSheet(old);
  const sheet = ss.insertSheet(SHEET_NAME);
  setupSheet_(sheet);
  Logger.log('✅ Sheet recreated with new column order');
  Logger.log('Headers: ' + getHeaders(sheet).join(' | '));
}

/* ─── Test function (run manually) ─── */
function testSetup() {
  const sheet = getSheet();
  Logger.log('Sheet ready: ' + sheet.getName());
  Logger.log('Headers: ' + getHeaders(sheet).join(', '));
  Logger.log('Data rows: ' + Math.max(0, sheet.getLastRow() - 2));
}
