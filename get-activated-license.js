// Helper script to read activated license for PowerShell GUI
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ENCRYPTION_KEY = 'AIU-CHURCH-PRESENTER-2025-SECRET-KEY-CHANGE-THIS-32CHARS!!';
const ALGORITHM = 'aes-256-cbc';

const LICENSE_FILE = path.join(
  os.homedir(),
  'AppData',
  'Local',
  'AIU-CHURCH-PRESENTER',
  'license.dat'
);

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

function getActivatedLicense() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) {
      return { error: 'No license file found' };
    }

    const encryptedData = fs.readFileSync(LICENSE_FILE, 'utf8');
    const decryptedData = decrypt(encryptedData);

    if (!decryptedData) {
      return { error: 'Failed to decrypt license' };
    }

    const licenseData = JSON.parse(decryptedData);
    
    return {
      success: true,
      key: licenseData.licenseKey,
      customer: licenseData.customerInfo || 'Not specified',
      activated: licenseData.activatedDate || licenseData.activatedAt || 'Unknown'
    };
  } catch (err) {
    return { error: err.message };
  }
}

// Output JSON for PowerShell to parse
const result = getActivatedLicense();
console.log(JSON.stringify(result));
