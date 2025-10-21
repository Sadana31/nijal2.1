import express from "express";
import {
  getAllShippingBills,
  getShippingBillById,
  createShippingBill,
  deleteShippingBill
} from "../controllers/sbController.js";

const router = express.Router();

router.get("/", getAllShippingBills);
router.get("/:id", getShippingBillById);
router.post("/", createShippingBill);
router.delete("/:id", deleteShippingBill);

export default router;
