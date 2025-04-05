CREATE TABLE business (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

INSERT INTO business (name, email) VALUES ('subscribili', 'info@subscribili.in');

CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    coupon_name VARCHAR(255) NOT NULL,
    sku_id VARCHAR(100) NOT NULL UNIQUE,
    status BOOLEAN DEFAULT true,
    business_id INT REFERENCES business(id),
    discount_metrices INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE UNIQUE INDEX unique_active_coupon_name ON coupons (coupon_name)
WHERE status = true;

CREATE TABLE coupons_constraints (
    id SERIAL PRIMARY KEY,
    usage_count INT,
    valid_till BIGINT,  -- Unix Timestamp
    starts_from BIGINT, -- Unix Timestamp
    coupon_id INT REFERENCES coupons(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE TABLE coupons_transactions (
    id SERIAL PRIMARY KEY,
    coupon_id INT REFERENCES coupons(id) ON DELETE CASCADE,
    initial_state INT,
    current_state INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE TABLE coupons_budget_constraints (
    id SERIAL PRIMARY KEY,
    coupon_id INT REFERENCES coupons(id) ON DELETE CASCADE,
    budget_value INT NOT NULL,
    alert_value INT NOT NULL,
    max_allowed_limits INT NOT NULL,
    budget_remains INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE TABLE discount_metrices (
    id SERIAL PRIMARY KEY,
    coupon_id INT REFERENCES coupons(id) ON DELETE CASCADE,
    discount_value INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);
