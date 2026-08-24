/**
 * Admin account seed script.
 *
 * Creates a development admin account using credentials from environment
 * variables. Run via:
 *
 *   npm run db:seed:admin
 *
 * Required environment variables:
 *   ADMIN_SETUP_EMAIL    — email for the admin account
 *   ADMIN_SETUP_PASSWORD — password (will be hashed, never stored as plaintext)
 *
 * Safety:
 *  - NEVER hard-codes credentials
 *  - If an admin with that email already exists, logs a warning and exits
 *  - The actual password is never logged
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env before importing anything that uses config
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const email = process.env['ADMIN_SETUP_EMAIL'];
  const password = process.env['ADMIN_SETUP_PASSWORD'];

  if (!email || !password) {
    console.error(
      '\n❌  ADMIN_SETUP_EMAIL and ADMIN_SETUP_PASSWORD must be set in .env\n' +
      '   See .env for instructions.\n',
    );
    process.exit(1);
  }

  // Validate password strength
  if (password.length < 8) {
    console.error('\n❌  ADMIN_SETUP_PASSWORD must be at least 8 characters.\n');
    process.exit(1);
  }

  // Check if admin already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.warn(`\n⚠️  User with email "${email}" already exists (role: ${existing.role}).`);
    console.warn('   No changes made.\n');
    await prisma.$disconnect();
    return;
  }

  // Hash password
  const saltRounds = parseInt(process.env['BCRYPT_SALT_ROUNDS'] ?? '12', 10);
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isVerified: true,
      isActive: true,
    },
  });

  console.log(`\n✅  Admin account created successfully.`);
  console.log(`   ID:    ${admin.id}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role:  ${admin.role}`);
  console.log(
    '\n   ⚠️  Consider unsetting ADMIN_SETUP_PASSWORD from .env after setup.\n',
  );

  await prisma.$disconnect();
}

seedAdmin().catch(async (err: Error) => {
  console.error('\n❌  Failed to seed admin:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
