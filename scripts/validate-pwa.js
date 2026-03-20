/**
 * PWA Service Worker Validation Script
 * Run with: node scripts/validate-pwa.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.PWA_URL || 'http://localhost:5173';

async function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function validatePWA() {
  console.log('🔍 Validating PWA Configuration...\n');

  const checks = {
    manifest: { name: 'Web App Manifest', passed: false },
    serviceWorker: { name: 'Service Worker', passed: false },
    icons: { name: 'App Icons', passed: false },
    themeColor: { name: 'Theme Color', passed: false },
    offlineSupport: { name: 'Offline Support', passed: false },
  };

  // Check manifest
  console.log('📋 Checking Web App Manifest...');
  try {
    const manifestRes = await fetch(`${BASE_URL}/manifest.webmanifest`);
    if (manifestRes.status === 200) {
      const manifest = JSON.parse(manifestRes.data);
      checks.manifest.passed = true;
      console.log('   ✅ Manifest found');
      console.log(`   - Name: ${manifest.name}`);
      console.log(`   - Short Name: ${manifest.short_name}`);
      console.log(`   - Start URL: ${manifest.start_url}`);
      console.log(`   - Display: ${manifest.display}`);
      checks.themeColor.passed = !!manifest.theme_color;
    } else {
      console.log('   ❌ Manifest not found');
    }
  } catch (err) {
    console.log('   ❌ Manifest check failed:', err.message);
  }

  // Check service worker
  console.log('\n⚙️  Checking Service Worker...');
  try {
    const swRes = await fetch(`${BASE_URL}/sw.js`);
    if (swRes.status === 200) {
      checks.serviceWorker.passed = true;
      console.log('   ✅ Service worker found');
      checks.offlineSupport.passed = swRes.data.includes('fetch');
    } else {
      console.log('   ❌ Service worker not found');
    }
  } catch (err) {
    console.log('   ❌ Service worker check failed:', err.message);
  }

  // Check icons
  console.log('\n🖼️  Checking App Icons...');
  const iconSizes = ['72x72', '96x96', '128x128', '144x144', '152x152', '192x192', '384x384', '512x512'];
  let iconsFound = 0;
  for (const size of iconSizes) {
    try {
      const iconPath = `/icons/icon-${size}.png`;
      const iconRes = await fetch(`${BASE_URL}${iconPath}`);
      if (iconRes.status === 200) {
        iconsFound++;
      }
    } catch {}
  }
  checks.icons.passed = iconsFound >= 3;
  console.log(`   ${checks.icons.passed ? '✅' : '⚠️'} Found ${iconsFound}/${iconSizes.length} icons`);

  // Check installability
  console.log('\n📱 Checking Installability...');
  try {
    const htmlRes = await fetch(BASE_URL);
    const hasMetaTags = htmlRes.data.includes('theme-color') && 
                       htmlRes.data.includes('apple-mobile-web-app');
    console.log(`   ${hasMetaTags ? '✅' : '⚠️'} PWA meta tags present`);
  } catch (err) {
    console.log('   ❌ Installability check failed:', err.message);
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log('─'.repeat(40));
  let allPassed = true;
  for (const [key, check] of Object.entries(checks)) {
    const status = check.passed ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    if (!check.passed) allPassed = false;
  }
  console.log('─'.repeat(40));

  if (allPassed) {
    console.log('\n🎉 All PWA checks passed!');
  } else {
    console.log('\n⚠️  Some PWA checks failed. Review the issues above.');
  }

  return allPassed;
}

validatePWA().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
