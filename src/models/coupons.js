import { query, getClient } from '../config/db.config.js';
import { AppError } from '../middlewares/appError.middleware.js';


export const checkActiveCouponByName = async (coupon_name) => {
  const res = await query(
    'SELECT id FROM coupons WHERE coupon_name = $1 AND status = true',
    [coupon_name]
  );
  return res.rows;
};

export const createCoupon = async ({
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
}) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const couponInsert = await client.query(
      `INSERT INTO coupons(coupon_name, sku_id, business_id, discount_metrices, status)
       VALUES($1, $2, $3, $4, true) RETURNING id`,
      [coupon_name, sku_id, business_id, discount_method]
    );

    console.log(couponInsert)

    const coupon_id = couponInsert.rows[0].id;

    await client.query(
      `INSERT INTO coupons_constraints (usage_count, valid_till, starts_from, coupon_id)
       VALUES ($1, $2, $3, $4)`,
      [usage_count, valid_till, starts_from, coupon_id]
    );

    await client.query(
      `INSERT INTO discount_metrices (coupon_id, discount_value)
       VALUES ($1, $2)`,
      [coupon_id, discount_value]
    );

    await client.query(
      `INSERT INTO coupons_budget_constraints (coupon_id, budget_value, alert_value, max_allowed_limits, budget_remains)
       VALUES ($1, $2, $3, $4, $5)`,
      [coupon_id, budget_value, alert_value, max_allowed_limits, budget_value] // initial budget_remains = budget_value
    );

    await client.query('COMMIT');
    return { coupon_id, coupon_name, sku_id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const listCoupons = async (id) => {
  try {
    const result = await query(
      `
      SELECT 
        c.id,
        c.coupon_name,
        c.sku_id,
        c.status,
        c.discount_metrices,
        cc.usage_count,
        cc.valid_till,
        cc.starts_from,
        cb.budget_value,
        cb.budget_remains
      FROM coupons as c
      INNER JOIN coupons_constraints as cc ON c.id = cc.coupon_id
      LEFT JOIN coupons_budget_constraints as cb ON c.id = cb.coupon_id
      WHERE c.business_id = $1
      ORDER BY c.created_at DESC
      `,
      [id]
    );

    return result.rows;
  } catch (error) {
    
  }
}

export const updateToggleStatus = async (status, sku_id) => {
  try {
    console.log({status, sku_id})
    const coupon_name = await query(`select coupon_name from coupons where sku_id = $1`, [sku_id]);
    const name = coupon_name.rows[0].coupon_name;

    if(status){
      const checkIfAnyCouponActive = await query(`select * from coupons where coupon_name = $1 and status = true`, [name]);

       console.log(checkIfAnyCouponActive)

    if(checkIfAnyCouponActive.rows.length > 0){
      throw new AppError(400, "The Coupon with same name is already in active state");
    }
    }
    const toggleStatus = await query(`
      update coupons set status = $1 where sku_id = $2
      `, [status, sku_id])

      return toggleStatus.rows;
  } catch (error) {
    throw new Error(error.message);
  }
}