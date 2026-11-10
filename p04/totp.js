// RFC 6238 TOTP (SHA-1, 6자리, 30초) - Google Authenticator 호환
const TOTP = (() => {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const STEP = 30;

  function base32Decode(text) {
    const clean = text.toUpperCase().replace(/[\s=-]/g, "");
    let bits = 0, value = 0;
    const out = [];
    for (const ch of clean) {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) throw new Error("잘못된 Base32 문자: " + ch);
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return new Uint8Array(out);
  }

  function base32Encode(bytes) {
    let bits = 0, value = 0, out = "";
    for (const b of bytes) {
      value = (value << 8) | b;
      bits += 8;
      while (bits >= 5) {
        out += ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
    return out;
  }

  function generateSecret() {
    return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
  }

  async function codeAt(secret, counter) {
    const key = await crypto.subtle.importKey(
      "raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
    );
    const msg = new DataView(new ArrayBuffer(8));
    msg.setUint32(0, Math.floor(counter / 2 ** 32));
    msg.setUint32(4, counter % 2 ** 32);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg.buffer));
    const offset = mac[mac.length - 1] & 0x0f;
    const num = new DataView(mac.buffer).getUint32(offset) & 0x7fffffff;
    return String(num % 1000000).padStart(6, "0");
  }

  // 시계 오차를 고려해 앞뒤 한 구간(±30초)까지 허용
  async function verify(secret, code, now = Date.now()) {
    const counter = Math.floor(now / 1000 / STEP);
    for (const drift of [0, -1, 1]) {
      if (await codeAt(secret, counter + drift) === code) return true;
    }
    return false;
  }

  function secondsLeft(now = Date.now()) {
    return STEP - (Math.floor(now / 1000) % STEP);
  }

  return { STEP, generateSecret, codeAt, verify, secondsLeft };
})();
