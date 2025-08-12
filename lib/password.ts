import bcrypt from 'bcryptjs';
export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plain, salt);
}