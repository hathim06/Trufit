const userService = require('../Services/userService');
const sendOtpEmail = require('../utils/sendEmail');
const userModel = require('../models/userModel');
const otpModel = require('../models/otpModel');
const bcrypt = require('bcrypt');


const registerUser = async (req, res) => {
    try {
        const otp = Math.floor(1000 + Math.random() * 9000);

        req.session.tempUser = req.body;

        // Save OTP to database
        await otpModel.findOneAndUpdate(
            { email: req.body.email },
            { otp: otp, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        await sendOtpEmail(req.body.email, otp);

        console.log("OTP:", otp);
        return res.redirect('/users/verify-otp');

    } catch (error) {
        res.render('users/signup', {
            message: error.message,
            user: null
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const user = await userService.loginUserService(req.body);
        req.session.user = user._id;
        res.redirect('/');
    } catch (error) {
        res.render('users/login', {
            message: error.message,
            success: false,
            user: req.session.user || null
        });
    }
};

const loadLogin = async (req, res) => {
    try {
        res.render('users/login', {
            success: req.query.success,
            message: req.query.message || null,
            user: req.session.user || null
        });
    } catch (error) {
        console.log(error);
    }
};

const loadRegister = async (req, res) => {
    try {
        res.render('users/signup', {
            message: null,
            user: req.session.user || null
        });
    } catch (error) {
        console.log("Signup Error:", error.message);
        res.render('users/signup', {
            message: error.message,
            user: req.session.user || null
        });
    }
};

const logoutUser = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/users/login");
    })
};

const loadForgotPassword = async (req, res) => {
    try {
        res.render('users/forgot-password', {
            message: null,
            user: req.session.user || null
        });
    } catch (error) {
        console.log(error);
    }
};

const loadResetPassword = async (req, res) => {
    try {
        res.render('users/reset-password', {
            message: null,
            user: req.session.user || null
        });
    } catch (error) {
        console.log(error);
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const otp = await userService.forgotPasswordService(req.body);

        await sendOtpEmail(email, otp);

        // Store email in session to be used in the reset step
        req.session.resetEmail = email;

        console.log("OTP:", otp);
        res.redirect('/users/reset-password');

    } catch (error) {
        res.render('users/forgot-password', {
            message: error.message,
            user: null
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { otp, password, confirmPassword } = req.body;
        const email = req.session.resetEmail;

        if (!email) {
            return res.render('users/forgot-password', {
                message: "Session expired. Please start over.",
                user: null
            });
        }

        await userService.resetPasswordService({
            email,
            otp,
            password,
            confirmPassword
        });

        // Clear reset session
        delete req.session.resetEmail;

        res.redirect('/users/login?success=reset-password');
    } catch (error) {
        res.render('users/reset-password', {
            message: error.message,
            user: req.session.user || null
        });
    }
};

const loadOtpPage = async (req, res) => {
    try {
        res.render('users/verify-otp', {
            message: null,
            user: req.session.user || null
        });
    } catch (error) {
        console.log(error);
    }
};

const verifyOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp.join('');

        const tempUser = req.session.tempUser;
        if (!tempUser) {
            return res.render('users/verify-otp', {
                message: "Session expired. Please try again.",
                user: null
            });
        }

        const otpRecord = await otpModel.findOne({ email: tempUser.email });

        if (!otpRecord) {
            return res.render('users/verify-otp', {
                message: "OTP expired. Please resend.",
                user: null
            });
        }

        if (enteredOtp !== otpRecord.otp) {
            return res.render('users/verify-otp', {
                message: "Invalid OTP",
                user: null
            });
        }

        // Delete OTP after successful verification
        await otpModel.deleteOne({ _id: otpRecord._id });

        if (tempUser.isGoogleAuth) {

            let existingUser = await userModel.findOne({ email: tempUser.email });
            let user;

            if (!existingUser) {
                user = new userModel({
                    firstName: tempUser.firstName,
                    lastName: tempUser.lastName,
                    email: tempUser.email,
                    isGoogleAuth: true
                });

                await user.save();
            } else {
                user = existingUser;
            }

            req.session.user = user._id;

            // cleanup session
            delete req.session.tempUser;
            delete req.session.otp;

            return res.redirect('/');

        } else {
            await userService.registerUserService(tempUser);

            delete req.session.tempUser;
            delete req.session.otp;

            return res.redirect('/users/login?success=registered');
        }

    } catch (error) {
        console.log("OTP Verification Error:", error.message);
        res.render('users/verify-otp', {
            message: error.message,
            user: null
        });
    }
};

const googleAuthCallback = async (req, res) => {
    try {
        const { email } = req.user;
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            // Check if existing user is blocked
            if (existingUser.isBlocked) {
                return res.redirect('/users/login?message=Your account has been blocked by admin');
            }
            // User exists, log them in directly
            req.session.user = existingUser._id;
            return res.redirect('/');
        }

        const otp = Math.floor(1000 + Math.random() * 9000);
        req.session.tempUser = req.user;

        await otpModel.findOneAndUpdate(
            { email: email },
            { otp: otp, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        console.log("Google User OTP:", otp);
        await sendOtpEmail(email, otp);

        res.redirect('/users/verify-otp');
    } catch (error) {
        console.log("Google Callback Error:", error.message);
        res.redirect('/users/login');
    }
};

const loadProfile = async (req, res) => {
    try {
        const user = await userModel.findById(req.session.user);
        const defaultAddress = await userService.getDefaultAddressService(req.session.user);
        res.render('users/profile', { user, defaultAddress, query: req.query });
    } catch (error) {
        console.log("Profile Error:", error.message);
        res.redirect('/');
    }
}

const profile = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const user = await User.findById(req.session.user);

        if (!user) {
            console.log("Profile Error: user not found");
            return res.redirect('/login');
        }

        res.render('user/profile', { user });

    } catch (error) {
        console.log("Profile Error:", error);
        res.redirect('/login');
    }
};

