/**
 * ================================================================
 * FuelGoodi - שאילתה ישירה לאתר גודי
 * ================================================================
 */

/** הרץ פונקציה זו מה-editor כדי לאשר הרשאות UrlFetchApp + Drive (כולל createFolder) */
function authorizeUrlFetch() {
  // 1. UrlFetch
  UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });

  // 2. Drive — בדוק גם קריאה וגם כתיבה (createFolder)
  const parent     = DriveApp.getFolderById('1OjgLBZUvZcVyQHjqZYrWzy7gAEwVymY6');
  const testFolder = parent.createFolder('__auth_test__');
  testFolder.setTrashed(true);   // מחק מיד אחרי האישור

  Logger.log('Authorization OK: UrlFetch + Drive createFolder');
}

const GOODI_URL = 'https://fueladmin.goodi.co.il/_fuel/';

class FuelGoodi {

  // ── שאילתה לפי מספר כרטיס — מחזיר { card } או null ──
  static lookup(cardNumber) {
    // שלב 1: GET — קבל ViewState טרי
    const getResp = UrlFetchApp.fetch(GOODI_URL, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const html = getResp.getContentText('UTF-8');

    const vs  = this._extractInput('__VIEWSTATE', html);
    const ev  = this._extractInput('__EVENTVALIDATION', html);
    const vsg = this._extractInput('__VIEWSTATEGENERATOR', html);

    if (!vs) throw new Error('לא ניתן לטעון את דף גודי (ViewState ריק)');

    // שלב 2: POST עם מספר הכרטיס
    const postResp = UrlFetchApp.fetch(GOODI_URL, {
      method: 'post',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': GOODI_URL
      },
      payload: {
        'RadStyleSheetManager1_TSSM': '',
        'RadScriptManager1_TSM': '',
        '__EVENTTARGET': '',
        '__EVENTARGUMENT': '',
        '__VIEWSTATE': vs,
        '__VIEWSTATEGENERATOR': vsg,
        '__EVENTVALIDATION': ev,
        'ddSearchSelect': '3',
        'tbSearch': cardNumber.toString().trim(),
        'btnSearch': '\u05D7\u05E4\u05E9'   // חפש — encoded to avoid charset issues
      }
    });

    const result = postResp.getContentText('UTF-8');
    return this._parse(cardNumber, result);
  }

  // ── debug: מחזיר raw snippet מה-response ──
  static debug(cardNumber) {
    const getResp = UrlFetchApp.fetch(GOODI_URL, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = getResp.getContentText('UTF-8');
    const vs  = this._extractInput('__VIEWSTATE', html);
    const ev  = this._extractInput('__EVENTVALIDATION', html);
    const vsg = this._extractInput('__VIEWSTATEGENERATOR', html);

    const postResp = UrlFetchApp.fetch(GOODI_URL, {
      method: 'post',
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': GOODI_URL },
      payload: {
        'RadStyleSheetManager1_TSSM': '', 'RadScriptManager1_TSM': '',
        '__EVENTTARGET': '', '__EVENTARGUMENT': '',
        '__VIEWSTATE': vs, '__VIEWSTATEGENERATOR': vsg, '__EVENTVALIDATION': ev,
        'ddSearchSelect': '3',
        'tbSearch': cardNumber.toString().trim(),
        'btnSearch': '\u05D7\u05E4\u05E9'
      }
    });

    const result = postResp.getContentText('UTF-8');
    const idx    = result.indexOf('CardInfo');
    return {
      vsLen:      vs.length,
      postStatus: postResp.getResponseCode(),
      resultLen:  result.length,
      hasLiters:  result.includes('\u05DC\u05D9\u05D8\u05E8\u05D9\u05DD \u05E9\u05E0\u05D5\u05EA\u05E8\u05D5'), // ליטרים שנותרו
      snippet:    idx >= 0 ? result.substring(idx, idx + 600) : result.substring(0, 400),
      reportSnip: (function() { const r = result.indexOf('CurrentReport'); return r >= 0 ? result.substring(r, r + 4000) : 'not found'; })()
    };
  }

  // ── parse ──
  static _parse(cardNumber, html) {
    if (!html.includes('\u05DC\u05D9\u05D8\u05E8\u05D9\u05DD \u05E9\u05E0\u05D5\u05EA\u05E8\u05D5')) return null;  // ליטרים שנותרו

    const cardName   = this._match(html, /title="[^"]*\u05E9\u05DD \u05DB\u05E8\u05D8\u05D9\u05E1[^"]*">\s*([^<]+)/);
    const litersUsed = parseFloat(this._match(html, /\u05DC\u05D9\u05D8\u05E8\u05D9\u05DD \u05E9\u05D4\u05E9\u05EA\u05DE\u05E9\u05D5:<\/td>\s*<td>([\d.]+)/) || '0');
    const litersLeft = parseFloat(this._match(html, /\u05DC\u05D9\u05D8\u05E8\u05D9\u05DD \u05E9\u05E0\u05D5\u05EA\u05E8\u05D5:<\/td>\s*<td>([\d.]+)/) || '0');
    const amountUsed = parseFloat(this._match(html, /\u05E1\u05DB\u05D5\u05DD \u05E9\u05D4\u05E9\u05EA\u05DE\u05E9\u05D5:<\/td>\s*<td>([\d.]+)/) || '0');
    const lastUsage  = this._match(html, /\u05EA\u05D0\u05E8\u05D9\u05DA \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D0\u05D7\u05E8\u05D5\u05DF:\s*([^<]+)/);

    const name     = (cardName || '').trim();
    const fuelType = name.includes('\u05E1\u05D5\u05DC\u05E8') ? '\u05E1\u05D5\u05DC\u05E8' : '\u05D1\u05E0\u05D6\u05D9\u05DF'; // סולר / בנזין

    return {
      cardNumber: cardNumber.toString().trim(),
      cardName:   name,
      fuelType,
      litersUsed,
      litersLeft,
      amountUsed,
      lastUsage:  (lastUsage || '').trim()
    };
  }

  static _extractInput(name, html) {
    const m = html.match(new RegExp('name="' + name + '"[^>]+value="([^"]*)"'));
    return m ? m[1] : '';
  }

  static _match(html, regex) {
    const m = html.match(regex);
    return m ? m[1].trim() : null;
  }
}
