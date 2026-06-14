import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const razorpay = new Razorpay({
    key_id: process.env.PAYMENT_TEST_APIKEY,
    key_secret: process.env.PAYMENT_TEST_KEYSECRET
});

export default razorpay;
