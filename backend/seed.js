const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const User = require('./models/userModel');
const Shop = require('./models/shopModel');
const Book = require('./models/bookModel');
const Review = require('./models/reviewModel');
const Order = require('./models/orderModel');
const Report = require('./models/reportModel');
const Blog = require('./models/Blog');

dotenv.config();

// DEVELOPMENT SEED. It WIPES users, shops, books, reviews, orders, reports and blogs in the target database.
//
//   node seed.js                       dry run: prints the target (host and database name only) and what exists
//   node seed.js --wipe-and-seed       wipes and seeds, but ONLY if the database name ends in -dev, _dev, -test,
//                                      _test, -local, _local, -sandbox or _sandbox, or equals SEED_ALLOWED_DB
//
// Anything else is refused so a production MONGO_URI can never be wiped by accident.
const WIPE = process.argv.includes('--wipe-and-seed');
const SAFE_NAME = /[-_](dev|test|local|sandbox)$/i;
const MODELS = { users: User, shops: Shop, books: Book, reviews: Review, orders: Order, reports: Report, blogs: Blog };

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const guard = async () => {
    const { host, name } = mongoose.connection;
    console.log(`Target database: ${host}/${name}`);
    const counts = {};
    for (const [label, Model] of Object.entries(MODELS)) counts[label] = await Model.countDocuments();
    console.log('Existing documents:', JSON.stringify(counts));

    if (!WIPE) {
        console.log('Dry run: nothing was changed. Re-run with --wipe-and-seed to wipe and seed a development database.');
        process.exit(0);
    }
    const allowed = SAFE_NAME.test(name) || (process.env.SEED_ALLOWED_DB && process.env.SEED_ALLOWED_DB === name);
    if (!allowed) {
        console.error(`Refusing to wipe "${name}": its name does not mark it as a dev/test/local/sandbox database.`);
        console.error('Set SEED_ALLOWED_DB to this exact name only if you are certain it holds disposable data.');
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        await guard();
        for (const Model of Object.values(MODELS)) await Model.deleteMany();

        console.log('Data Cleared!');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        // Create Users
        const createdUsers = await User.insertMany([
            {
                firstName: 'Nandun',
                lastName: 'Samarasekara',
                email: 'nandun@example.com',
                password: hashedPassword,
                userType: 'Customer',
                nearestCity: 'Colombo',
                phoneNumber: '0712345678'
            },
            {
                firstName: 'Kamal',
                lastName: 'Perera',
                email: 'kamal@sarasavi.lk',
                password: hashedPassword,
                userType: 'Shop Owner',
                nearestCity: 'Nugegoda',
                phoneNumber: '0112820000'
            },
            {
                firstName: 'Saman',
                lastName: 'Kumara',
                email: 'saman@vijithayapa.lk',
                password: hashedPassword,
                userType: 'Shop Owner',
                nearestCity: 'Colombo',
                phoneNumber: '0112555555'
            }
        ]);

        const customer = createdUsers[0]._id;
        const sarasaviOwner = createdUsers[1]._id;
        const vijithaOwner = createdUsers[2]._id;

        // Create Shops
        const createdShops = await Shop.insertMany([
            {
                shopOwner: sarasaviOwner,
                name: 'Sarasavi Bookshop',
                description: 'Sri Lanka’s largest bookshop chain with a wide collection of educational, literary, and children books.',
                location: 'Nugegoda',
                contactNumber: '0112820000',
                imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=500&q=80',
                averageRating: 4.8,
                numReviews: 0
            },
            {
                shopOwner: vijithaOwner,
                name: 'Vijitha Yapa Bookshop',
                description: 'The largest English bookstore chain in Sri Lanka, offering a diverse array of international titles.',
                location: 'Colombo 04',
                contactNumber: '0112501000',
                imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=500&q=80',
                averageRating: 4.5,
                numReviews: 0
            }
        ]);

        const sarasaviId = createdShops[0]._id;
        const vijithaId = createdShops[1]._id;

        // Create Books
        await Book.insertMany([
            {
                title: 'Madol Doova',
                author: 'Martin Wickramasinghe',
                description: 'A classic Sri Lankan coming-of-age novel following the adventures of Upali and Jinna.',
                price: 850,
                shop: sarasaviId,
                category: 'Fiction',
                stockCount: 50,
                imageUrl: 'https://shop.martinwickramasinghe.com/wp-content/uploads/2023/09/Madol-E-300x450.jpg'
            },
            {
                title: 'Amba Yahaluwo',
                author: 'T. B. Ilangaratne',
                description: 'A heartwarming story about the friendship between two boys from different social classes in Sri Lanka.',
                price: 750,
                shop: sarasaviId,
                category: 'Children',
                stockCount: 30,
                imageUrl: 'https://covers.openlibrary.org/b/isbn/9789555730587-L.jpg?default=false'
            },
            {
                title: 'Sapiens: A Brief History of Humankind',
                author: 'Yuval Noah Harari',
                description: 'Explores the history of our species from the Stone Age up to the twenty-first century.',
                price: 3500,
                shop: vijithaId,
                category: 'History',
                stockCount: 15,
                imageUrl: 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg?default=false'
            },
            {
                title: 'The Seven Moons of Maali Almeida',
                author: 'Shehan Karunatilaka',
                description: 'Winner of the 2022 Booker Prize. A dead war photographer wakes up in what seems like a celestial visa office.',
                price: 2800,
                shop: vijithaId,
                category: 'Fiction',
                stockCount: 20,
                imageUrl: 'https://covers.openlibrary.org/b/isbn/9781908745903-L.jpg?default=false'
            }
        ]);

        console.log('Data Imported!');
        process.exit();

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB().then(() => {
    seedData();
});
