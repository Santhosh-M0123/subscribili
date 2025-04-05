import { query, getClient } from '../config/db.config.js';

export const getListofCouponTransactions = async (coupon_id) => {
    try {
        const client = await getClient();

        const query = `
        SELECT 
        ct.initial_state, 
        ct.current_state, 
        ct.updated_at,
        c.coupon_name
    FROM coupons_transactions ct
    LEFT JOIN coupons c ON ct.coupon_id = c.id
    WHERE ct.coupon_id = $1
    ORDER BY ct.updated_at DESC
    `;

  const transactions = await client.query(query, [coupon_id]);
  console.log(transactions.rows)
  return transactions.rows;
    } catch (error) {
        throw new Error("Database issues!");
    }
};