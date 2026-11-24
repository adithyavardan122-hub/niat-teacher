import { firebaseAuth } from "../config/firebaseAdmin.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token missing"
      });
    }

    const token = authHeader.split(" ")[1];

    const decodedToken = await firebaseAuth.verifyIdToken(token);

    req.user = decodedToken;

    next();

  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid Firebase token"
    });
  }
};
