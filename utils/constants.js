export const PRODUCT_STATUS = {
    ACTIVE: 'Active',
    BLOCKED: 'Blocked',
    DELETED: 'Deleted'
};

export const PRODUCT_STATUS_VALUES = Object.values(PRODUCT_STATUS);

export const ORDER_STATUS = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    SHIPPED: 'Shipped',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    RETURNED: 'Returned',
    RETURN_PENDING: 'Return Pending'
};

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

export const PAYMENT_STATUS = {
    PENDING: 'Pending',
    PAID: 'Paid',
    FAILED: 'Failed',
    REFUNDED: 'Refunded'
};

export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);


export const PAYMENT_METHOD = {
    COD: 'COD',
    ONLINE: 'Online',
    WALLET: 'Wallet'
};

export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHOD);

export const ITEM_STATUS = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    SHIPPED: 'Shipped',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    RETURNED: 'Returned'
};

export const ITEM_STATUS_VALUES = Object.values(ITEM_STATUS);


export const SIZES = {
    XS: 'XS',
    S: 'S',
    M: 'M',
    L: 'L',
    XL: 'XL',
    XXL: 'XXL',
    DEFAULT: 'M'
};

export const SIZES_VALUES = Object.values(SIZES).filter(s => s !== SIZES.DEFAULT);


export const BOOLEAN_STRING = {
    TRUE: 'true',
    FALSE: 'false',
    YES: 'Yes',
    NO: 'No'
};


export const DEFAULT_VALUES = {
    PAGE: 1,
    LIMIT: 5,
    LIMIT_100: 100,
    PRODUCT_STATUS: PRODUCT_STATUS.ACTIVE,
    ORDER_STATUS: ORDER_STATUS.PENDING,
    PAYMENT_STATUS: PAYMENT_STATUS.PENDING,
    SIZE: SIZES.M,
    DISCOUNT: 0,
    OFFER_PRICE: null,
    IS_VERIFIED: true,
    IS_DELETED: false,
    IS_DEFAULT: false,
    IS_BLOCKED: false,
    IS_GOOGLE_AUTH: false
};


export const USER_FIELDS = {
    FIRST_NAME: 'firstName',
    LAST_NAME: 'lastName',
    EMAIL: 'email',
    PASSWORD: 'password',
    PHONE: 'phone',
    MOBILE: 'mobile',
    PROFILE_PICTURE: 'profilePicture',
    REFERAL_CODE: 'referalCode',
    IS_BLOCKED: 'isBlocked',
    IS_GOOGLE_AUTH: 'isGoogleAuth'
};


export const PRODUCT_FIELDS = {
    NAME: 'name',
    DESCRIPTION: 'description',
    PRICE: 'price',
    OFFER_PRICE: 'offerPrice',
    DISCOUNT: 'discount',
    CATEGORY_ID: 'categoryId',
    STATUS: 'status',
    QUANTITY: 'quantity',
    SIZE: 'size',
    COLOR: 'color',
    IMAGE: 'image',
    SHOW_ON_HOMEPAGE: 'showOnHomepage',
    IS_VERIFIED: 'isVerified',
    IS_DELETED: 'isDeleted'
};


export const ORDER_FIELDS = {
    ORDER_ID: 'orderId',
    USER_ID: 'userId',
    ITEMS: 'items',
    SHIPPING_ADDRESS: 'shippingAddress',
    PAYMENT_METHOD: 'paymentMethod',
    PAYMENT_STATUS: 'paymentStatus',
    ORDER_STATUS: 'orderStatus',
    SUBTOTAL: 'subtotal',
    DISCOUNT_AMOUNT: 'discountAmount',
    TOTAL_AMOUNT: 'totalAmount',
    RETURN_REASON: 'returnReason',
    CREATED_AT: 'createdAt'
};

export const ADDRESS_FIELDS = {
    NAME: 'name',
    MOBILE: 'mobile',
    PINCODE: 'pincode',
    ADDRESS_LINE: 'addressLine',
    CITY: 'city',
    DISTRICT: 'district',
    STATE: 'state',
    IS_DEFAULT: 'isDefault'
};


