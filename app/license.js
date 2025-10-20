const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Secret key for encryption (CHANGE THIS TO YOUR OWN SECRET!)
const ENCRYPTION_KEY = 'AIU-CHURCH-PRESENTER-2025-SECRET-KEY-CHANGE-THIS-32CHARS!!';
const ALGORITHM = 'aes-256-cbc';

// License file location in AppData
const LICENSE_DIR = path.join(os.homedir(), 'AppData', 'Local', 'AIU-CHURCH-PRESENTER');
const LICENSE_FILE = path.join(LICENSE_DIR, 'license.dat');

// Blacklist file location
const BLACKLIST_FILE = path.join(__dirname, 'license-blacklist.json');

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
    revokedCustomers: []
  };
}

/**
 * Check if license key is revoked
 */
function isLicenseRevoked(licenseKey) {
  const blacklist = loadBlacklist();
  
  // Extract customer ID from license key
  const parts = licenseKey.split('-');
  const customerID = parts[0];
  
  // Check if specific key is revoked
  const keyRevoked = blacklist.revokedKeys.some(item => item.key === licenseKey);
  if (keyRevoked) {
    return { revoked: true, reason: 'This license key has been revoked' };
  }
  
  // Check if customer ID is revoked (all licenses for this customer)
  const customerRevoked = blacklist.revokedCustomers.some(item => item.customer === customerID);
  if (customerRevoked) {
    return { revoked: true, reason: 'All licenses for this customer have been revoked' };
  }
  
  return { revoked: false };
}

/**
 * Encrypt text
 */
function encrypt(text) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt text
 */
function decrypt(text) {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

/**
 * Validate license key format and signature
 * License key format: CUSTOMER-EXPIRY-HASH
 * Example: CHURCH123-20261019-A7F3E9D2C4B1F8E6
 */
function validateLicenseKeyFormat(licenseKey) {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return { valid: false, error: 'Invalid license key format' };
  }

  const parts = licenseKey.split('-');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid license key format' };
  }

  const [customer, expiry, hash] = parts;

  // Validate customer ID (alphanumeric, 5-20 chars)
  if (!/^[A-Z0-9]{5,20}$/i.test(customer)) {
    return { valid: false, error: 'Invalid customer ID in license key' };
  }

  // Validate expiry date (YYYYMMDD format)
  if (!/^\d{8}$/.test(expiry)) {
    return { valid: false, error: 'Invalid expiration date format' };
  }

  // Validate hash (16 hex characters)
  if (!/^[A-F0-9]{16}$/i.test(hash)) {
    return { valid: false, error: 'Invalid license signature' };
  }

  // Verify the hash matches
  const expectedHash = generateHash(customer, expiry);
  if (hash.toUpperCase() !== expectedHash) {
    return { valid: false, error: 'License key signature verification failed' };
  }

  // Parse expiry date
  const year = parseInt(expiry.substring(0, 4));
  const month = parseInt(expiry.substring(4, 6)) - 1;
  const day = parseInt(expiry.substring(6, 8));
  const expiryDate = new Date(year, month, day, 23, 59, 59);

  if (isNaN(expiryDate.getTime())) {
    return { valid: false, error: 'Invalid expiration date' };
  }

  return {
    valid: true,
    customer: customer,
    expiryDate: expiryDate,
    daysRemaining: Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))
  };
}

/**
 * Generate hash for license key verification
 */
function generateHash(customer, expiry) {
  const data = `${customer}-${expiry}-${ENCRYPTION_KEY}`;
  return crypto.createHash('md5').update(data).digest('hex').substring(0, 16).toUpperCase();
}

/**
 * Save license to encrypted file
 */
