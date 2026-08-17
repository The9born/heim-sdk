"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gpDecryptCurve25519 = exports.gpEncryptCurve25519 = void 0;
const gopherjs_js_1 = require("./gopherjs.js");
const gpEncryptCurve25519 = (pubKey64, plaintext) => {
    const [result, err] = (0, gopherjs_js_1.encryptCurve25519)(pubKey64, plaintext);
    if (err) {
        throw new Error(err);
    }
    return result;
};
exports.gpEncryptCurve25519 = gpEncryptCurve25519;
const gpDecryptCurve25519 = (privKey64, ciphertext) => {
    const [result, err] = (0, gopherjs_js_1.decryptCurve25519)(privKey64, ciphertext);
    if (err) {
        throw new Error(err);
    }
    return result;
};
exports.gpDecryptCurve25519 = gpDecryptCurve25519;
//# sourceMappingURL=gopher.js.map