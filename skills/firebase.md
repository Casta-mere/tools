---
name: firebase
description: Firebase user management — lookup users by phone, list users, update profiles and roles using Firebase Admin SDK
user_invocable: true
---

# Firebase User Management

Use the scripts in the `firebase/` directory to manage Firebase Auth users. All commands must be run from the `firebase/` directory.

## Prerequisites

```bash
cd firebase && npm install firebase-admin
```

## Phone Number Lookup (`phoneNumber.js`)

### Get user by phone number:
```bash
node phoneNumber.js +1234567890
```

### List all users with phone numbers:
```bash
node phoneNumber.js --list
```

### Phone Number Format (E.164)
- Must start with `+`
- Include country code, no spaces or special characters
- Examples: `+11234567890` (US), `+447911123456` (UK), `+85212345678` (HK)

## Update User Profile (`updateUser.js`)

### Update display name and email:
```bash
node updateUser.js --uid <uid> --displayName "New Name" --email user@example.com
```

### Update only email:
```bash
node updateUser.js --uid <uid> --email user@example.com
```

### Update user role (custom claim):
```bash
node updateUser.js --uid <uid> --role admin
```

## Production Environment

Add `--prod` flag to any command to target the production Firebase project:
```bash
node phoneNumber.js --prod +1234567890
node updateUser.js --prod --uid <uid> --displayName "Name"
```
