/**
 * ================================================================
 * DriveUpload - העלאת קבלות תדלוק ל-Google Drive
 * ================================================================
 */

const RECEIPTS_FOLDER_ID = '1OjgLBZUvZcVyQHjqZYrWzy7gAEwVymY6';

class DriveUpload {

  /**
   * מעלה תמונת קבלה מ-base64 ל-Drive
   * @param {string} base64Data  - תמונה מקודדת base64 (ללא prefix data URL)
   * @param {string} mimeType    - סוג הקובץ (image/jpeg, image/png וכו׳)
   * @param {string} driverName  - שם המתדלק (לשם הקובץ)
   * @returns {string} URL של הקובץ ב-Drive
   */
  static uploadReceipt(base64Data, mimeType, driverName) {
    const folder = DriveApp.getFolderById(RECEIPTS_FOLDER_ID);

    const ext      = DriveUpload._ext(mimeType);
    const dateStr  = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd-MM-yyyy');
    const fileName = (driverName || '\u05de\u05ea\u05d3\u05dc\u05e7') + ' ' + dateStr + '.' + ext;

    const bytes = Utilities.base64Decode(base64Data);
    const blob  = Utilities.newBlob(bytes, mimeType || 'image/jpeg', fileName);
    const file  = folder.createFile(blob);

    // הפוך לקריא לכל בעל קישור
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();
  }

  static _ext(mime) {
    const map = {
      'image/jpeg': 'jpg', 'image/jpg': 'jpg',
      'image/png':  'png', 'image/webp': 'webp',
      'image/heic': 'heic', 'image/heif': 'heif'
    };
    return map[(mime || '').toLowerCase()] || 'jpg';
  }
}
