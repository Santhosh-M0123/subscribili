import { Router } from "express";
import { createNewCouponController, getCouponList, redeemCoupon, getAllTransactions, updateCoupons  } from "../controllers/v2/v2.controller.js";

const router = Router();

router.post('/create', createNewCouponController);
router.get('/list', getCouponList);
router.post('/redeem', redeemCoupon);
router.get('/transactions', getAllTransactions);
router.put('/update', updateCoupons);

export default router;