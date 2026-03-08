require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const MONGODB_URI = process.env.MONGODB_URI;

const seedAdmin = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        let admin = await Admin.findOne({ username: 'admin' });
        if (admin) {
            console.log('Admin user already exists, updating password...');
            admin.password = 'admin123';
        } else {
            admin = new Admin({
                username: 'admin',
                password: 'admin123',
            });
        }

        await admin.save();
        console.log('Admin user processed successfully');
        console.log('Username: admin');
        console.log('Password: admin123');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding admin:', err);
        process.exit(1);
    }
};

seedAdmin();
