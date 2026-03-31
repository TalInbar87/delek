/**
 * ================================================================
 * Authentication - אבטחה
 * ================================================================
 * JWTUtil   - יצירה ואימות JWT Tokens (HMAC-SHA256)
 * AdminAuth - אימות מנהל יחיד מול סיסמה ב-Config
 * ================================================================
 */

// ================================================================
// JWT Utilities
// ================================================================

class JWTUtil {

  static base64UrlEncode(str) {
    return Utilities.base64Encode(Utilities.newBlob(str, MimeType.TEXT_PLAIN).getBytes())
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  static base64UrlDecode(str) {
    let b = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    return Utilities.base64Decode(b);
  }

  static sign(payload, secret) {
    const h   = this.base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const p   = this.base64UrlEncode(JSON.stringify(payload));
    const sig = this.createSignature(h + '.' + p, secret);
    return h + '.' + p + '.' + sig;
  }

  static verify(token, secret) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [h, p, sig] = parts;
      if (sig !== this.createSignature(h + '.' + p, secret)) return null;
      const payload = JSON.parse(
        Utilities.newBlob(this.base64UrlDecode(p)).getDataAsString()
      );
      if (payload.exp && payload.exp < Date.now() / 1000) return null;
      return payload;
    } catch (e) {
      Logger.log('❌ JWT verify error: ' + e);
      return null;
    }
  }

  static createSignature(data, secret) {
    return this.base64UrlEncode(Utilities.computeHmacSha256Signature(data, secret));
  }
}

// ================================================================
// Admin Auth - אימות מנהל
// ================================================================

class AdminAuth {

  static hashPassword(password) {
    return Utilities.base64Encode(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + CONFIG.JWT_SECRET)
    );
  }

  static authenticate(password) {
    if (!password) return null;
    const hash = this.hashPassword(password);
    if (hash !== CONFIG.ADMIN_PASSWORD_HASH) return null;
    return JWTUtil.sign(
      {
        role: 'admin',
        iat:  Math.floor(Date.now() / 1000),
        exp:  Math.floor(Date.now() / 1000) + CONFIG.TOKEN_EXPIRATION
      },
      CONFIG.JWT_SECRET
    );
  }

  static verifyToken(token) {
    if (!token) return null;
    const payload = JWTUtil.verify(token, CONFIG.JWT_SECRET);
    if (!payload || payload.role !== 'admin') return null;
    return payload;
  }
}
