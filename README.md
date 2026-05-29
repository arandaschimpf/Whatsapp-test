# WhatsApp OTP Login Demo

A simple Next.js app prepared for Vercel that tests a login flow inverted from the usual pattern:

1. The user registers with a name and phone number.
2. The backend creates a Firebase record with a generated user ID and OTP.
3. The UI opens a `wa.me` link to your WhatsApp business number with a prefilled verification message.
4. The WhatsApp webhook receives the message, checks the OTP and the sender phone number, and marks the user as verified.

Firebase is used only from the backend through `firebase-admin`.

## Features

- Next.js App Router app ready for Vercel
- Firebase Admin SDK used only in server routes
- Registration endpoint backed by Firestore
- WhatsApp webhook verification endpoint for Meta's Cloud API
- Prefilled `wa.me` message containing the user ID and OTP
- Status polling UI to confirm when the webhook validates the user

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Firebase Admin SDK
- WhatsApp Cloud API webhook

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

Copy `.env.example` to `.env.local` and fill in the values.

```bash
cp .env.example .env.local
```

Required variables:

- `FIREBASE_SERVICE_ACCOUNT_KEY`: full Firebase service account JSON serialized into one line
- `FIREBASE_USERS_COLLECTION`: Firestore collection name, defaults to `whatsapp-users`
- `WHATSAPP_DESTINATION_PHONE_NUMBER`: the business phone number that receives the verification message, digits only
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: any random string you choose for Meta webhook verification
- `WHATSAPP_APP_SECRET`: required, used to validate `x-hub-signature-256`

### 3. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Firebase setup

1. Create a Firebase project.
2. Enable Firestore in production mode or test mode.
3. In **Project settings > Service accounts**, generate a new private key.
4. Store the JSON contents in `FIREBASE_SERVICE_ACCOUNT_KEY`.
   - For Vercel, paste the JSON as a single-line string.
   - If you paste JSON with escaped `\n`, the app converts them back to real line breaks.
5. Create a Firestore collection name that matches `FIREBASE_USERS_COLLECTION` or use the default.

The app stores documents like this:

```json
{
  "name": "Ada Lovelace",
  "phoneNumber": "+15551234567",
  "phoneLookupKey": "15551234567",
  "otp": "123456",
  "status": "pending",
  "createdAt": "server timestamp",
  "verifiedAt": null
}
```

When the webhook receives the correct message from the same phone number, the document is updated to `status: "verified"`.

## WhatsApp Cloud API setup

### 1. Create the Meta app

1. Go to the [Meta for Developers](https://developers.facebook.com/) dashboard.
2. Create an app and add the **WhatsApp** product.
3. Complete the basic WhatsApp Cloud API setup steps from Meta.
4. Note the following values:
   - the WhatsApp business phone number used for receiving the verification message
   - the App Secret if you want request signature validation

### 2. Configure the receiving number

Set `WHATSAPP_DESTINATION_PHONE_NUMBER` to your WhatsApp business/test number in international format without `+` or spaces.

Example:

```text
15551234567
```

### 3. Configure the webhook callback

After deploying to Vercel, use this callback URL:

```text
https://your-domain.vercel.app/api/whatsapp/webhook
```

Set the verify token in Meta to the same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

Subscribe the webhook to message events.

### 4. Test the message flow

The app pre-fills a WhatsApp message with this format:

```text
VERIFY
USER_ID: <generated-user-id>
OTP: <generated-otp>
```

The webhook accepts either that labeled format or a compact fallback format:

```text
VERIFY <user-id> <otp>
```

For a verification to succeed:

- the message must come from the same phone number used during registration
- the user ID must exist in Firestore
- the OTP must match the stored OTP

## Vercel deployment

### 1. Import the project

1. Push the repository to GitHub.
2. Import it into Vercel.
3. Framework preset should be detected as Next.js.

### 2. Add environment variables in Vercel

Add the same variables from `.env.local` to the Vercel project settings.

Recommended production values:

- `FIREBASE_SERVICE_ACCOUNT_KEY`
- `FIREBASE_USERS_COLLECTION`
- `WHATSAPP_DESTINATION_PHONE_NUMBER`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

### 3. Deploy

Run a Vercel deployment. Once it is live, copy the deployed URL and configure it in the WhatsApp webhook settings.

## API reference

### `POST /api/register`

Creates a pending user and returns:

```json
{
  "userId": "uuid",
  "name": "Ada Lovelace",
  "phoneNumber": "+15551234567",
  "otp": "123456",
  "status": "pending",
  "message": "VERIFY\nUSER_ID: uuid\nOTP: 123456",
  "waLink": "https://wa.me/..."
}
```

### `GET /api/users/:userId`

Returns the current verification status.

### `GET /api/whatsapp/webhook`

Meta webhook verification handshake endpoint.

### `POST /api/whatsapp/webhook`

Receives WhatsApp messages, validates the sender phone number and OTP, and updates the Firestore record.

## Run validation

```bash
npm run lint
npm run build
```

## Notes

- This demo intentionally keeps Firebase on the server only.
- `WHATSAPP_APP_SECRET` must be set or webhook requests will be rejected.
- The UI polls the backend every 5 seconds after registration until the user is verified.
- You can extend the verified user state into a real session or token once the proof-of-phone step succeeds.
