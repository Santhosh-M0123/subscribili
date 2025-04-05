import { tryCatch } from '../../middlewares/tryCatch.middleware.js';
import { AppError } from '../../middlewares/appError.middleware.js';
import ApiResponse from '../../utils/ApiResponse.utils.js';
import { generateCrypto } from '../../utils/general.util.js';
import { query, getClient } from '../../config/db.config.js';

import {
  checkActiveCouponByName,
  createCoupon,
  listCoupons,
  updateToggleStatus
} from '../../models/coupons.js';

import { getListofCouponTransactions } from '../../models/transactions.js';

export const createNewCouponController = tryCatch(async (req, res) => {
  const {
    coupon_name,
    usage_count,
    valid_till,
    starts_from,
    discount_value,
    discount_method = 1,
    budget_value,
    alert_value,
    max_allowed_limits,
  } = req.body;

  const { id: business_id } = req.user;

  if (!coupon_name) throw new AppError(400, 'Coupon name is required.');

  // Check if coupon exists in active state
  const exists = await checkActiveCouponByName(coupon_name);
  if (exists.length > 0) throw new AppError(400, 'Active coupon with this name already exists.');

  const sku_id = generateCrypto();

  // Transactional insert (to avoid race conditions)
  const result = await createCoupon({
    coupon_name,
    sku_id,
    business_id,
    discount_method,
    usage_count,
    valid_till,
    starts_from,
    discount_value,
    budget_value,
    alert_value,
    max_allowed_limits,
  });

  return res.status(201).json(new ApiResponse(201, 'Coupon created successfully', result));
});

// list of all coupons
export const getCouponList = tryCatch(async (req, res) => {
  const { id } = req.user;

  if (!id) {
    throw new AppError(400, "Business ID is required.");
  }

  const result = await listCoupons(id);

  return res
    .status(200)
    .json(new ApiResponse(200, "List of active coupons", result));
});

const MAX_RETRIES = 5;
export const redeemCoupon = tryCatch(async (req, res) => {
  console.log(`---- running code -------`)
    const { coupon_code , actual_price } = req.body;
    if (!coupon_code || !actual_price) {
        throw new AppError(400, "All required fields (coupon_code, actual_price) must be provided.");
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');
        await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED;');
        // await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;')
        // await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;');
        console.log(`------Transaction locked--------`)

        const coupon_info = await checkActiveCouponByName(coupon_code);

        if(!coupon_info.length > 0){
          throw new AppError(400, "Coupon is invalid or expired")
        }

        let coupon_id = coupon_info[0].id;

        const result = await client.query(`
          SELECT 
            c.id AS coupon_id, 
            c.status AS coupon_status, 
            c.discount_metrices,
            cc.usage_count,
            cc.starts_from,
            cc.valid_till,
            cb.budget_remains,
            cb.max_allowed_limits,
            dm.discount_value AS discount,
            (
              SELECT COUNT(*) 
              FROM coupons_transactions ct 
              WHERE ct.coupon_id = c.id
            ) AS total_transactions
          FROM coupons c
          JOIN coupons_constraints cc ON cc.coupon_id = c.id
          JOIN coupons_budget_constraints cb ON cb.coupon_id = c.id
          JOIN discount_metrices dm ON dm.coupon_id = c.id
          WHERE c.id = $1 AND c.status = true
          FOR UPDATE
        `, [coupon_id]);

        const validations = result.rows[0];

        if(parseInt(validations.total_transactions) >= validations.usage_count){
          throw new AppError(400, "Coupon Limit Exceed!. Please contact Administrator.");
        }

        const currentUnix = Math.floor(Date.now() / 1000);

        const start_time = parseInt(validations.starts_from);
        const end_time = parseInt(validations.valid_till)

        if (currentUnix < start_time) {
          throw new AppError(400, "Coupon is not yet started for redeem");
        }
        if (currentUnix > end_time) {
          await client.query(`UPDATE coupons SET status = false WHERE id = $1`, [coupon_id]);
          throw new AppError(400, "Coupon validity has expired.");
        }

        // Calculate discount
        let toDeduct = 0;
        let finalValue = actual_price;

        if (validations.discount_metrices === 1) {
          const discount_price = validations.discount;
          if(actual_price < discount_price){
            throw new AppError(400, "Under minimum amount limit");
          }
          // Fixed discount
          toDeduct = discount_price;
          finalValue = actual_price - toDeduct;
        } else if (validations.discount_metrices === 2) {
          const discountPercentage = validations.discount;

          const actualPrice = parseFloat(actual_price);
          const rawDiscount = (actualPrice * discountPercentage) / 100;
          const toDeduct = parseFloat(rawDiscount.toFixed(2));
          finalValue = parseFloat((actualPrice - toDeduct).toFixed(2));
        }
        // console.log('finalValue befor : ',finalValue)
        finalValue = Math.max(finalValue, 0);
        // console.log('finalValue after : ',finalValue)

        // Budget constraint check
        const remaining = parseFloat(validations.budget_remains);
        const maxLimit = parseFloat(validations.max_allowed_limits);

        // console.log('remaining', remaining)
        // console.log('maxlimit', maxLimit)

        const updatedBudget = remaining - toDeduct;

        // console.log('updatebudge', updatedBudget)

        if (remaining < maxLimit || remaining < toDeduct || updatedBudget < maxLimit) {
          await client.query(`UPDATE coupons SET status = false WHERE id = $1`, [coupon_id]);
          throw new AppError(400, "Coupon budget constraints violated.");
        }

        await client.query(
          `INSERT INTO coupons_transactions (coupon_id, initial_state, current_state) VALUES ($1, $2, $3)`,
          [coupon_id, remaining, updatedBudget]
        );

        await client.query(
          `UPDATE coupons_budget_constraints SET budget_remains = $1 WHERE coupon_id = $2`,
          [updatedBudget, coupon_id]
        );


        await client.query('COMMIT');
        console.log(`------Transaction Commited--------`)

        return res.status(200).json({
            success: true,
            message: "Coupon redeemed successfully!",
            data: {
                original_price: actual_price,
                discounted_price: finalValue
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});


// get all coupon transactions
export const getAllTransactions = tryCatch(async (req, res) => {
  const { sku_id } = req.query;

  if (!sku_id) {
      throw new AppError(400, "sku_id Id is required!");
  }

  const client = await getClient();

  const couponInfo = await client.query(`
    select id from coupons where sku_id = $1
    `, [sku_id])

  if(!couponInfo.rows.length > 0){
    throw new AppError(400, "Coupon Id is required!");
  }

  const coupon_id = couponInfo.rows[0].id;


  // const query = `
  //     SELECT 
  //         ct.initial_state, 
  //         ct.current_state, 
  //         ct.updated_at,
  //         c.coupon_name
  //     FROM coupons_transactions ct
  //     LEFT JOIN coupons c ON ct.coupon_id = c.id
  //     WHERE ct.coupon_id = $1
  //     ORDER BY ct.updated_at DESC
  // `;

  // const transactions = await client.query(query, [coupon_id]);
  const transactions = await getListofCouponTransactions(coupon_id);

  return res.status(200).json(
      new ApiResponse(200, "Transactions fetched successfully", transactions)
  );
});


// Update Coupon
export const updateCoupons = tryCatch( async (req,res) => {
  const {status} = req.body;
  const {sku_id} = req.query;

  const result = await updateToggleStatus(status, sku_id);

  return res.status(200).json(new ApiResponse(200, "Status Update Successful", result));
})