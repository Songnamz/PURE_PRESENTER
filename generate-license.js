/**
 * LICENSE KEY GENERATOR FOR PURE PRESENTER
 * 
 * This is a standalone tool for generating license keys.
 * Only you (the developer/admin) should use this tool.
 * 
 * HOW TO USE:
 * -----------
 * 1. Open terminal in this directory
 * 2. Run: node generate-license.js
 * 3. Follow the prompts to generate license keys
 * 
 * LICENSE KEY FORMAT:
 * ------------------
 * CUSTOMER-EXPIRY-HASH
 * Example: CHURCH123-20261019-A7F3E9D2C4B1F8E6
 * 
 * - CUSTOMER: Alphanumeric ID (5-20 chars)
 * - EXPIRY: Date in YYYYMMDD format
 * - HASH: MD5 hash for verification (auto-generated)
 */

const crypto = require('crypto');
const readline = require('readline');

// IMPORTANT: This must match the secret key in license.js
const ENCRYPTION_KEY = 'AIU-CHURCH-PRESENTER-2025-SECRET-KEY-CHANGE-THIS-32CHARS!!';

/**
 * Generate hash for license key verification
 * This MUST match the generateHash function in license.js
 */
function generateHash(customer, expiry) {
  const data = `${customer}-${expiry}-${ENCRYPTION_KEY}`;
  return crypto.createHash('md5').update(data).digest('hex').substring(0, 16).toUpperCase();
}

/**
 * Validate customer ID format
 */
function validateCustomerID(customerId) {
  if (!customerId) return 'Customer ID is required';
  if (customerId.length < 5 || customerId.length > 20) return 'Customer ID must be 5-20 characters';
  if (!/^[A-Z0-9]+$/i.test(customerId)) return 'Customer ID must be alphanumeric only (no spaces or special chars)';
  return null;
}

/**
 * Validate date format
 */
function validateDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'Invalid date format. Use YYYY-MM-DD';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid date';
  if (date <= new Date()) return 'Expiry date must be in the future';
  return null;
}

/**
 * Generate a license key
 */
function generateLicenseKey(customerId, expiryDate) {
  const customer = customerId.toUpperCase();
  const expiry = expiryDate.replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
  const hash = generateHash(customer, expiry);
  return `${customer}-${expiry}-${hash}`;
}

/**
 * Create readline interface for user input
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
 * Display welcome banner
 */
function displayBanner() {
  console.log('\n' + '='.repeat(70));
  console.log('          🔑 PURE PRESENTER - LICENSE KEY GENERATOR');
  console.log('='.repeat(70) + '\n');
}

/**
 * Display license templates
 */
