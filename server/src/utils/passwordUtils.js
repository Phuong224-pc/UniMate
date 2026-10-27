import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  if (!plainPassword) throw new Error('Password cannot be empty');
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  return await bcrypt.compare(plainPassword, hashedPassword);
}
