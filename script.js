import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 8,
  iterations: 8,
};

export default function () {
  const url = 'http://localhost:7000/v2/coupon/redeem';

  const payload = JSON.stringify({
    coupon_code: 'TESTER50',
    actual_price: 5000,
  });

  const headers = {
    'Content-Type': 'application/json',
  };

  const res = http.post(url, payload, { headers });

  const passed = check(res, {
    '✔ Coupon redemption successful': (r) => r.status === 200,
  });

  if (!passed) {
    console.error(`❌ Failed for VU ${__VU}: ${res.status} - ${res.body}`);
  }

  sleep(0.3);
}
