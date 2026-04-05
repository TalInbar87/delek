/**
 * ================================================================
 * Main Entry Point - נקודת כניסה ראשית
 * ================================================================
 *
 * GET  → action=lookupCard&cardNumber=XXX&callback=cb  (JSONP, ציבורי)
 * POST → { action, ...params }
 *   lookupCard   - ציבורי
 *   adminLogin   - { password }  → token
 *   getCards     - { token }
 *   addCard      - { token, cardNumber, fuelType, liters, notes }
 *   deleteCard   - { token, cardNumber }
 *   updateLiters - { token, cardNumber, liters }
 *
 * הוראות פריסה (פעם ראשונה):
 * 1. צור Google Apps Script חדש (Standalone)
 *    https://script.google.com → New project
 * 2. clasp push (ר' deploy.sh)
 * 3. הרץ initializeSystem() פעם אחת
 * 4. Deploy → New deployment → Web app
 *    Execute as: Me  |  Access: Anyone
 * 5. העתק Deployment ID → .env
 * ================================================================
 */

// ================================================================
// HTTP Entry Points
// ================================================================

function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return _respond({ error: 'No parameters' }, null);
    }

    const action   = e.parameter.action;
    const callback = e.parameter.callback || null;

    if (action === 'lookupCard') {
      const cn = e.parameter.cardNumber;
      if (!cn) return _respond({ error: 'חסר מספר כרטיס' }, callback);
      const card = FuelCardsManager.lookupCard(cn);
      if (!card) return _respond({ found: false }, callback);
      return _respond({ found: true, card }, callback);
    }

    return _respond({ error: 'Unknown action: ' + action }, callback);

  } catch (err) {
    const cb = (e && e.parameter && e.parameter.callback) || null;
    Logger.log('❌ doGet error: ' + err);
    return _respond({ error: err.toString() }, cb);
  }
}

function doPost(e) {
  try {
    Logger.log('🎯 doPost called');
    if (!e) return _json({ error: 'No request data' });

    const data = _parseBody(e);
    if (!data) return _json({ error: 'No data provided' });

    Logger.log('▶ Action: ' + data.action);

    switch (data.action) {

      case 'lookupCard': {
        if (!data.cardNumber) return _json({ error: 'חסר מספר כרטיס' });
        const card = FuelCardsManager.lookupCard(data.cardNumber);
        if (!card) return _json({ found: false });
        return _json({ found: true, card });
      }

      case 'adminLogin': {
        const token = AdminAuth.authenticate(data.password);
        if (!token) return _json({ error: 'סיסמה שגויה' });
        return _json({ success: true, token });
      }

      case 'getCards': {
        if (!AdminAuth.verifyToken(data.token)) return _json({ error: 'אין הרשאה' });
        return _json({ success: true, cards: FuelCardsManager.getAllCards() });
      }

      case 'addCard': {
        if (!AdminAuth.verifyToken(data.token)) return _json({ error: 'אין הרשאה' });
        const meta = FuelCardsManager.addCard(data.cardNumber, data.notes || '');
        return _json({ success: true, meta });
      }

      case 'refreshCard': {
        if (!AdminAuth.verifyToken(data.token)) return _json({ error: 'אין הרשאה' });
        if (!data.cardNumber) return _json({ error: 'חסר מספר כרטיס' });
        const refreshed = FuelCardsManager.refreshCard(data.cardNumber);
        return _json({ success: true, meta: refreshed });
      }

      case 'archiveCard': {
        if (!AdminAuth.verifyToken(data.token)) return _json({ error: 'אין הרשאה' });
        if (!data.cardNumber) return _json({ error: 'חסר מספר כרטיס' });
        const archived = FuelCardsManager.archiveCard(data.cardNumber);
        return _json({ success: true, meta: archived });
      }

      case 'updateNotes': {
        if (!AdminAuth.verifyToken(data.token)) return _json({ error: 'אין הרשאה' });
        if (!data.cardNumber) return _json({ error: 'חסר מספר כרטיס' });
        FuelCardsManager.updateNotes(data.cardNumber, data.notes || '');
        return _json({ success: true });
      }

      case 'deleteCard': {
        if (!AdminAuth.verifyToken(data.token)) return _json({ error: 'אין הרשאה' });
        FuelCardsManager.deleteCard(data.cardNumber);
        return _json({ success: true });
      }

      case 'updateLiters': {
        if (!AdminAuth.verifyToken(data.token)) return _json({ error: 'אין הרשאה' });
        FuelCardsManager.updateLiters(data.cardNumber, data.liters);
        return _json({ success: true });
      }

      case 'warmCache': {
        FuelGoodi.warmCache();
        return _json({ ok: true });
      }

      case 'lookupGoodi': {
        if (!data.cardNumber) return _json({ error: 'חסר מספר כרטיס' });
        const card = FuelGoodi.lookup(data.cardNumber);
        if (!card) return _json({ found: false });
        return _json({ found: true, card });
      }

      case 'debugGoodi': {
        if (!data.cardNumber) return _json({ error: 'חסר מספר כרטיס' });
        const dbg = FuelGoodi.debug(data.cardNumber);
        return _json(dbg);
      }

      case 'logFueling': {
        if (!data.cardNumber)    return _json({ error: 'חסר מספר כרטיס' });
        if (!data.driverName)    return _json({ error: 'חסר שם מתדלק' });
        if (!data.receiptBase64) return _json({ error: 'חסרה תמונת קבלה' });

        const cardExists = FuelCardsManager.lookupCard(data.cardNumber);
        if (!cardExists) return _json({ error: 'כרטיס ' + data.cardNumber + ' לא קיים במערכת' });

        const receiptUrl = DriveUpload.uploadReceipt(
          data.receiptBase64,
          data.receiptMimeType || 'image/jpeg',
          data.driverName,
          data.cardNumber
        );
        return _json({ success: true, receiptUrl });
      }

      default:
        return _json({ error: 'Unknown action: ' + data.action });
    }

  } catch (err) {
    Logger.log('❌ doPost error: ' + err);
    return _json({ error: err.message || err.toString() });
  }
}

// ================================================================
// Helpers
// ================================================================

function _parseBody(e) {
  try {
    if (e.postData && e.postData.contents) return JSON.parse(e.postData.contents);
  } catch (_) {}
  try {
    if (e.parameter && e.parameter.data) return JSON.parse(e.parameter.data);
  } catch (_) {}
  return null;
}

function _json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function _respond(data, callback) {
  const json = JSON.stringify(data);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// Setup (הרץ פעם אחת מה-IDE)
// ================================================================

function initializeSystem() {
  Logger.log('🚀 Initializing fuel card system...');
  FuelCardsManager._getSheet();
  Logger.log('✅ Sheet ready: ' + CONFIG.FUEL.SHEET_NAME);
  Logger.log('✅ System initialized successfully');
}
