import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/profile", verifyToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        uid: req.user.uid,
        phoneNumber: req.user.phone_number || req.user.phoneNumber || "+919876543210"
      }
    });
  } catch (error) {
    console.error("Profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default router;
