/**
 * ================================================================
 * FuelGoodi - שאילתה ישירה לאתר גודי
 * ================================================================
 * מבצע GET+POST לאתר fueladmin.goodi.co.il
 * ומחזיר פרטי כרטיס עדכניים (ליטרים שנותרו, שם כרטיס, וכו׳)
 * ================================================================
 */

const GOODI_URL = 'https://fueladmin.goodi.co.il/_fuel/';

class FuelGoodi {

  // ── שאילתה לפי מספר כרטיס ──
  static lookup(cardNumber) {
    // שלב 1: GET — קבל ViewState טרי
    const getResp = UrlFetchApp.fetch(GOODI_URL, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const html = getResp.getContentText();

    const vs  = this._extractInput('__VIEWSTATE', html);
    const ev  = this._extractInput('__EVENTVALIDATION', html);
    const vsg = this._extractInput('__VIEWSTATEGENERATOR', html);

    if (!vs) throw new Error('לא ניתן לטעון את דף גודי');

    // שלב 2: POST עם מספר הכרטיס
    const postResp = UrlFetchApp.fetch(GOODI_URL, {
      method: 'post',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': this.BASE_URL
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
        'btnSearch': 'חפש'
      }
    });

    const result = postResp.getContentText();
    return this._parse(cardNumber, result);
  }

  // ── parse HTML תגובה ──
  static _parse(cardNumber, html) {
    if (!html.includes('ליטרים שנותרו')) return null;

    const cardName   = this._match(html, /title="שם כרטיס ?">\s*([^<]+)/);
    const litersUsed = parseFloat(this._match(html, /ליטרים שהשתמשו:<\/td>\s*<td>([\d.]+)/) || '0');
    const litersLeft = parseFloat(this._match(html, /ליטרים שנותרו:<\/td>\s*<td>([\d.]+)/) || '0');
    const amountUsed = parseFloat(this._match(html, /סכום שהשתמשו:<\/td>\s*<td>([\d.]+)/) || '0');
    const lastUsage  = this._match(html, /תאריך שימוש אחרון:\s*([^<]+)/);

    const name     = (cardName || '').trim();
    const fuelType = name.includes('סולר') ? 'סולר' : 'בנזין';

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
