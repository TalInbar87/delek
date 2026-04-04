/**
 * ================================================================
 * Fuel Cards Manager - ניהול כרטיסי תדלוק
 * ================================================================
 * מבנה עמודות הגיליון:
 *   A = מספר כרטיס
 *   B = סוג דלק (בנזין / סולר)
 *   C = ליטרים שנותרו (מסונכרן עם גודי)
 *   D = הערות
 *   E = תאריך הוספה
 *   F = שם כרטיס (מגודי)
 *   G = עדכון אחרון מגודי
 * ================================================================
 */

class FuelCardsManager {

  static _getSheet() {
    const ss = SpreadsheetApp.openById(CONFIG.SHEETS.MAIN);
    let sheet = ss.getSheetByName(CONFIG.FUEL.SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.FUEL.SHEET_NAME);
      sheet.appendRow([
        '\u05de\u05e1\u05e4\u05e8 \u05db\u05e8\u05d8\u05d9\u05e1',   // מספר כרטיס
        '\u05e1\u05d5\u05d2 \u05d3\u05dc\u05e7',                       // סוג דלק
        '\u05dc\u05d9\u05d8\u05e8\u05d9\u05dd \u05e9\u05e0\u05d5\u05ea\u05e8\u05d5', // ליטרים שנותרו
        '\u05d4\u05e2\u05e8\u05d5\u05ea',                               // הערות
        '\u05ea\u05d0\u05e8\u05d9\u05da \u05d4\u05d5\u05e1\u05e4\u05d4', // תאריך הוספה
        '\u05e9\u05dd \u05db\u05e8\u05d8\u05d9\u05e1',                  // שם כרטיס
        '\u05e2\u05d3\u05db\u05d5\u05df \u05d0\u05d7\u05e8\u05d5\u05df \u05de\u05d2\u05d5\u05d3\u05d9' // עדכון אחרון מגודי
      ]);
      const hr = sheet.getRange(1, 1, 1, 7);
      hr.setBackground(CONFIG.FUEL.HEADER_COLOR);
      hr.setFontColor('#FFFFFF');
      hr.setFontWeight('bold');
      hr.setHorizontalAlignment('center');
    }
    return sheet;
  }

  // ── חיפוש כרטיס לפי מספר (ציבורי) ──
  static lookupCard(cardNumber) {
    const sheet = this._getSheet();
    const rows  = sheet.getDataRange().getValues();
    const cn    = cardNumber.toString().trim();

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString().trim() === cn) {
        return {
          cardNumber: rows[i][0].toString().trim(),
          fuelType:   rows[i][1],
          liters:     parseFloat(rows[i][2]) || 0,
          notes:      rows[i][3] || '',
          cardName:   rows[i][5] || ''
        };
      }
    }
    return null;
  }

  // ── רשימת כל הכרטיסים (מנהל) ──
  static getAllCards() {
    const sheet = this._getSheet();
    const rows  = sheet.getDataRange().getValues();
    const cards = [];

    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      cards.push({
        cardNumber:  rows[i][0].toString().trim(),
        fuelType:    rows[i][1] || '',
        liters:      parseFloat(rows[i][2]) || 0,
        notes:       rows[i][3] || '',
        dateAdded:   rows[i][4] || '',
        cardName:    rows[i][5] || '',
        lastUpdated: rows[i][6] || ''
      });
    }
    return cards;
  }

  // ── הוספת כרטיס — מייבא מידע מגודי אוטומטית ──
  static addCard(cardNumber, notes) {
    const sheet = this._getSheet();
    const rows  = sheet.getDataRange().getValues();
    const cn    = cardNumber.toString().trim();

    if (!cn) throw new Error('\u05de\u05e1\u05e4\u05e8 \u05db\u05e8\u05d8\u05d9\u05e1 \u05dc\u05d0 \u05d9\u05db\u05d5\u05dc \u05dc\u05d4\u05d9\u05d5\u05ea \u05e8\u05d9\u05e7'); // מספר כרטיס לא יכול להיות ריק

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString().trim() === cn) {
        throw new Error('\u05db\u05e8\u05d8\u05d9\u05e1 ' + cn + ' \u05db\u05d1\u05e8 \u05e7\u05d9\u05d9\u05dd \u05d1\u05de\u05e2\u05e8\u05db\u05ea'); // כבר קיים
      }
    }

    // שאב נתונים מגודי
    const goodi = FuelGoodi.lookup(cn);
    if (!goodi) throw new Error('\u05db\u05e8\u05d8\u05d9\u05e1 ' + cn + ' \u05dc\u05d0 \u05e0\u05de\u05e6\u05d0 \u05d1\u05d2\u05d5\u05d3\u05d9'); // לא נמצא בגודי

    const now = new Date().toISOString();
    sheet.appendRow([
      cn,
      goodi.fuelType  || '',
      goodi.litersLeft || 0,
      notes || '',
      now,
      goodi.cardName  || '',
      now
    ]);

    return {
      cardName: goodi.cardName,
      fuelType: goodi.fuelType,
      liters:   goodi.litersLeft
    };
  }

  // ── סנכרן כרטיס עם גודי (מנהל) ──
  static refreshCard(cardNumber) {
    const sheet = this._getSheet();
    const rows  = sheet.getDataRange().getValues();
    const cn    = cardNumber.toString().trim();

    const goodi = FuelGoodi.lookup(cn);
    if (!goodi) throw new Error('\u05db\u05e8\u05d8\u05d9\u05e1 ' + cn + ' \u05dc\u05d0 \u05e0\u05de\u05e6\u05d0 \u05d1\u05d2\u05d5\u05d3\u05d9');

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString().trim() === cn) {
        const row = i + 1;
        sheet.getRange(row, 2).setValue(goodi.fuelType  || '');
        sheet.getRange(row, 3).setValue(goodi.litersLeft || 0);
        sheet.getRange(row, 6).setValue(goodi.cardName  || '');
        sheet.getRange(row, 7).setValue(new Date().toISOString());
        return {
          cardName:     goodi.cardName,
          fuelType:     goodi.fuelType,
          liters:       goodi.litersLeft,
          litersUsed:   goodi.litersUsed,
          amountUsed:   goodi.amountUsed,
          lastUsage:    goodi.lastUsage,
          recentUsages: goodi.recentUsages || []
        };
      }
    }
    throw new Error('\u05db\u05e8\u05d8\u05d9\u05e1 ' + cardNumber + ' \u05dc\u05d0 \u05e0\u05de\u05e6\u05d0 \u05d1\u05de\u05e2\u05e8\u05db\u05ea'); // לא נמצא במערכת
  }

  // ── מחיקת כרטיס (מנהל) ──
  static deleteCard(cardNumber) {
    const sheet = this._getSheet();
    const rows  = sheet.getDataRange().getValues();
    const cn    = cardNumber.toString().trim();

    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][0].toString().trim() === cn) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    throw new Error('\u05db\u05e8\u05d8\u05d9\u05e1 ' + cardNumber + ' \u05dc\u05d0 \u05e0\u05de\u05e6\u05d0'); // לא נמצא
  }

  // ── תדלוק — מתעד בהיסטוריה (ציבורי) ──
  static logFueling(cardNumber, driverName, liters, receiptUrl) {
    const sheet = this._getSheet();
    const rows  = sheet.getDataRange().getValues();
    const cn    = cardNumber.toString().trim();
    const amt   = parseFloat(liters);

    if (isNaN(amt) || amt <= 0) throw new Error('\u05db\u05de\u05d5\u05ea \u05dc\u05d9\u05d8\u05e8\u05d9\u05dd \u05dc\u05d0 \u05ea\u05e7\u05d9\u05e0\u05d4'); // כמות ליטרים לא תקינה
    if (!driverName || !driverName.toString().trim()) throw new Error('\u05d7\u05e1\u05e8 \u05e9\u05dd \u05de\u05ea\u05d3\u05dc\u05e7'); // חסר שם מתדלק

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString().trim() === cn) {
        const remaining = parseFloat(rows[i][2]) || 0;
        const newRemaining = Math.max(0, Math.round((remaining - amt) * 100) / 100);
        sheet.getRange(i + 1, 3).setValue(newRemaining);
        this._logToHistory(cn, rows[i][1], driverName.toString().trim(), amt, newRemaining, receiptUrl || '');
        return { remaining: newRemaining, fuelType: rows[i][1] };
      }
    }
    throw new Error('\u05db\u05e8\u05d8\u05d9\u05e1 ' + cardNumber + ' \u05dc\u05d0 \u05e0\u05de\u05e6\u05d0'); // לא נמצא
  }

  // ── גיליון היסטוריית תדלוקים ──
  static _getLogSheet() {
    const ss = SpreadsheetApp.openById(CONFIG.SHEETS.MAIN);
    let sheet = ss.getSheetByName('\u05ea\u05d3\u05dc\u05d5\u05e7\u05d9\u05dd'); // תדלוקים
    if (!sheet) {
      sheet = ss.insertSheet('\u05ea\u05d3\u05dc\u05d5\u05e7\u05d9\u05dd');
      sheet.appendRow([
        '\u05ea\u05d0\u05e8\u05d9\u05da',             // תאריך
        '\u05de\u05e1\u05e4\u05e8 \u05db\u05e8\u05d8\u05d9\u05e1', // מספר כרטיס
        '\u05e1\u05d5\u05d2 \u05d3\u05dc\u05e7',       // סוג דלק
        '\u05e9\u05dd \u05de\u05ea\u05d3\u05dc\u05e7', // שם מתדלק
        '\u05dc\u05d9\u05d8\u05e8\u05d9\u05dd \u05e9\u05ea\u05d5\u05d3\u05dc\u05e7\u05d5', // ליטרים שתודלקו
        '\u05d9\u05ea\u05e8\u05d4 \u05dc\u05d0\u05d7\u05e8 \u05ea\u05d3\u05dc\u05d5\u05e7', // יתרה לאחר תדלוק
        '\u05e7\u05d1\u05dc\u05d4'                     // קבלה
      ]);
      const hr = sheet.getRange(1, 1, 1, 7);
      hr.setBackground('#1a73e8');
      hr.setFontColor('#FFFFFF');
      hr.setFontWeight('bold');
      hr.setHorizontalAlignment('center');
    }
    return sheet;
  }

  static _logToHistory(cardNumber, fuelType, driverName, liters, remaining, receiptUrl) {
    const logSheet = this._getLogSheet();
    logSheet.appendRow([new Date(), cardNumber, fuelType, driverName, liters, remaining, receiptUrl || '']);
  }
}
