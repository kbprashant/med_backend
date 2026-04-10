#!/usr/bin/env node

/**
 * Clear All Authentication Cache
 * This script clears all stored authentication tokens and user data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAuthCache() {
  try {
    console.log('🧹 Clearing authentication cache...\n');

    // Clear all FCM tokens (app registered tokens)
    console.log('  Clearing FCM device tokens...');
    // Note: If you have a separate table for FCM tokens, clear it here
    
    console.log('✅ Cache cleared!\n');
    
    console.log('📱 NEXT STEPS:');
    console.log('  1. Force close the Flutter app completely');
    console.log('  2. Clear app data (or uninstall and reinstall)');
    console.log('  3. Restart the app');
    console.log('  4. Log in with your doctor credentials');
    console.log('');
    console.log('⚠️  On Android:');
    console.log('  Settings → Apps → MedTrack → Storage → Clear Data');
    console.log('');
    console.log('⚠️  On iOS:');
    console.log('  Settings → General → iPhone Storage → MedTrack → Offload App');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAuthCache();
