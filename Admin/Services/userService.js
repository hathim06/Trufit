import { MESSAGES } from '../../utils/messages.js';
import userModel from '../../User/models/userModel.js';
import addressModel from '../../User/models/addressModel.js';

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

    const totalAllUsers = await userModel.countDocuments({ isAdmin: false });
    const activeUsersCount = await userModel.countDocuments({ isAdmin: false, isBlocked: false });
    const blockedUsersCount = await userModel.countDocuments({ isAdmin: false, isBlocked: true });

    return {
        users,
        search,
        status,
        currentPage: page,
        totalPages,
        totalUsers,
        totalAllUsers,
        activeUsersCount,
        blockedUsersCount,
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
    const user = await userModel.findById(id);
    if (!user) {
        throw new Error(MESSAGES.USER_NOT_FOUND);
    }
    const addresses = await addressModel.find({ userId: id });
    return { user, addresses };
};

export default {
    getUsersService,
    blockUserService,
    unblockUserService,
    deleteUserService,
    getUserDetails
};
