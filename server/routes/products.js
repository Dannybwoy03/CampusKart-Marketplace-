import express from "express";
import multer from "multer";
import { authenticateJWT } from "../middleware/auth.js";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createReview,
  bulkUploadProducts,
  searchProducts,
  reportProduct,
  getMyProducts,
} from "../controllers/products.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/", listProducts);
router.get("/my", authenticateJWT, getMyProducts);
router.get("/search", searchProducts);
router.get("/:id", getProduct);
router.post("/", authenticateJWT, upload.array("images", 5), createProduct);
router.put("/:id", authenticateJWT, upload.array("images", 5), updateProduct);
router.delete("/:id", authenticateJWT, deleteProduct);
router.post("/bulk-upload", authenticateJWT, upload.single("csv"), bulkUploadProducts);
router.post("/:id/reviews", authenticateJWT, createReview);
router.post('/:id/report', authenticateJWT, reportProduct);

export default router; 