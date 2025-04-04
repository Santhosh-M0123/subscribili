import { Router } from "express";
import { createNewCouponController, getCouponList, addBudgetToCoupons, redeemCoupon, getAllTransactions } from "../controllers/coupons.controller.js";

const router = Router();

router.post('/create', createNewCouponController);
router.get('/list', getCouponList);
router.post('/budget', addBudgetToCoupons);
router.post('/redeem', redeemCoupon);
router.get('/transactions', getAllTransactions);


export default router;