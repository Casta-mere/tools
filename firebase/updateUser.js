const admin = require("firebase-admin");

// Parse --prod flag before initializing
const isProd = process.argv.includes("--prod");
const keyFile = isProd ? "../firebaseKey.prod.json" : "../firebaseKey.json";
const serviceAccount = require(keyFile);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

function getArgValue(args, flagName) {
  const index = args.indexOf(flagName);
  if (index === -1 || index + 1 >= args.length) {
    return null;
  }

  return args[index + 1];
}

function printUsage() {
  console.log(
    "Usage: node updateUser.js [--prod] --uid <uid> [--displayName <name>] [--email <email>] [--role <role>]",
  );
  console.log(
    'Example: node updateUser.js --uid abc123 --displayName "Jane Doe" --email jane@example.com',
  );
  console.log(
    "         node updateUser.js --prod --uid abc123 --email jane@example.com",
  );
  console.log("         node updateUser.js --uid abc123 --role admin");
}

/**
 * Update Firebase user profile fields.
 * @param {object} input
 * @param {string} input.uid
 * @param {string | null} input.displayName
 * @param {string | null} input.email
 * @returns {Promise<object>} Updated user record
 */
async function updateUserProfile({ uid, displayName, email }) {
  try {
    const updates = {};

    if (displayName !== null) {
      updates.displayName = displayName;
    }

    if (email !== null) {
      updates.email = email;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error(
        "No update fields provided. Use --displayName and/or --email.",
      );
    }

    const userRecord = await admin.auth().updateUser(uid, updates);

    console.log(JSON.stringify(userRecord.toJSON(), null, 2));
    return userRecord;
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.error("No user found with uid:", uid);
    } else if (error.code === "auth/invalid-email") {
      console.error("Invalid email format:", email);
    } else if (error.code === "auth/email-already-exists") {
      console.error("Email is already in use:", email);
    } else {
      console.error("Error updating user:", error.message);
    }

    throw error;
  }
}

/**
 * Update the role custom claim of a Firebase user.
 * @param {string} uid
 * @param {string} role
 * @returns {Promise<void>}
 */
async function updateUserRole(uid, role) {
  try {
    // Preserve existing custom claims, only overwrite role
    const userRecord = await admin.auth().getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role });

    const updated = await admin.auth().getUser(uid);
    console.log(JSON.stringify(updated.toJSON(), null, 2));
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.error("No user found with uid:", uid);
    } else {
      console.error("Error updating role:", error.message);
    }

    throw error;
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => a !== "--prod");
  const uid = getArgValue(args, "--uid");
  const displayName = getArgValue(args, "--displayName");
  const email = getArgValue(args, "--email");
  const role = getArgValue(args, "--role");

  if (!uid) {
    printUsage();
    process.exit(1);
  }

  if (displayName === null && email === null && role === null) {
    printUsage();
    process.exit(1);
  }

  if (isProd) {
    console.log("⚠ Using PROD Firebase account\n");
  }

  if (role !== null) {
    updateUserRole(uid, role)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    updateUserProfile({ uid, displayName, email })
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = {
  updateUserProfile,
};
