import crypto from "crypto"

export const generateCrypto = () => {
    const randomBytes = crypto.randomBytes(4);
    return randomBytes.toString('hex');
}