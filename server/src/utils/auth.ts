import crypto from 'crypto';

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function genToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
