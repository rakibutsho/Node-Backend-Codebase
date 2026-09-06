import express from "express";
import { userController } from "./user.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpars/fileUploader";
import { generateSupportMessageEmail } from "../../../shared/emailHTML";
import emailSender from "../../../shared/emailSender";
import config from "../../../config";
import { userValidation } from "./user.validation";
import validateRequest from "../../middlewares/validateRequest";

const router = express.Router();

// *!register user
router.post("/", validateRequest(userValidation.createSchema), userController.createUser);

// Get all  user
router.get("/", auth(UserRole.ADMIN), userController.getUserList);

// Get user by id
router.get("/:id", auth(), userController.getUserById);

// Update user's own Profile
router.put("/profile", auth(), fileUploader.uploadSingle, validateRequest(userValidation.updateSchema), userController.updateProfile);

//Delete user (Admin only)
router.delete("/delete/:id", auth(UserRole.ADMIN), userController.deleteUser);

//Toggle Block (Admin only)
router.put("/toggle-block/:id", auth(UserRole.ADMIN), userController.toggleBlock);

// Helper function to escape HTML for email safety
const escapeHtml = (str: string) =>
    String(str).replace(/[&<>'"]/g, (tag) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    }[tag] || tag));

// Support - USer message to admin
router.post("/support/message", async (req, res) => {
    try {
        const { email, name, phone, message } = req.body;

        if (!email || !name || !phone || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const html = generateSupportMessageEmail({
            email: escapeHtml(email),
            name: escapeHtml(name),
            phone: escapeHtml(phone),
            message: escapeHtml(message),
        });

        await emailSender(`${config.emailSender.email}`, html, "Support Message From User");

        res.json({ success: true, message: "Message sent to admin" });
    } catch (error) {
        res.status(500).json({ error: "Failed to send message" });
    }
});

// Upload photo
router.post("/upload-photo", fileUploader.uploadSingle, auth(), userController.uploadPhoto);

// Approve Users
router.put("/approve-users/:id", auth(UserRole.ADMIN), userController.approveUsers);

// Reject Users
router.put("/reject-users/:id", auth(UserRole.ADMIN), userController.rejectUsers);

export const userRoutes = router;
