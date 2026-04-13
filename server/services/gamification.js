/**
 * server/services/gamification.js
 * Gamification service with automatic badge assignment
 */

import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { broadcastToUser, broadcastToAll } from './broadcast.js';

const BADGE_THRESHOLDS = [
  { xp: 100, name: 'Bronze Learner', icon: '🥉', description: 'Earned 100 XP' },
  { xp: 500, name: 'Silver Scholar', icon: '🥈', description: 'Earned 500 XP' },
  { xp: 1000, name: 'Gold Graduate', icon: '🥇', description: 'Earned 1000 XP' },
  { xp: 2500, name: 'Platinum Pro', icon: '💎', description: 'Earned 2500 XP' },
  { xp: 5000, name: 'Diamond Master', icon: '🌟', description: 'Earned 5000 XP' },
  { xp: 10000, name: 'Legendary Guru', icon: '👑', description: 'Earned 10000 XP' },
];

const STREAK_BADGES = [
  { streak: 3, name: 'Consistent Starter', icon: '🔥', description: '3 day streak' },
  { streak: 7, name: 'Week Warrior', icon: '💪', description: '7 day streak' },
  { streak: 30, name: 'Monthly Master', icon: '🗓️', description: '30 day streak' },
];

export async function checkAndAssignBadges(userId) {
  try {
    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: new ObjectId(userId) },
      { projection: { xp: 1, level: 1, coins: 1, badges: 1, streak: 1 } }
    );

    if (!user) return null;

    const currentXP = user.xp || 0;
    const currentStreak = user.streak || 0;
    const currentBadges = user.badges || [];

    const newBadges = [];
    const notificationMessages = [];

    for (const threshold of BADGE_THRESHOLDS) {
      if (currentXP >= threshold.xp && !currentBadges.includes(threshold.name)) {
        newBadges.push(threshold);
        notificationMessages.push(`🏅 New Badge: ${threshold.icon} ${threshold.name}`);
      }
    }

    for (const streakBadge of STREAK_BADGES) {
      if (currentStreak >= streakBadge.streak && !currentBadges.includes(streakBadge.name)) {
        newBadges.push(streakBadge);
        notificationMessages.push(`🏅 New Badge: ${streakBadge.icon} ${streakBadge.name}`);
      }
    }

    if (newBadges.length > 0) {
      const badgeNames = newBadges.map(b => b.name);
      
      await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: new ObjectId(userId) },
        { $push: { badges: { $each: badgeNames } } }
      );

      broadcastToUser(userId, 'badges_earned', {
        newBadges: newBadges.map(b => ({ name: b.name, icon: b.icon, description: b.description })),
        totalBadges: currentBadges.length + newBadges.length,
      });

      const notification = {
        userId,
        title: 'Badge Earned!',
        message: notificationMessages.join('\n'),
        type: 'badge',
        read: false,
        _id: new ObjectId(),
        createdAt: new Date(),
      };
      
      await db.collection(COLLECTIONS.NOTIFICATIONS).insertOne(notification);
      
      broadcastToUser(userId, 'notification', {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        timestamp: notification.createdAt.toISOString(),
      });

      return { newBadges, totalBadges: currentBadges.length + newBadges.length };
    }

    return null;
  } catch (error) {
    console.error('Badge check error:', error);
    return null;
  }
}

export async function updateStreak(userId) {
  try {
    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: new ObjectId(userId) },
      { projection: { lastActive: 1, streak: 1 } }
    );

    if (!user) return null;

    const lastActive = user.lastActive ? new Date(user.lastActive) : null;
    const now = new Date();
    const currentStreak = user.streak || 0;

    let newStreak = currentStreak;

    if (lastActive) {
      const daysDiff = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        return currentStreak;
      } else if (daysDiff === 1) {
        newStreak = currentStreak + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: new ObjectId(userId) },
      { $set: { lastActive: now, streak: newStreak } }
    );

    return newStreak;
  } catch (error) {
    console.error('Streak update error:', error);
    return null;
  }
}

export function calculateLevel(xp) {
  const levels = [
    { level: 1, minXP: 0 },
    { level: 2, minXP: 100 },
    { level: 3, minXP: 250 },
    { level: 4, minXP: 500 },
    { level: 5, minXP: 1000 },
    { level: 6, minXP: 1750 },
    { level: 7, minXP: 2750 },
    { level: 8, minXP: 4000 },
    { level: 9, minXP: 5500 },
    { level: 10, minXP: 7500 },
  ];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].minXP) {
      return levels[i].level;
    }
  }
  return 1;
}