function displayTemplates() {
  const today = new Date();
  const oneYear = new Date(today);
  oneYear.setFullYear(today.getFullYear() + 1);
  const threeYears = new Date(today);
  threeYears.setFullYear(today.getFullYear() + 3);
  const fiveYears = new Date(today);
  fiveYears.setFullYear(today.getFullYear() + 5);

  console.log('\n📋 COMMON LICENSE PERIODS:');
  console.log('─'.repeat(70));
  console.log(`  1 Year:   ${formatDate(oneYear)}  (Expires ${oneYear.toDateString()})`);
  console.log(`  3 Years:  ${formatDate(threeYears)}  (Expires ${threeYears.toDateString()})`);
  console.log(`  5 Years:  ${formatDate(fiveYears)}  (Expires ${fiveYears.toDateString()})`);
  console.log('─'.repeat(70) + '\n');
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Main interactive license generation
 */
async function generateInteractive() {
  displayBanner();
  
  try {
    // Get customer ID
    let customerId = '';
    while (true) {
      customerId = await question('Enter Customer ID (5-20 alphanumeric chars): ');
      const error = validateCustomerID(customerId);
      if (error) {
        console.log(`❌ ${error}\n`);
      } else {
        break;
      }
    }

    // Show license period templates
    displayTemplates();

    // Get expiry date
    let expiryDate = '';
    while (true) {
      expiryDate = await question('Enter Expiry Date (YYYY-MM-DD): ');
      const error = validateDate(expiryDate);
      if (error) {
        console.log(`❌ ${error}\n`);
      } else {
        break;
      }
    }

    // Optional: Get customer info for your records
    const customerInfo = await question('Enter Customer Info (optional - for your records): ');

    // Generate the license key
    const licenseKey = generateLicenseKey(customerId, expiryDate);

    // Display results
    console.log('\n' + '='.repeat(70));
    console.log('✅ LICENSE KEY GENERATED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('\n📋 LICENSE DETAILS:');
    console.log('─'.repeat(70));
    console.log(`  Customer ID:     ${customerId.toUpperCase()}`);
    console.log(`  Expiry Date:     ${expiryDate} (${new Date(expiryDate).toDateString()})`);
    if (customerInfo) {
      console.log(`  Customer Info:   ${customerInfo}`);
    }
    console.log('─'.repeat(70));
    console.log('\n🔑 LICENSE KEY:');
    console.log('─'.repeat(70));
    console.log(`\n  ${licenseKey}\n`);
    console.log('─'.repeat(70));
    console.log('\n📝 INSTRUCTIONS:');
    console.log('  1. Copy the license key above');
    console.log('  2. Send it to your customer');
    console.log('  3. Customer enters it in the activation dialog');
    console.log('  4. Keep this information for your records\n');
    console.log('='.repeat(70) + '\n');

    // Ask if user wants to generate another
    const again = await question('Generate another license? (y/n): ');
    if (again.toLowerCase() === 'y' || again.toLowerCase() === 'yes') {
      await generateInteractive();
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

/**
 * Batch generation mode (for advanced users)
 */
async function generateBatch() {
  console.log('\n📦 BATCH LICENSE GENERATION MODE');
  console.log('─'.repeat(70));
  console.log('Format: CUSTOMER_ID,YYYY-MM-DD,CUSTOMER_INFO');
  console.log('Example: CHURCH001,2026-10-19,First Baptist Church');
  console.log('Enter one per line. Type "done" when finished.\n');

  const licenses = [];
  let lineNum = 1;

  while (true) {
    const input = await question(`Line ${lineNum}: `);
    
    if (input.toLowerCase() === 'done') break;
    if (!input.trim()) continue;

    const parts = input.split(',').map(p => p.trim());
    if (parts.length < 2) {
      console.log('❌ Invalid format. Use: CUSTOMER_ID,YYYY-MM-DD,CUSTOMER_INFO\n');
      continue;
    }

    const [customerId, expiryDate, customerInfo = ''] = parts;
    
    const customerError = validateCustomerID(customerId);
    const dateError = validateDate(expiryDate);
    
    if (customerError || dateError) {
      console.log(`❌ ${customerError || dateError}\n`);
      continue;
    }

    const licenseKey = generateLicenseKey(customerId, expiryDate);
    licenses.push({ customerId, expiryDate, customerInfo, licenseKey });
    console.log(`✅ Generated: ${licenseKey}\n`);
    lineNum++;
  }

  if (licenses.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log(`✅ ${licenses.length} LICENSE KEY(S) GENERATED`);
    console.log('='.repeat(70) + '\n');

    licenses.forEach((lic, idx) => {
      console.log(`${idx + 1}. ${lic.customerId} - Expires ${lic.expiryDate}`);
      console.log(`   ${lic.licenseKey}`);
      if (lic.customerInfo) console.log(`   Info: ${lic.customerInfo}`);
      console.log();
    });
  }

  rl.close();
}

// Main execution
(async () => {
  try {
    console.log('\nSelect mode:');
    console.log('  1. Interactive (generate one license)');
    console.log('  2. Batch (generate multiple licenses)');
    const mode = await question('\nChoice (1 or 2): ');

    if (mode === '2') {
      await generateBatch();
    } else {
      await generateInteractive();
    }
  } catch (error) {
    console.error('Error:', error);
    rl.close();
  }
})();
