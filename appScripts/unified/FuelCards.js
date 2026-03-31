/**
 * ================================================================
 * Fuel Cards Manager - ניהול כרטיסי תדלוק
 * ================================================================
 * מבנה עמודות הגיליון:
 *   A = מספר כרטיס
 *   B = סוג דלק (בנזין / סולר)
 *   C = ליטרים שנותרו
 *   D = הערות
 *   E = תאריך הוספה
 * ================================================================
 */

class FuelCardsManager {

  static _getSheet() {
    const ss = SpreadsheetApp.openById(CONFIG.SHEETS.MAIN);
    let sheet = ss.getSheetByName(CONFIG.FUEL.SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.FUEL.SHEET_NAME);
      sheet.appendRow(['מספר כרטיס', 'סוג דלק', 'ליטרים שנותרו', 'הערות', 'תאריך הוספה']);
      const hr = sheet.getRange(1, 1, 1, 5);
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
          notes:      rows[i][3] || ''
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
        cardNumber: rows[i][0].toString().trim(),
        fuelType:   rows[i][1],
        liters:     parseFloat(rows[i][2]) || 0,
        notes:      rows[i][3] || '',
        dateAdded:  rows[i][4] || ''
      });
    }
    return cards;
  }

  // ── הוספת כרטיס (מנהל) ──
  static addCard(cardData) {
    const sheet = this._getSheet();
    const rows  = sheet.getDataRange().getValues();
    const cn    = cardData.cardNumber.toString().trim();

    if (!cn) throw new Error('מספר כרטיס לא יכול להיות ריק');

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString().trim() === cn) {
        throw new Error('כרטיס ' + cn + ' כבר קיים במערכת');
      }
    }

    const fuelType = cardData.fuelType;
    if (fuelType !== 'בנזין' && fuelType !== 'סולר') {
      throw new Error('סוג דלק לא תקין — חייב להיות בנזין או סולר');
    }

    const liters = parseFloat(cardData.liters);
    if (isNaN(liters) || liters < 0) {
      throw new Error('כמות ליטרים לא תקינה');
    }

    sheet.appendRow([
      cn,
      fuelType,
      liters,
      cardData.notes || '',
      new Date().toISOString()
    ]);
    return true;
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
    throw new Error('כרטיס ' + cardNumber + ' לא נמצא');
  }

  // ── עדכון ליטרים (מנהל) ──
  static updateLiters(cardNumber, liters) {
    const sheet = this._getSheet();
    const rows  = sheet.getDataRange().getValues();
    const cn    = cardNumber.toString().trim();
    const val   = parseFloat(liters);

    if (isNaN(val) || val < 0) throw new Error('כמות ליטרים לא תקינה');

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString().trim() === cn) {
        sheet.getRange(i + 1, 3).setValue(val);
        return true;
      }
    }
    throw new Error('כרטיס ' + cardNumber + ' לא נמצא');
  }
}
