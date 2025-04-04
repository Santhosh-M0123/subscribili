import { client } from "../config/db.config.js";
import { tryCatch } from "../middlewares/tryCatch.middleware.js";
import ApiResponse from "../utils/ApiResponse.utils.js";
import { AppError } from "../middlewares/appError.middleware.js";
import { generateCrypto } from "../utils/general.util.js";


// create a new coupon for business
export const createNewCouponController = tryCatch(async(req,res) => {
    // destruct the payload
    const { coupon_name, usage_count, valid_till, starts_from,price,percentage, discount_method = 1 } = req.body;
    const {id} = req.user;
    if(!coupon_name){
        throw new AppError(400, 'Coupon name is required in body field.');
    }
    // check whether the coupon exists
    const isCouponExists = await client.query(
        `select * from coupons where coupon_name = $1 and status = true`, [coupon_name]
    );

    console.log(isCouponExists.rows)

    if(isCouponExists.rows.length > 0){
        throw new AppError(400, 'Coupon is already exist in active state.');
    }

    const sku_id = generateCrypto();

    // create a new coupon record - cq ( create query )
    const cq = await client.query(
        `insert into coupons(coupon_name, sku_id, business_id, discount_method) values ($1, $2, $3, $4) RETURNING id;`, [coupon_name, sku_id, id, discount_method]
    );
    throw new AppError();
    

    const coupon_id = cq.rows[0].id;

    const ccq = await client.query(
        `insert into coupons_constraints(usage_count,valid_till,starts_from, coupon_id) values($1, $2, $3, $4)`, 
        [usage_count, valid_till, starts_from, coupon_id]
    );

    // add discount
    const dmq = await client.query(
        `insert into discount_metrices(coupon_id,price,percentage) values($1, $2, $3)`, 
        [coupon_id, price, percentage]
    );

    return res.status(201).json(new ApiResponse(201, "Coupon created successfully", cq.rows[0]));
})


// get list of all coupons of status true
export const getCouponList = tryCatch(async (req,res) => {
    const {id} = req.user;
    if(!id){
        throw new AppError(400, "Business Id is required")
    }
    const coupons = await client.query(`
        select coupons.id,coupons.coupon_name, coupons.sku_id, coupons.status,coupons.discount_method, coupons_constraints.usage_count, coupons_constraints.valid_till,
        coupons_constraints.starts_from, coupons_budget_constraints.budget_value,coupons_budget_constraints.buget_remains from coupons 
        inner join coupons_constraints on coupons.id = coupons_constraints.coupon_id
        left join coupons_budget_constraints on coupons.id = coupons_budget_constraints.coupon_id
        where coupons.business_id = $1 and coupons.status = true
    `, [id]);
    return res.status(200).json(new ApiResponse(200, "List of coupons", coupons.rows))
})

// set coupon budget constraints
export const addBudgetToCoupons = tryCatch(async (req,res) => {
    const {id} = req.user;
    const {coupon_id} = req.query;
    const {budget_value,alert_value,max_allowed_limits} = req.body;
    if(!coupon_id || !budget_value || !alert_value || !max_allowed_limits){
        throw new AppError(400, "All the fields are required")
    }
    if(!id){
        throw new AppError(400, "Business Id is required")
    }
    // this is one to one operation check before adding budgets
    const isAlreadyBudgetCreated = await client.query(
        `select * from coupons_budget_constraints where coupon_id = $1`, [coupon_id]
    );

    if(isAlreadyBudgetCreated.rows.length > 0){
        throw new AppError(400, "Budget already created for this coupon please edit or delete it to create new")
    }
    const coupons = await client.query(
        `insert into coupons_budget_constraints(coupon_id, budget_value, alert_value, max_allowed_limits, buget_remains) values($1, $2, $3, $4, $5)`
        , [coupon_id, budget_value, alert_value, max_allowed_limits, budget_value]);
    return res.status(200).json(new ApiResponse(200, "Budgets Added successfully", coupons.rows))
})

// coupons transaction controllers
// export const redeemCoupon = tryCatch(async (req,res) => {
//     const {coupon_id, actual_price} = req.body;

//     if(!coupon_id || !actual_price){
//         throw new AppError(400, "All body data is required");
//     }

//     // get the coupon validation method
//     const coupon = await client.query(`
//         select * from coupons where id = $1 and status = true   
//     `, [coupon_id]);

//     if(!coupon.rows.length <= 0){
//         throw new AppError(400, "Coupen id is required");
//     }

//     let discount_method = coupon.rows[0].discount_method;

//     const discountRow = await client.query(
//         `select * from discount_metrices where coupon_id = $1`, [coupon_id]
//     );

//     const budgetRow = await client.query(
//         `select * from coupons_budget_constraints where coupon_id = $1`, [coupon_id]
//     )

//     const row = discountRow.rows[0];

//     let final_value = 0;

//     // function to store the transaction record
//     const transaction = async (initial_state, detuct_value) => {
//         let current_state = initial_state - detuct_value;
//         await client.query(
//             `insert into coupons_transactions(coupon_id,initial_state,current_state) values($1, $2, $3)`, [coupon_id,initial_state, current_state]
//         );

