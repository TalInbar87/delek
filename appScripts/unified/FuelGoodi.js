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
    const cn = cardNumber.toString().trim();

    // שלב 1: GET — קבל ViewState טרי
    const html1 = UrlFetchApp.fetch(GOODI_URL, {
      muteHttpExceptions: true, followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).getContentText('UTF-8');

    const vs1  = this._extractInput('__VIEWSTATE', html1);
    const ev1  = this._extractInput('__EVENTVALIDATION', html1);
    const vsg1 = this._extractInput('__VIEWSTATEGENERATOR', html1);
    if (!vs1) throw new Error('\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d8\u05e2\u05d5\u05df \u05d0\u05ea \u05d3\u05e3 \u05d2\u05d5\u05d3\u05d9'); // לא ניתן לטעון את דף גודי

    // שלב 2: POST עם מספר הכרטיס
    const html2 = UrlFetchApp.fetch(GOODI_URL, {
      method: 'post', muteHttpExceptions: true, followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': GOODI_URL },
      payload: {
        'RadStyleSheetManager1_TSSM': '', 'RadScriptManager1_TSM': '',
        '__EVENTTARGET': '', '__EVENTARGUMENT': '',
        '__VIEWSTATE': vs1, '__VIEWSTATEGENERATOR': vsg1, '__EVENTVALIDATION': ev1,
        'ddSearchSelect': '3', 'tbSearch': cn,
        'btnSearch': '\u05D7\u05E4\u05E9'
      }
    }).getContentText('UTF-8');

    const card = this._parse(cn, html2);
    if (!card) return null;

    // שלב 3: POST עם טווח תאריכים לשליפת שימושים אחרונים
    try {
      const vs2  = this._extractInput('__VIEWSTATE', html2);
      const ev2  = this._extractInput('__EVENTVALIDATION', html2);
      const vsg2 = this._extractInput('__VIEWSTATEGENERATOR', html2);
      const today     = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy');
      const monthAgo  = Utilities.formatDate(new Date(Date.now() - 30*24*60*60*1000), 'Asia/Jerusalem', 'dd/MM/yyyy');

      const html3 = UrlFetchApp.fetch(GOODI_URL, {
        method: 'post', muteHttpExceptions: true, followRedirects: true,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': GOODI_URL },
        payload: {
          'RadStyleSheetManager1_TSSM': '', 'RadScriptManager1_TSM': '',
          '__EVENTTARGET': '', '__EVENTARGUMENT': '',
          '__VIEWSTATE': vs2, '__VIEWSTATEGENERATOR': vsg2, '__EVENTVALIDATION': ev2,
          'ddSearchSelect': '3', 'tbSearch': cn,
          'dpStart$dateInput': monthAgo,
          'dpEnd$dateInput': today,
          'btnApplyRange': '\u05D4\u05E6\u05D2'  // הצג
        }
      }).getContentText('UTF-8');

      card.recentUsages = this._parseTransactions(html3);
    } catch (e) {
      card.recentUsages = [];
    }

    return card;
  }

  // ── debug: מחזיר raw snippet מה-response (כולל שלב 3 עם תאריכים) ──
  static debug(cardNumber) {
    const cn = cardNumber.toString().trim();
    const html1 = UrlFetchApp.fetch(GOODI_URL, { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0' } }).getContentText('UTF-8');
    const vs1  = this._extractInput('__VIEWSTATE', html1);
    const ev1  = this._extractInput('__EVENTVALIDATION', html1);
    const vsg1 = this._extractInput('__VIEWSTATEGENERATOR', html1);

    const resp2 = UrlFetchApp.fetch(GOODI_URL, {
      method: 'post', muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': GOODI_URL },
      payload: { 'RadStyleSheetManager1_TSSM': '', 'RadScriptManager1_TSM': '',
        '__EVENTTARGET': '', '__EVENTARGUMENT': '',
        '__VIEWSTATE': vs1, '__VIEWSTATEGENERATOR': vsg1, '__EVENTVALIDATION': ev1,
        'ddSearchSelect': '3', 'tbSearch': cn, 'btnSearch': '\u05D7\u05E4\u05E9' }
    });
    const html2 = resp2.getContentText('UTF-8');
    const vs2  = this._extractInput('__VIEWSTATE', html2);
    const ev2  = this._extractInput('__EVENTVALIDATION', html2);
    const vsg2 = this._extractInput('__VIEWSTATEGENERATOR', html2);

    const today    = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy');
    const monthAgo = Utilities.formatDate(new Date(Date.now() - 30*24*60*60*1000), 'Asia/Jerusalem', 'dd/MM/yyyy');
    const html3 = UrlFetchApp.fetch(GOODI_URL, {
      method: 'post', muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': GOODI_URL },
      payload: { 'RadStyleSheetManager1_TSSM': '', 'RadScriptManager1_TSM': '',
        '__EVENTTARGET': '', '__EVENTARGUMENT': '',
        '__VIEWSTATE': vs2, '__VIEWSTATEGENERATOR': vsg2, '__EVENTVALIDATION': ev2,
        'ddSearchSelect': '3', 'tbSearch': cn,
        'dpStart$dateInput': monthAgo, 'dpEnd$dateInput': today,
        'btnApplyRange': '\u05D4\u05E6\u05D2' }
    }).getContentText('UTF-8');

    const idx = html3.indexOf('reportTabels');
    return {
      hasLiters:   html2.includes('\u05DC\u05D9\u05D8\u05E8\u05D9\u05DD \u05E9\u05E0\u05D5\u05EA\u05E8\u05D5'),
      reportSnip:  idx >= 0 ? html3.substring(idx, idx + 3000) : 'reportTabels not found'
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
