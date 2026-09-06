import { UserRole } from "@prisma/client";
import prisma from "../../shared/prisma";
import * as bcrypt from "bcrypt";
import config from "../../config";

export const initiateSuperAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn(
      `[SECURITY NOTICE] ADMIN_EMAIL or ADMIN_PASSWORD not set in environment. Using default '${adminEmail}' with temporary password.`
    );
  }

  const saltRounds = Number(config.bcrypt_salt_rounds) || 12;
  const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

  const payload: any = {
    fullName: "Super Admin",
    email: adminEmail,
    password: hashedPassword,
    role: UserRole.ADMIN,
    emailVerified: true,
    status: "ACTIVE",
    isApproved: true,
    isProfileComplete: true,
  };

  const isExistUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (isExistUser) {
    return isExistUser.id;
  }

  const admin = await prisma.user.create({
    data: payload,
    select: {
      id: true,
    },
  });
  return admin.id;
};
