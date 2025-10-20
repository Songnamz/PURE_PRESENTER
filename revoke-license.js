/**
 * LICENSE KEY REVOCATION TOOL FOR PURE PRESENTER
 * 
 * This tool allows administrators to revoke/blacklist license keys.
 * Revoked keys will no longer work, even if they haven't expired.
 * 
 * HOW TO USE:
 * -----------
 * 1. Open terminal in this directory
 * 2. Run: node revoke-license.js
 * 3. Follow the prompts to revoke license keys
 * 
 * USE CASES:
 * ----------
 * - Customer requests refund
 * - License key was shared/leaked
 * - Suspicious activity detected
 * - Customer violated terms of service
 * - Need to force upgrade to new license
 * 
 * IMPORTANT:
 * ----------
 * Revoked keys are stored in a blacklist file that your app checks.
 * You need to distribute this blacklist file with your app updates.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Blacklist file location (same directory as the tool)
const BLACKLIST_FILE = path.join(__dirname, 'license-blacklist.json');

// Also create a copy in the app folder for distribution
const APP_BLACKLIST_FILE = path.join(__dirname, 'app', 'license-blacklist.json');

/**
 * Load blacklist from file
 */
function loadBlacklist() {
  try {
    if (fs.existsSync(BLACKLIST_FILE)) {
      const data = fs.readFileSync(BLACKLIST_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading blacklist:', err);
  }
  return {
    revokedKeys: [],
    revokedCustomers: [],
    lastUpdated: null
  };
}

/**
 * Save blacklist to file
 */
function saveBlacklist(blacklist) {
  try {
    blacklist.lastUpdated = new Date().toISOString();
    const data = JSON.stringify(blacklist, null, 2);
    
    // Save to main location
    fs.writeFileSync(BLACKLIST_FILE, data, 'utf8');
    
    // Save to app folder (for distribution)
    fs.writeFileSync(APP_BLACKLIST_FILE, data, 'utf8');
    
    return true;
  } catch (err) {
    console.error('Error saving blacklist:', err);
    return false;
  }
}

/**
 * Validate license key format
 */
function validateLicenseKeyFormat(licenseKey) {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return false;
  }
  
  const parts = licenseKey.split('-');
  if (parts.length !== 3) {
    return false;
  }
  
  const [customer, expiry, hash] = parts;
  
  // Validate format
  if (!/^[A-Z0-9]{5,20}$/i.test(customer)) return false;
  if (!/^\d{8}$/.test(expiry)) return false;
  if (!/^[A-F0-9]{16}$/i.test(hash)) return false;
  
  return true;
}

/**
 * Extract customer ID from license key
 */
function extractCustomerID(licenseKey) {
  const parts = licenseKey.split('-');
  return parts[0].toUpperCase();
}

/**
 * Revoke a specific license key
 */
function revokeLicenseKey(licenseKey, reason = '') {
  const blacklist = loadBlacklist();
  
  // Check if already revoked
  const existing = blacklist.revokedKeys.find(item => item.key === licenseKey);
  if (existing) {
    return {
      success: false,
      message: 'This license key is already revoked'
    };
  }
  
  // Add to blacklist
  blacklist.revokedKeys.push({
    key: licenseKey,
    customer: extractCustomerID(licenseKey),
    reason: reason,
    revokedDate: new Date().toISOString()
  });
  
  // Save blacklist
  const saved = saveBlacklist(blacklist);
  
  if (!saved) {
    return {
      success: false,
      message: 'Failed to save blacklist'
    };
  }
  
  return {
    success: true,
    message: 'License key revoked successfully'
  };
}

/**
 * Revoke all licenses for a customer ID
 */
function revokeCustomerID(customerID, reason = '') {
  const blacklist = loadBlacklist();
  
  // Check if already revoked
  const existing = blacklist.revokedCustomers.find(item => item.customer === customerID);
  if (existing) {
    return {
      success: false,
      message: 'This customer ID is already revoked'
    };
  }
  
  // Add to blacklist
  blacklist.revokedCustomers.push({
    customer: customerID.toUpperCase(),
    reason: reason,
    revokedDate: new Date().toISOString()
  });
  
  // Save blacklist
  const saved = saveBlacklist(blacklist);
  
  if (!saved) {
    return {
      success: false,
      message: 'Failed to save blacklist'
    };
  }
  
  return {
    success: true,
    message: 'All licenses for this customer ID revoked successfully'
  };
}

/**
 * List all revoked licenses
 */
function listRevoked() {
  const blacklist = loadBlacklist();
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 REVOKED LICENSES');
  console.log('='.repeat(80));
  
  if (blacklist.revokedKeys.length === 0 && blacklist.revokedCustomers.length === 0) {
    console.log('\n  No revoked licenses found.\n');
    return;
  }
  
  if (blacklist.revokedKeys.length > 0) {
    console.log('\n🔑 REVOKED LICENSE KEYS:');
    console.log('─'.repeat(80));
    blacklist.revokedKeys.forEach((item, idx) => {
      console.log(`\n  ${idx + 1}. License Key: ${item.key}`);
      console.log(`     Customer:    ${item.customer}`);
      console.log(`     Revoked:     ${new Date(item.revokedDate).toLocaleString()}`);
      if (item.reason) {
        console.log(`     Reason:      ${item.reason}`);
      }
    });
    console.log();
  }
  
  if (blacklist.revokedCustomers.length > 0) {
    console.log('\n👤 REVOKED CUSTOMER IDs (ALL LICENSES):');
    console.log('─'.repeat(80));
    blacklist.revokedCustomers.forEach((item, idx) => {
      console.log(`\n  ${idx + 1}. Customer ID: ${item.customer}`);
      console.log(`     Revoked:      ${new Date(item.revokedDate).toLocaleString()}`);
      if (item.reason) {
        console.log(`     Reason:       ${item.reason}`);
      }
    });
    console.log();
  }
  
  if (blacklist.lastUpdated) {
    console.log('─'.repeat(80));
    console.log(`Last Updated: ${new Date(blacklist.lastUpdated).toLocaleString()}`);
  }
  
  console.log('='.repeat(80) + '\n');
}

/**
 * Remove from blacklist (un-revoke)
 */
function unrevokeLicenseKey(licenseKey) {
  const blacklist = loadBlacklist();
  
  const index = blacklist.revokedKeys.findIndex(item => item.key === licenseKey);
  if (index === -1) {
    return {
      success: false,
      message: 'License key not found in blacklist'
    };
  }
  
  blacklist.revokedKeys.splice(index, 1);
  const saved = saveBlacklist(blacklist);
  
  if (!saved) {
    return {
      success: false,
      message: 'Failed to save blacklist'
    };
  }
  
  return {
    success: true,
    message: 'License key removed from blacklist (un-revoked)'
  };
}

/**
 * Create readline interface
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Display menu
 */
function displayMenu() {
  console.log('\n' + '='.repeat(80));
  console.log('          🚫 LICENSE REVOCATION TOOL - PURE PRESENTER');
  console.log('='.repeat(80));
  console.log('\n  1. Revoke a specific license key');
  console.log('  2. Revoke all licenses for a customer ID');
  console.log('  3. List all revoked licenses');
  console.log('  4. Un-revoke (restore) a license key');
  console.log('  5. Export blacklist file');
  console.log('  6. Exit');
  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main menu loop
 */
async function mainMenu() {
  while (true) {
    displayMenu();
    const choice = await question('Select option (1-6): ');
    
    switch (choice) {
      case '1':
        await revokeKeyMenu();
        break;
      case '2':
        await revokeCustomerMenu();
        break;
      case '3':
        listRevoked();
        await question('Press Enter to continue...');
        break;
      case '4':
        await unrevokeMenu();
        break;
      case '5':
        exportBlacklist();
        await question('Press Enter to continue...');
        break;
      case '6':
        console.log('\n👋 Goodbye!\n');
        rl.close();
        return;
      default:
        console.log('\n❌ Invalid option. Please try again.\n');
    }
  }
}

/**
 * Revoke license key menu
 */
async function revokeKeyMenu() {
  console.log('\n' + '─'.repeat(80));
  console.log('REVOKE LICENSE KEY');
  console.log('─'.repeat(80) + '\n');
  
  const licenseKey = await question('Enter license key to revoke: ');
  
  if (!licenseKey.trim()) {
    console.log('\n❌ License key cannot be empty.\n');
    return;
  }
  
  if (!validateLicenseKeyFormat(licenseKey.trim().toUpperCase())) {
    console.log('\n❌ Invalid license key format.\n');
    return;
  }
  
  const reason = await question('Enter reason for revocation (optional): ');
  
  const confirm = await question(`\n⚠️  Confirm revoke license key "${licenseKey.trim().toUpperCase()}"? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('\n🚫 Revocation cancelled.\n');
    return;
  }
  
  const result = revokeLicenseKey(licenseKey.trim().toUpperCase(), reason.trim());
  
  if (result.success) {
    console.log('\n✅ ' + result.message);
    console.log('   License key will be blocked on next app launch.\n');
  } else {
    console.log('\n❌ ' + result.message + '\n');
  }
}

/**
 * Revoke customer ID menu
 */
async function revokeCustomerMenu() {
  console.log('\n' + '─'.repeat(80));
  console.log('REVOKE CUSTOMER ID (ALL LICENSES)');
  console.log('─'.repeat(80) + '\n');
  
  const customerID = await question('Enter customer ID to revoke: ');
  
  if (!customerID.trim()) {
    console.log('\n❌ Customer ID cannot be empty.\n');
    return;
  }
  
  if (!/^[A-Z0-9]{5,20}$/i.test(customerID.trim())) {
    console.log('\n❌ Invalid customer ID format (5-20 alphanumeric chars).\n');
    return;
  }
  
  const reason = await question('Enter reason for revocation (optional): ');
  
  const confirm = await question(`\n⚠️  Confirm revoke ALL licenses for customer "${customerID.trim().toUpperCase()}"? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('\n🚫 Revocation cancelled.\n');
    return;
  }
  
  const result = revokeCustomerID(customerID.trim(), reason.trim());
  
  if (result.success) {
    console.log('\n✅ ' + result.message);
    console.log('   All licenses for this customer will be blocked on next app launch.\n');
  } else {
    console.log('\n❌ ' + result.message + '\n');
  }
}

/**
 * Un-revoke menu
 */
async function unrevokeMenu() {
  console.log('\n' + '─'.repeat(80));
  console.log('UN-REVOKE (RESTORE) LICENSE KEY');
  console.log('─'.repeat(80) + '\n');
  
  const licenseKey = await question('Enter license key to restore: ');
  
  if (!licenseKey.trim()) {
    console.log('\n❌ License key cannot be empty.\n');
    return;
  }
  
  const confirm = await question(`\n⚠️  Confirm restore license key "${licenseKey.trim().toUpperCase()}"? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('\n🚫 Operation cancelled.\n');
    return;
  }
  
  const result = unrevokeLicenseKey(licenseKey.trim().toUpperCase());
  
  if (result.success) {
    console.log('\n✅ ' + result.message);
    console.log('   License key will work again on next app launch.\n');
  } else {
    console.log('\n❌ ' + result.message + '\n');
  }
}

/**
 * Export blacklist file
 */
function exportBlacklist() {
  console.log('\n' + '─'.repeat(80));
  console.log('EXPORT BLACKLIST FILE');
  console.log('─'.repeat(80));
  
  const blacklist = loadBlacklist();
  
  console.log('\n📁 Blacklist files created:');
  console.log(`   1. ${BLACKLIST_FILE}`);
  console.log(`   2. ${APP_BLACKLIST_FILE}`);
  console.log('\n📝 Instructions:');
  console.log('   1. Copy "license-blacklist.json" to your app folder');
  console.log('   2. Package and distribute the updated app');
  console.log('   3. Revoked licenses will be blocked on next launch');
  console.log('\n📊 Statistics:');
  console.log(`   Revoked Keys:        ${blacklist.revokedKeys.length}`);
  console.log(`   Revoked Customers:   ${blacklist.revokedCustomers.length}`);
  if (blacklist.lastUpdated) {
    console.log(`   Last Updated:        ${new Date(blacklist.lastUpdated).toLocaleString()}`);
  }
  console.log();
}

// Main execution
console.log('\n🚀 Starting License Revocation Tool...\n');
mainMenu().catch(err => {
  console.error('Error:', err);
  rl.close();
});
