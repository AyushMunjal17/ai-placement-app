# Gmail Email Setup Guide

## Error: EAUTH - Authentication Failed

If you're seeing this error:
```
Error code: EAUTH
Error response: 535-5.7.8 Username and Password not accepted
```

This means your Gmail App Password is incorrect, expired, or you're using your regular password instead of an App Password.

## Steps to Fix:

### Step 1: Enable 2-Step Verification (if not already enabled)
1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google", find **2-Step Verification**
4. If it's not enabled, click on it and follow the setup process

### Step 2: Generate a New App Password
1. Go directly to: https://myaccount.google.com/apppasswords
   - Or navigate: Google Account → Security → 2-Step Verification → App passwords
2. You may need to sign in again
3. You'll see a field asking for an **App name** (Google's interface has been updated)
4. Type: **AI Placement System** (or any name you prefer like "Node.js App" or "Email Service")
5. Click **Generate** (or the button to create the password)
6. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)
   - ⚠️ **Important**: You can only see this password once! Copy it immediately.
   - **Remove all spaces** when using it in your .env file (e.g., `abcdefghijklmnop`)

### Step 3: Update Your .env File
1. Open `backend/.env` file
2. Find the line: `EMAIL_PASSWORD=your-app-password`
3. Replace `your-app-password` with the 16-character App Password you just generated
   - **Remove all spaces** from the App Password (e.g., `abcdefghijklmnop`)
   - Example: `EMAIL_PASSWORD=abcdefghijklmnop`
4. Make sure `EMAIL_USER` matches your Gmail address exactly
5. Save the file

### Step 4: Restart Your Backend Server
1. Stop your backend server (Ctrl+C)
2. Start it again: `npm start` or `node server.js`
3. You should see in the console:
   ```
   📧 EMAIL_USER exists: true
   📧 EMAIL_PASSWORD exists: true
   ```

### Step 5: Test
1. Try registering a new account
2. Check the backend console - you should see:
   ```
   ✅ Email server connection verified
   ✅ Email sent successfully: <message-id>
   📧 Email sent to: user@example.com
   ```

## Troubleshooting

### Still getting EAUTH error?
- Make sure you're using the **App Password** (16 characters, no spaces), NOT your regular Gmail password
- Verify 2-Step Verification is enabled on your Google Account
- Check that `EMAIL_USER` in `.env` matches your Gmail address exactly (case-sensitive)
- Try generating a new App Password if the old one might be expired

### App Passwords page not showing?
- Make sure 2-Step Verification is enabled first
- Some Google Workspace accounts may have App Passwords disabled by admin
- Try using a personal Gmail account instead

### Alternative: Use SMTP Directly
If App Passwords don't work, you can configure SMTP directly in your `.env`:
```env
EMAIL_SERVICE=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

Then update `backend/utils/emailService.js` to use the SMTP configuration instead of the service configuration.