const loadEditProfile = async (req, res) => {
    try {
        const user = await userModel.findById(req.session.user);
        res.render('users/profile-edit', { user });
    } catch (error) {
        console.log("Edit Profile Error:", error.message);
        res.redirect('/');
    }
}

const editProfile = async (req, res) => {
    try {
        const { firstName, lastName, mobile } = req.body;
        await userModel.findByIdAndUpdate(req.session.user, {
            firstName,
            lastName,
            mobile
        });
        res.redirect('/users/profile');
    } catch (error) {
        console.log("Edit Profile Error:", error.message);
        res.redirect('/users/profile');
    }
}

const resendOtp = async (req, res) => {
    try {
        if (!req.session.tempUser) {
            return res.redirect('/users/signup');
        }

        const otp = Math.floor(1000 + Math.random() * 9000);
        const email = req.session.tempUser.email;

        await otpModel.findOneAndUpdate(
            { email: email },
            { otp: otp, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        await sendOtpEmail(email, otp);
        console.log("Resent OTP:", otp);
        res.render('users/verify-otp', {
            message: "OTP has been resent to your email.",
            user: null
        });
    } catch (error) {
        console.log("Resend OTP Error:", error.message);
        res.render('users/verify-otp', {
            message: "Failed to resend OTP. Please try again.",
            user: null
        });
    }
}

const loadAddress = async (req, res) => {
    try {
        const addresses = await userService.getAddressService(req.session.user);
        res.render('users/address', { addresses });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
};

const loadAddAddress = async (req, res) => {
    try {
        res.render('users/add-address', {
            user: req.session.user || null,
            message: null
        });
    } catch (error) {
        console.log("Add Address Page Error:", error.message);
        res.redirect('/users/address');
    }
};

const loadEditAddress = async (req, res) => {
    try {
        const address = await userService.getAddressByIdService(req.params.id);
        res.render('users/address-edit', {
            address,
            user: req.session.user || null,
            message: null
        });
    } catch (error) {
        console.log("Edit Address Error:", error.message);
        res.redirect('/users/address');
    }
}

const editAddress = async (req, res) => {
    try {
        await userService.editAddressService({
            userId: req.session.user,
            addressId: req.params.id,
            address: req.body
        });
        res.redirect('/users/address');
    } catch (error) {
        console.log("Edit Address Error:", error.message);
        res.redirect('/users/address');
    }
}

const deleteAddress = async (req, res) => {
    try {
        await userService.deleteAddressService(req.params.id);
        res.redirect('/users/address');
    } catch (error) {
        console.log(error);
        res.redirect('/users/address');
    }
};

const setDefaultAddress = async (req, res) => {
    try {
        await userService.setDefaultAddressService(req.params.id);
        res.redirect('/users/address');
    } catch (error) {
        console.log("Set Default Address Error:", error.message);
        res.redirect('/users/address');
    }
}

const getDefaultAddress = async (req, res) => {
    try {
        const user = await userModel.findById(req.session.user);
        res.render('users/address', user);
    } catch (error) {
        console.log("Get Default Address Error:", error.message);
        res.redirect('/');
    }
}

const addAddress = async (req, res) => {
    try {
        await userService.addAddressService({
            userId: req.session.user,
            address: req.body
        });
        res.redirect('/users/address');
    } catch (error) {
        console.log(error);
        res.redirect('/users/address');
    }
};

const updateProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            console.log("Profile Picture Error: No file uploaded or invalid format");
            return res.redirect('/users/profile?error=No file selected or invalid format');
        }

        const imageUrl = req.file.path;
        console.log("Uploading Profile Picture:", imageUrl);

        await userService.updateProfilePictureService({
            userId: req.session.user,
            profilePicture: imageUrl
        });

        res.redirect('/users/profile?success=Profile picture updated');
    } catch (error) {
        console.error("Profile Picture Controller Error:", error);
        res.redirect('/users/profile?error=' + encodeURIComponent(error.message));
    }
};

