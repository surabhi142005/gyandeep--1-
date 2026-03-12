import { prisma } from './db';

export const XP_CONFIG = {
  QUIZ_COMPLETED: 50,
  ATTENDANCE_MARKED: 20,
  PERFECT_SCORE_BONUS: 30,
  STREAK_BONUS: 10,
};

export const COIN_CONFIG = {
  QUIZ_COMPLETED: 10,
  PERFECT_SCORE_BONUS: 5,
};

export async function awardXP(userId: string, type: keyof typeof XP_CONFIG, details?: string) {
  const xpAmount = XP_CONFIG[type];
  const coinsAmount = COIN_CONFIG[type as keyof typeof COIN_CONFIG] || 0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true, coins: true },
  });

  if (!user) return null;

  const newXP = user.xp + xpAmount;
  const newCoins = user.coins + coinsAmount;
  
  // Basic leveling logic: every 500 XP = 1 level
  const newLevel = Math.floor(newXP / 500) + 1;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXP,
      coins: newCoins,
      level: newLevel,
      lastActive: new Date(),
      activities: {
        create: {
          type,
          xpEarned: xpAmount,
          details,
        },
      },
    },
  });

  return updatedUser;
}

export async function updateStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActive: true, streak: true },
  });

  if (!user) return null;

  const now = new Date();
  const lastActive = user.lastActive;

  if (!lastActive) {
    return prisma.user.update({
      where: { id: userId },
      data: { streak: 1, lastActive: now },
    });
  }

  const diffInHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    // Already active today or within 24 hours, don't increment yet if same day
    // This is a simple check, could be improved by checking calendar days
    return user;
  } else if (diffInHours < 48) {
    // Within 48 hours, increment streak
    const newStreak = user.streak + 1;
    await awardXP(userId, 'STREAK_BONUS', `Streak reaching ${newStreak} days`);
    return prisma.user.update({
      where: { id: userId },
      data: { streak: newStreak, lastActive: now },
    });
  } else {
    // More than 48 hours, reset streak
    return prisma.user.update({
      where: { id: userId },
      data: { streak: 1, lastActive: now },
    });
  }
}
