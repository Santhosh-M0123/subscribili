CREATE DATABASE coupon_db;


entities
business
coupons
coupons_constraints
coupons_transactions
discount_values
budget_limits
coupon_usages

create table business{
    id serial int primary key,
    name varchar(255) not null,
    email varchat(255) not null unique,
    created_at date default current_timestamp,
    updated_at date default current_timestamp,
    deleted_at date default null
}

insert into business(name, email) values("subscribili", "info@subscribili.in");

create table coupons(
    id serial primary key,
    coupon_name varchar(255) not null,
    sku_id varchar(100) not null unique,
    status boolean default true,
    business_id int references business,
    discount_metrices int not null,
    created_at date default current_timestamp,
    updated_at date default current_timestamp,
    deleted_at date default null
)

create table coupons_constraints(
    id serial primary key,
    usage_count int,
    valid_till date,
    starts_from date,
    coupon_id int references coupons,
    created_at date default current_timestamp,
    updated_at date default current_timestamp,
    deleted_at date default null
)

create table coupons_transactions(
    id serial primary key,
    coupon_id int references coupons,
    initial_state int,
    current_state int,
    created_at date default current_timestamp,
    updated_at date default current_timestamp,
    deleted_at date default null
)

create table coupons_budget_constraints(
    id serial primary key,
    coupon_id int references coupons,
    budget_value int not null,
    alert_value int not null,
    max_allowed_limits int not null,
    buget_remains int not null,
    created_at date default current_timestamp,
    updated_at date default current_timestamp,
    deleted_at date default null
)


create table discount_metrices(
    id serial primary key,
    coupon_id int references coupons,
    price int default 0,
    percentage int default 0,
    created_at date default current_timestamp,
    updated_at date default current_timestamp,
    deleted_at date default null
)