const deleteProfilePicture = async (req, res) => {
    try {
        await userService.updateProfilePictureService({
            userId: req.session.user,
            profilePicture: ""
        });

        res.redirect('/users/profile');
    } catch (error) {
        console.log(error);
        res.redirect('/users/profile');
    }
};

const changeEmailOtp = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const existingUser = await userModel.findOne({ email: newEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already exists" })
        }
        const otp = Math.floor(1000 + Math.random() * 9000);
        await otpModel.findOneAndUpdate(
            { email: newEmail },
            { otp: otp, createdAt: Date.now() },
            { upsert: true, new: true }
        );
        await sendOtpEmail(newEmail, otp);
        req.session.newEmail = newEmail;
        res.status(200).json({ success: true, message: "OTP sent successfully" });
    }
    catch (error) {
        console.log("Change Email OTP Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
}

const changeEmail = async (req, res) => {
    try {
        const { otp } = req.body;
        const newEmail = req.session.newEmail;
        if (!newEmail) {
            return res.status(400).json({ message: "session expired.please try again" })
        }
        const otpRecord = await otpModel.findOne({ email: newEmail });
        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({ message: "invalid or expired otp" });
        }
        await userModel.findOneAndUpdate(
            { _id: req.session.user },
            { email: newEmail }
        );
        await otpModel.deleteOne({ email: newEmail });
        delete req.session.newEmail;
        res.status(200).json({ success: true, message: "Email changed successfully" });
    }
    catch (error) {
        console.log("Change Email Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to change email" });
    }
}

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await userModel.findById(req.session.user);

        // Security check for regular users
        if (!user.isGoogleAuth) {
            if (!currentPassword) {
                return res.status(400).json({ success: false, message: "Current password is required" });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: "Incorrect current password" });
            }
        }

        // Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ 
                success: false, 
                message: "Password must include uppercase, lowercase, number and special character" 
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "New passwords do not match" });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        
        // If they were Google Auth, they now have a password
        if (user.isGoogleAuth) {
            user.isGoogleAuth = false;
        }

        await user.save();

        res.status(200).json({ success: true, message: "Password updated successfully" });

    } catch (error) {
        console.log("Update Password Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update password" });
    }
}

module.exports = {
    registerUser,
    loginUser,
    loadLogin,
    loadRegister,
    logoutUser,
    loadForgotPassword,
    loadResetPassword,
    forgotPassword,
    resetPassword,
    loadOtpPage,
    verifyOtp,
    googleAuthCallback,
    loadProfile,
    loadEditProfile,
    editProfile,
    resendOtp,
    loadAddress,
    loadEditAddress,
    editAddress,
    deleteAddress,
    setDefaultAddress,
    getDefaultAddress,
    addAddress,
    loadAddAddress,
    updateProfilePicture,
    deleteProfilePicture,
    profile,
    changeEmail,
    changeEmailOtp,
    updatePassword
};