function saveLicense(licenseKey, customerInfo = '') {
  try {
    // Ensure directory exists
    if (!fs.existsSync(LICENSE_DIR)) {
      fs.mkdirSync(LICENSE_DIR, { recursive: true });
    }

    const licenseData = {
      licenseKey: licenseKey,
      customerInfo: customerInfo,
      activatedDate: new Date().toISOString(),
      lastValidated: new Date().toISOString()
    };

    const encryptedData = encrypt(JSON.stringify(licenseData));
    fs.writeFileSync(LICENSE_FILE, encryptedData, 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving license:', err);
    return false;
  }
}

/**
 * Load license from encrypted file
 */
function loadLicense() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) {
      return null;
    }

    const encryptedData = fs.readFileSync(LICENSE_FILE, 'utf8');
    const decryptedData = decrypt(encryptedData);
    
    if (!decryptedData) {
      return null;
    }

    return JSON.parse(decryptedData);
  } catch (err) {
    console.error('Error loading license:', err);
    return null;
  }
}

/**
 * Delete license file
 */
function deleteLicense() {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      fs.unlinkSync(LICENSE_FILE);
    }
    return true;
  } catch (err) {
    console.error('Error deleting license:', err);
    return false;
  }
}

/**
 * Check if license is valid (main validation function)
 */
function checkLicense() {
  const licenseData = loadLicense();
  
  if (!licenseData) {
    return {
      isValid: false,
      status: 'NO_LICENSE',
      message: 'No license found. Please activate the application.'
    };
  }

  // Check if license is revoked (FIRST - before other checks)
  const revocationCheck = isLicenseRevoked(licenseData.licenseKey);
  if (revocationCheck.revoked) {
    return {
      isValid: false,
      status: 'REVOKED',
      message: revocationCheck.reason
    };
  }

  // Validate the license key format and signature
  const validation = validateLicenseKeyFormat(licenseData.licenseKey);
  
  if (!validation.valid) {
    return {
      isValid: false,
      status: 'INVALID_LICENSE',
      message: validation.error
    };
  }

  // Check if expired
  const now = new Date();
  if (validation.expiryDate < now) {
    return {
      isValid: false,
      status: 'EXPIRED',
      message: `License expired on ${validation.expiryDate.toLocaleDateString()}`,
      expiryDate: validation.expiryDate
    };
  }

  // Check if expiring soon (within 7 days)
  const daysRemaining = validation.daysRemaining;
  const isExpiringSoon = daysRemaining <= 7;

  return {
    isValid: true,
    status: isExpiringSoon ? 'EXPIRING_SOON' : 'ACTIVE',
    message: isExpiringSoon 
      ? `License expires in ${daysRemaining} day(s)` 
      : 'License is active',
    customer: validation.customer,
    expiryDate: validation.expiryDate,
    daysRemaining: daysRemaining,
    activatedDate: licenseData.activatedDate,
    customerInfo: licenseData.customerInfo
  };
}

/**
 * Activate license with a license key
 */
function activateLicense(licenseKey, customerInfo = '') {
  // Check if license is revoked (FIRST)
  const revocationCheck = isLicenseRevoked(licenseKey);
  if (revocationCheck.revoked) {
    return {
      success: false,
      message: revocationCheck.reason
    };
  }

  // Validate the license key
  const validation = validateLicenseKeyFormat(licenseKey);
  
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error
    };
  }

  // Check if already expired
  if (validation.daysRemaining < 0) {
    return {
      success: false,
      message: 'This license key has already expired'
    };
  }

  // Save the license
  const saved = saveLicense(licenseKey, customerInfo);
  
  if (!saved) {
    return {
      success: false,
      message: 'Failed to save license file'
    };
  }

  return {
    success: true,
    message: 'License activated successfully',
    customer: validation.customer,
    expiryDate: validation.expiryDate,
    daysRemaining: validation.daysRemaining
  };
}

/**
 * Get current license data (for display purposes)
 */
function getLicenseData() {
  return loadLicense();
}

module.exports = {
  checkLicense,
  activateLicense,
  deleteLicense,
  getLicenseData,
  generateHash, // Export for license generator tool
  validateLicenseKeyFormat
};
