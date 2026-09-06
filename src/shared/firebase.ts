import admin, { ServiceAccount } from "firebase-admin";
import { serviceAccount } from "./serviceAccount";

if (!admin.apps.length) {
  if (
    serviceAccount.project_id &&
    serviceAccount.client_email &&
    serviceAccount.private_key
  ) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as ServiceAccount),
      });
      console.log("Firebase Admin initialized successfully.");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
    }
  } else {
    console.warn(
      "Firebase credentials not provided. Push notifications via FCM will be disabled until environment variables are configured."
    );
  }
}

export default admin;

