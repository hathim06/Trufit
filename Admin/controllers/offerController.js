import Offer from '../../User/models/offerModel.js';
import { STATUS_CODES } from '../../utils/statusCodes.js';

export const getOffers = async (req, res) => {
    try {
        const offers = await Offer.find().sort({ createdAt: -1 });
        res.render('admin/offers', { offers });
    } catch (error) {
        console.error('Get Offers Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Error fetching offers');
    }
};

export const loadAddOffer = async (req, res) => {
    res.render('admin/add-offer', { message: null });
};

export const addOffer = async (req, res) => {
    try {
        const { name, discountPercentage, validFrom, validTo, isActive } = req.body;
        
        const newOffer = new Offer({
            name,
            discountPercentage: parseFloat(discountPercentage),
            validFrom,
            validTo,
            isActive: isActive === 'true' || isActive === 'on'
        });

        await newOffer.save();
        res.redirect('/admin/offers');
    } catch (error) {
        console.error('Add Offer Error:', error);
        res.render('admin/add-offer', { message: 'Failed to add offer.' });
    }
};

export const loadEditOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.redirect('/admin/offers');
        res.render('admin/edit-offer', { offer, message: null });
    } catch (error) {
        console.error('Load Edit Offer Error:', error);
        res.redirect('/admin/offers');
    }
};

export const updateOffer = async (req, res) => {
    try {
        const { name, discountPercentage, validFrom, validTo, isActive } = req.body;
        
        await Offer.findByIdAndUpdate(req.params.id, {
            name,
            discountPercentage: parseFloat(discountPercentage),
            validFrom,
            validTo,
            isActive: isActive === 'true' || isActive === 'on'
        });

        res.redirect('/admin/offers');
    } catch (error) {
        console.error('Update Offer Error:', error);
        const offer = await Offer.findById(req.params.id);
        res.render('admin/edit-offer', { offer, message: 'Failed to update offer.' });
    }
};

export const deleteOffer = async (req, res) => {
    try {
        await Offer.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Offer Error:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to delete offer.' });
    }
};
