const isActiveOffer = (offer) => {
    if (!offer || !offer.isActive) return false;

    const now = new Date();
    return new Date(offer.validFrom) <= now && new Date(offer.validTo) >= now;
};

const getOfferCandidates = (product) => {
    const candidates = [];

    if (isActiveOffer(product.offerId)) {
        candidates.push({
            type: 'Product Offer',
            name: product.offerId.name,
            discount: Number(product.offerId.discountPercentage),
            offerPrice: Math.round((Number(product.price || 0) - (Number(product.price || 0) * Number(product.offerId.discountPercentage) / 100)) * 100) / 100
        });
    }

    if (product.categoryId && isActiveOffer(product.categoryId.offerId)) {
        candidates.push({
            type: 'Category Offer',
            name: product.categoryId.offerId.name,
            discount: Number(product.categoryId.offerId.discountPercentage),
            offerPrice: Math.round((Number(product.price || 0) - (Number(product.price || 0) * Number(product.categoryId.offerId.discountPercentage) / 100)) * 100) / 100
        });
    }

    if (product.offerPrice && product.price && product.offerPrice < product.price) {
        const offerPrice = Number(product.offerPrice);
        const basePrice = Number(product.price);
        candidates.push({
            type: 'Sale Price',
            name: '',
            discount: (1 - (offerPrice / basePrice)) * 100,
            offerPrice
        });
    }

    return candidates.filter(candidate => candidate.discount > 0 && candidate.discount <= 100);
};

export const attachEffectiveOffer = (product) => {
    const productObj = typeof product.toObject === 'function' ? product.toObject() : { ...product };
    const basePrice = Number(productObj.price || 0);
    const bestOffer = getOfferCandidates(productObj).sort((a, b) => b.discount - a.discount)[0];

    productObj.effectiveDiscount = bestOffer ? bestOffer.discount : 0;
    productObj.effectiveOfferName = bestOffer ? bestOffer.name : '';
    productObj.effectiveOfferType = bestOffer ? bestOffer.type : '';
    productObj.effectivePrice = bestOffer
        ? bestOffer.offerPrice
        : basePrice;
    productObj.effectiveDiscount = Math.round(productObj.effectiveDiscount);

    return productObj;
};

export const getEffectivePrice = (product, variant = null) => {
    const productObj = attachEffectiveOffer(product);
    if (productObj.effectiveDiscount > 0) return productObj.effectivePrice;
    return Number(variant?.price || productObj.price || 0);
};
