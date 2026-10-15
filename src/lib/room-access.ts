import { newSalt, hashPassword, verifyPassword } from './auth';
import { HttpError } from './http';
// Salted scrypt credential; never include this column in public serializers.
export async function encodeRoomPassword(enabled: unknown, password: unknown, existing: string | null = null) {
 if (enabled !== undefined && typeof enabled !== 'boolean') throw new HttpError(400,'passwordEnabled must be true or false');
 if (enabled !== true) return null;
 if ((password === '' || password === undefined) && existing) return existing;
 if (typeof password !== 'string' || password.length < 4 || password.length > 128) throw new HttpError(400,'room password must contain 4-128 characters');
 const salt=newSalt();return salt+':'+await hashPassword(password,salt);
}
export async function checkRoomPassword(stored: string | null, password: unknown) {
 if (!stored) return true;
 if (typeof password !== 'string' || password.length>128) return false;
 const [salt,hash]=stored.split(':');return !!salt&&!!hash&&await verifyPassword(password,salt,hash);
}
