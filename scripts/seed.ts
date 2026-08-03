import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@alcoin.com' },
    update: {},
    create: {
      fullName: 'ALCOIN Admin',
      username: 'admin',
      email: 'admin@alcoin.com',
      phone: '08000000000',
      password: hashedPassword,
      role: 'admin',
      isActivated: true,
      activatedAt: new Date(),
      referralCode: 'ALC-ADMIN',
    },
  });

  // Create admin wallets
  for (const type of ['reward', 'deposit', 'profit']) {
    await prisma.wallet.upsert({
      where: { userId_type: { userId: admin.id, type } },
      update: {},
      create: { userId: admin.id, type, balance: 0 },
    });
  }
  console.log('Admin created:', admin.email);

  // Create sample ads
  const ads = [
    { title: 'Learn About Crypto Trading', duration: 30, reward: 100, thumbnail: 'crypto' },
    { title: 'Watch Product Review', duration: 45, reward: 150, thumbnail: 'product' },
    { title: 'Finance Tips Tutorial', duration: 60, reward: 200, thumbnail: 'finance' },
    { title: 'New App Launch Promo', duration: 20, reward: 80, thumbnail: 'app' },
    { title: 'Investment Strategy Guide', duration: 90, reward: 300, thumbnail: 'invest' },
  ];

  for (const ad of ads) {
    await prisma.ad.create({
      data: {
        title: ad.title,
        thumbnail: ad.thumbnail,
        duration: ad.duration,
        reward: ad.reward,
        isActive: true,
      },
    });
  }
  console.log(`Created ${ads.length} ads`);

  // Create sample tasks
  const tasks = [
    { title: 'Follow us on Twitter', instructions: 'Follow @ALCOIN on Twitter and screenshot your follow.', reward: 200, requiresProof: true },
    { title: 'Share on Facebook', instructions: 'Share our official page on your Facebook timeline.', reward: 250, requiresProof: true },
    { title: 'Download Our Partner App', instructions: 'Download the XYZ app from the Play Store using our referral link.', reward: 500, requiresProof: true },
    { title: 'Subscribe to YouTube Channel', instructions: 'Subscribe to ALCOIN Official on YouTube and leave a comment.', reward: 300, requiresProof: true },
    { title: 'Visit Sponsor Website', instructions: 'Visit www.example-sponsor.com and spend at least 2 minutes browsing.', reward: 100, requiresProof: false },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        title: task.title,
        instructions: task.instructions,
        reward: task.reward,
        requiresProof: task.requiresProof,
        isActive: true,
      },
    });
  }
  console.log(`Created ${tasks.length} tasks`);

  // Create sample activation codes
  const activationCodes = ['ACTIVATE-001', 'ACTIVATE-002', 'ACTIVATE-003'];
  for (const code of activationCodes) {
    await prisma.activationCode.create({
      data: { code, value: 5000, status: 'unused' },
    });
  }
  console.log(`Created ${activationCodes.length} activation codes`);

  // Create sample deposit codes
  const depositCodes = [
    { code: 'DEPOSIT-1K', amount: 1000 },
    { code: 'DEPOSIT-2K', amount: 2000 },
    { code: 'DEPOSIT-5K', amount: 5000 },
    { code: 'DEPOSIT-10K', amount: 10000 },
  ];
  for (const dc of depositCodes) {
    await prisma.depositCode.create({
      data: { code: dc.code, amount: dc.amount, status: 'unused' },
    });
  }
  console.log(`Created ${depositCodes.length} deposit codes`);

  // Create an announcement
  await prisma.announcement.create({
    data: {
      title: 'Welcome to ALCOIN!',
      message: 'Start earning rewards today by watching ads, completing tasks, and trading on the AL Coin Market. Activate your account to unlock all features.',
      isActive: true,
    },
  });
  console.log('Created announcement');

  console.log('Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
