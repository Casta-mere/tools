const admin = require('firebase-admin');
const path = require('path');

// Parse --prod flag before initializing
const isProd = process.argv.includes('--prod');
const keyFile = isProd ? './firebaseKey-prod.json' : './firebaseKey-dev.json';
const serviceAccount = require(keyFile);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

if (isProd) {
  console.log('⚠ Using PROD Firebase account\n');
}

/**
 * Get user by phone number
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @returns {Promise<object>} User record
 */
async function getUserByPhoneNumber(phoneNumber) {
  try {
    // Ensure phone number is in correct format
    if (!phoneNumber.startsWith('+')) {
      console.warn('Phone number should start with + for E.164 format');
    }

    const userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);

    console.log(JSON.stringify(userRecord.toJSON(), null, 2));

    return userRecord;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error('No user found with phone number:', phoneNumber);
    } else if (error.code === 'auth/invalid-phone-number') {
      console.error(
        'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
      );
    } else {
      console.error('Error fetching user:', error.message);
    }
    throw error;
  }
}

/**
 * List all users with their phone numbers (for reference)
 * @param {number} maxResults - Maximum number of users to list (default: 10)
 */
async function listUsersWithPhoneNumbers(maxResults = 10) {
  try {
    const listUsersResult = await admin.auth().listUsers(maxResults);

    console.log(`\nFound ${listUsersResult.users.length} users:`);
    listUsersResult.users.forEach((userRecord, index) => {
      if (userRecord.phoneNumber) {
        console.log(`\n${index + 1}. Phone: ${userRecord.phoneNumber}`);
        console.log(`   UID: ${userRecord.uid}`);
        console.log(`   Email: ${userRecord.email || 'N/A'}`);
      }
    });

    return listUsersResult.users;
  } catch (error) {
    console.error('Error listing users:', error.message);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => a !== '--prod');

  if (args.length === 0) {
    console.log('Usage: node phoneNumber.js [--prod] <phone_number>');
    console.log('Example: node phoneNumber.js +1234567890');
    console.log('         node phoneNumber.js --prod +1234567890');
    console.log('\nOr use: node phoneNumber.js [--prod] --list to see all users');
    process.exit(1);
  }

  if (args[0] === '--list') {
    listUsersWithPhoneNumbers()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    const phoneNumber = args[0];
    getUserByPhoneNumber(phoneNumber)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = {
  getUserByPhoneNumber,
  listUsersWithPhoneNumbers,
};
