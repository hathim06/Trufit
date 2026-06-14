import { MESSAGES } from '../../utils/messages.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import productModel from '../../User/models/productModel.js';
import variantModel from '../../User/models/variants.js';
import categoryModel from '../../User/models/categoryModel.js';

const getInventory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const categoryId = req.query.category || '';
        const stockStatus = req.query.stockStatus || '';

        const query = { isDeleted: false };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (categoryId && categoryId !== 'undefined') {
            query.categoryId = categoryId;
        }

        let products = await productModel.find(query)
            .sort({ createdAt: -1 });

        const categories = await categoryModel.find({});

        let productsWithVariants = await Promise.all(products.map(async (product) => {
            const variants = await variantModel.find({ productId: product._id, isDeleted: false });
            return {
                ...product.toObject(),
                variants
            };
        }));


        if (stockStatus) {
            productsWithVariants = productsWithVariants.filter(p => {
                const totalStock = p.variants.length > 0
                    ? p.variants.reduce((sum, v) => sum + v.quantity, 0)
                    : 0;

                if (stockStatus === 'low') return totalStock > 0 && totalStock < 10;
                if (stockStatus === 'out') return totalStock === 0;
                if (stockStatus === 'in') return totalStock >= 10;
                return true;
            });
        }

        const totalItems = productsWithVariants.length;
        const paginatedProducts = productsWithVariants.slice(skip, skip + limit);
        const totalPages = Math.ceil(totalItems / limit);

        res.render('admin/inventory', {
            products: paginatedProducts,
            categories,
            currentPage: page,
            totalPages,
            search,
            selectedCategory: categoryId,
            selectedStockStatus: stockStatus,
            activePage: 'inventory'
        });
    } catch (error) {
        console.error('Get Inventory Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
};

const updateStock = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;

        if (variantId) {
            await variantModel.findByIdAndUpdate(variantId, { quantity });
        } else {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Variant ID is required to update stock' });
        }

        res.json({ success: true, message: 'Stock updated successfully' });
    } catch (error) {
        console.error('Update Stock Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
    }
};

export default {
    getInventory,
    updateStock
};
