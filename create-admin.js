require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/userModel');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected...');

        const adminData = {
            firstName: "Admin",
            lastName: "User",
            email: "[EMAIL_ADDRESS]",
            password: "[PASSWORD]",
            isAdmin: true,
            isGoogleAuth: false
        };
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Admin user already exists with this email.');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        const admin = new User({
            ...adminData,
            password: hashedPassword
        });

        await admin.save();
        console.log('-----------------------------------');
        console.log('SUCCESS: Admin user created!');
        console.log(`Email: ${adminData.email}`);
        console.log(`Password: ${adminData.password}`);
        console.log('-----------------------------------');
        console.log('You can now log in at /admin/login');

    } catch (error) {
        console.error('Error creating admin:', error.message);
    } finally {
        mongoose.connection.close();
    }
};

createAdmin();
