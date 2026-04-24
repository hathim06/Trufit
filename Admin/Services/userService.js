const userModel = require('../../User/models/userModel');
const addressModel = require('../../User/models/addressModel');

const getUsersService = async (queryParams) => {
    const search = queryParams.search || "";
    const status = queryParams.status || "";
    const page = parseInt(queryParams.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const query = {
        isAdmin: false,
        $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
        ]
    };

    if (status === 'active') query.isBlocked = false;
    if (status === 'blocked') query.isBlocked = true;

    const totalUsers = await userModel.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await userModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        users,
        search,
        status,
        currentPage: page,
        totalPages,
        totalUsers,
        limit
    };
};

const blockUserService = async (id) => {
    await userModel.findByIdAndUpdate(id, { isBlocked: true });
};

const unblockUserService = async (id) => {
    await userModel.findByIdAndUpdate(id, { isBlocked: false });
};

const deleteUserService = async (id) => {
    await userModel.findByIdAndDelete(id);
};

const getUserDetails = async (id) => {
    try {
        const user = await userModel.findById(id);
        if (!user) {
            throw new Error("User not found");
        }
        const addresses = await addressModel.find({ userId: id });
        return { user, addresses };
    }
    catch (error) {
        throw error;
    }
}

module.exports = {
    getUsersService,
    blockUserService,
    unblockUserService,
    deleteUserService,
    getUserDetails
};