//         // detuct from budget
//         await client.query(
//             `update coupons_budget_constraints set buget_remains = $1`, [current_state]
//         )
//     }

//     if(discount_method == 1){
//         const discount_price = row.price;
//         final_value = parseInt(actual_price) - parseInt(discount_price);
//     }

// })

export const redeemCoupon = tryCatch(async (req, res) => {
    const { coupon_id, actual_price } = req.body;

    if (!coupon_id || !actual_price) {
        throw new AppError(400, "All required fields (coupon_id, actual_price) must be provided.");
    }

    const couponResult = await client.query(
        `SELECT * FROM coupons WHERE id = $1 AND status = true`, [coupon_id]
    );
    if (couponResult.rows.length === 0) {
        throw new AppError(400, "Invalid or inactive coupon.");
    }
    const coupon = couponResult.rows[0];

    const constraintsResult = await client.query(
        `SELECT * FROM coupons_constraints WHERE coupon_id = $1`, [coupon_id]
    );
    if (constraintsResult.rows.length === 0) {
        throw new AppError(400, "No constraints found for this coupon.");
    }
    const constraints = constraintsResult.rows[0];

    const discountResult = await client.query(
        `SELECT * FROM discount_metrices WHERE coupon_id = $1`, [coupon_id]
    );
    if (discountResult.rows.length === 0) {
        throw new AppError(400, "No discount metrics found.");
    }
    const discount = discountResult.rows[0];

    const budgetResult = await client.query(
        `SELECT * FROM coupons_budget_constraints WHERE coupon_id = $1`, [coupon_id]
    );
    if (budgetResult.rows.length === 0) {
        throw new AppError(400, "No budget constraints found.");
    }
    const budget = budgetResult.rows[0];

    const transactionCountResult = await client.query(
        `SELECT COUNT(*) FROM coupons_transactions WHERE coupon_id = $1`, [coupon_id]
    );

    const totalTransactions = parseInt(transactionCountResult.rows[0].count, 10);

    // **Validation Checks**
    
    // 1. Check if coupon has exceeded usage limit
    if (totalTransactions >= constraints.usage_count) {
        // update the status to false
        await client.query(`
        update coupons set status = false where id = $1    
        `, [coupon_id])
        throw new AppError(400, "Coupon usage limit has been reached.");
    }

    // 2. Check if coupon is within the valid date range
    const currentDate = new Date();
    const startsFrom = new Date(constraints.starts_from);
    const validTill = new Date(constraints.valid_till);

    if (currentDate < startsFrom) {
        // update the status to false
        await client.query(`
            update coupons set status = false where id = $1    
            `, [coupon_id])
        throw new AppError(400, "Coupon is not yet valid.");
    }
    if (currentDate > validTill) {
        // update the status to false
        await client.query(`
            update coupons set status = false where id = $1    
            `, [coupon_id])
        throw new AppError(400, "Coupon validity has expired.");
    }

    let final_value = actual_price;
    let toDetuct = 0;

    if (coupon.discount_method === 1) {  // Fixed price discount
        final_value = actual_price - discount.price;
        toDetuct = discount.price;
    } else if (coupon.discount_method === 2) {  // Percentage-based discount
        final_value = actual_price - (actual_price * (discount.percentage / 100));
        toDetuct = actual_price * (discount.percentage / 100)
    }

    final_value = Math.max(final_value, 0);

    const transaction = async (initial_state, deduct_value, max) => {
        let current_state = initial_state - deduct_value;

        console.log(initial_state)
        console.log(deduct_value)
        console.log(max)

        // /*
        // budget = 1000
        // limit = 100
        // i = 120
        // c = 80
        // */

        if(initial_state < max){
            await client.query(`
                update coupons set status = false where id = $1    
                `, [coupon_id])
            throw new AppError(400, "Budget Constraints making it inactive")
        }else{
            await client.query(
                `INSERT INTO coupons_transactions (coupon_id, initial_state, current_state) VALUES ($1, $2, $3)`,
                [coupon_id, initial_state, current_state]
            );
    
            await client.query(
                `UPDATE coupons_budget_constraints SET buget_remains = $1 WHERE coupon_id = $2`,
                [current_state, coupon_id]
            );
        }
    };

    await transaction(budget.buget_remains, toDetuct, budget.max_allowed_limits);

    return res.status(200).json({
        success: true,
        message: "Coupon redeemed successfully!",
        data: {
            original_price: actual_price,
            discounted_price: final_value
        }
    });
});

// get all transactions
export const getAllTransactions = tryCatch(async (req, res) => {
    const {coupon_id} = req.query;

    if(!coupon_id){
        throw new AppError(400, "Coupon Id is required!")
    }

    const transactions = await client.query(`select coupons_transactions.initial_state, coupons_transactions.current_state from coupons_transactions
        where coupon_id = $1
        `, [coupon_id]);
    return res.status(200).json(new ApiResponse(200, "Transactions fetched successfully", transactions.rows));
})