export const ROUTES = {
    // User Routes
    LOGIN: '/login',
    SIGNUP: '/signup',
    LOGOUT: '/logout',
    PROFILE: '/profile',
    ADDRESS: '/address',
    ADDRESS_ADD: '/address/add',
    ADDRESS_EDIT: '/address/edit',
    CART: '/cart',
    WISHLIST: '/wishlist',
    CHECKOUT: '/checkout',
    ORDERS: '/orders',
    ORDER_DETAILS: '/order-details',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    VERIFY_OTP: '/verify-otp',
    
    // Admin Routes
    ADMIN_DASHBOARD: '/admin/dashboard',
    ADMIN_PRODUCTS: '/admin/products',
    ADMIN_ADD_PRODUCT: '/admin/add-product',
    ADMIN_EDIT_PRODUCT: '/admin/edit-product',
    ADMIN_USERS: '/admin/users',
    ADMIN_ORDERS: '/admin/orders',
    ADMIN_CATEGORIES: '/admin/categories',
    ADMIN_COUPONS: '/admin/coupons',
    ADMIN_BANNERS: '/admin/banners'
};


export const QUERY_PARAMS = {
    REDIRECT: 'redirect',
    SEARCH: 'search',
    PAGE: 'page',
    LIMIT: 'limit',
    SORT_BY: 'sortBy',
    SORT_ORDER: 'sortOrder',
    CATEGORY: 'category',
    STATUS: 'status',
    ERROR: 'error',
    SUCCESS: 'success',
    MESSAGE: 'message'
};


export const STORAGE_KEYS = {
    OTP_TIMER_EXPIRY: 'otpTimerExpiry',
    RESET_OTP_TIMER_EXPIRY: 'resetOtpTimerExpiry',
    EMAIL_CHANGE_OTP_TIMER: 'emailChangeOtpTimer',
    USER_SESSION: 'user',
    TEMP_USER: 'tempUser',
    RESET_EMAIL: 'resetEmail',
    NEW_EMAIL: 'newEmail'
};


export const VALIDATION_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[6-9]\d{9}$/,
    PINCODE: /^\d{6}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/,
    OTP: /^\d{4}$/,
    NAME: /^[a-zA-Z\s]{3,}$/
};


export const TIMEOUTS = {
    OTP_EXPIRY: 5 * 60 * 1000,  // 5 minutes
    OTP_TIMER_DURATION: 60,      // 60 seconds
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000  // 24 hours
};


export const FILE_UPLOAD = {
    MAX_SIZE_MB: 5,
    MAX_SIZE_BYTES: 5 * 1024 * 1024,
    ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp']
};


export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 5,
    MAX_LIMIT: 100,
    ADMIN_LIMIT: 10
};


export const ERROR_TYPES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    CONFLICT: 'CONFLICT',
    SERVER_ERROR: 'SERVER_ERROR'
};

export const SORT_ORDER = {
    ASC: 1,
    DESC: -1,
    ASCENDING: 'asc',
    DESCENDING: 'desc'
};

export const CURRENCY = {
    SYMBOL: '₹',
    CODE: 'INR',
    NAME: 'Indian Rupee'
};


/**
 * Check if value is a valid status
 * @param {string} value
 * @param {object} statusEnum
 * @returns {boolean}
 */
export const isValidStatus = (value, statusEnum) => {//value=the status i want to check. statusEnum=the enum =containing all valid statuses.
    return Object.values(statusEnum).includes(value);
};

/**
 * Get all valid values from an enum
 * @param {object} enumObj
 * @returns {array}
 */
export const getEnumValues = (enumObj) => {
    return Object.values(enumObj);
};

export default {
    PRODUCT_STATUS,
    ORDER_STATUS,
    PAYMENT_STATUS,
    PAYMENT_METHOD,
    ITEM_STATUS,
    SIZES,
    BOOLEAN_STRING,
    DEFAULT_VALUES,
    USER_FIELDS,
    PRODUCT_FIELDS,
    ORDER_FIELDS,
    ADDRESS_FIELDS,
    ROUTES,
    QUERY_PARAMS,
    STORAGE_KEYS,
    VALIDATION_PATTERNS,
    TIMEOUTS,
    FILE_UPLOAD,
    PAGINATION,
    ERROR_TYPES,
    SORT_ORDER,
    CURRENCY,
    isValidStatus,
    getEnumValues
};
