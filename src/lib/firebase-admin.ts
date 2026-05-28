import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { ConfigurationError } from "@/lib/errors";

function getFirebaseCredentials() {
  const rawValue = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!rawValue) {
    throw new ConfigurationError("FIREBASE_SERVICE_ACCOUNT_KEY is not configured.");
  }

  const parsedValue = JSON.parse(rawValue) as {
    project_id?: string;
    projectId?: string;
    client_email?: string;
    clientEmail?: string;
    private_key?: string;
    privateKey?: string;
  };

  const projectId = parsedValue.project_id ?? parsedValue.projectId;
  const clientEmail = parsedValue.client_email ?? parsedValue.clientEmail;
  const privateKey = (parsedValue.private_key ?? parsedValue.privateKey)?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new ConfigurationError("FIREBASE_SERVICE_ACCOUNT_KEY is missing required service account fields.");
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function getDb() {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(getFirebaseCredentials()),
    });

  return getFirestore(app);
}

export function getUsersCollectionName() {
  return process.env.FIREBASE_USERS_COLLECTION ?? "whatsappUsers";
}
