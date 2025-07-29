import { randomBytes } from 'crypto';
import { storage as dbStorage } from './storage';

/**
 * Generate a set of recovery codes for a user
 * @param userId User ID to generate recovery codes for
 * @param count Number of recovery codes to generate (default: 8)
 * @returns Array of recovery codes
 */
export async function generateRecoveryCodes(userId: number, count: number = 8): Promise<string[]> {
  // Generate random recovery codes
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Format: XXXX-XXXX-XXXX (12 alphanumeric characters with dashes)
    const part1 = randomBytes(2).toString('hex').toUpperCase();
    const part2 = randomBytes(2).toString('hex').toUpperCase();
    const part3 = randomBytes(2).toString('hex').toUpperCase();
    const code = `${part1}-${part2}-${part3}`;
    codes.push(code);
  }

  // Store hashed codes in the database
  const user = await dbStorage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Store as JSON string
  await dbStorage.updateUser(userId, {
    recoveryCodes: JSON.stringify(codes)
  });

  return codes;
}

/**
 * Verify a recovery code for a user
 * @param userId User ID to verify code for
 * @param code Recovery code to verify
 * @returns True if valid, false otherwise
 */
export async function verifyRecoveryCode(userId: number, code: string): Promise<boolean> {
  const user = await dbStorage.getUser(userId);
  if (!user || !user.recoveryCodes) {
    return false;
  }

  try {
    // Parse stored codes
    const storedCodes = JSON.parse(user.recoveryCodes);
    
    // Check if code is in the list
    const index = storedCodes.indexOf(code);
    if (index === -1) {
      return false;
    }
    
    // Code is valid, remove it from the list (one-time use)
    storedCodes.splice(index, 1);
    
    // Update the user with the new list of codes
    await dbStorage.updateUser(userId, {
      recoveryCodes: JSON.stringify(storedCodes)
    });
    
    return true;
  } catch (error) {
    console.error('Error verifying recovery code:', error);
    return false;
  }
}

/**
 * Check if a user has any remaining recovery codes
 * @param userId User ID to check
 * @returns Number of remaining codes, or 0 if none
 */
export async function getRemainingRecoveryCodes(userId: number): Promise<number> {
  const user = await dbStorage.getUser(userId);
  if (!user || !user.recoveryCodes) {
    return 0;
  }

  try {
    const storedCodes = JSON.parse(user.recoveryCodes);
    return storedCodes.length;
  } catch (error) {
    console.error('Error getting remaining recovery codes:', error);
    return 0;
  }
}