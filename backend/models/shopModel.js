const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
    shopOwner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: [true, 'Please add a shop name']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    location: {
        type: String,
        required: [true, 'Please add a location/nearest city']
    },
    contactNumber: {
        type: String,
        required: [true, 'Please add a contact number'],
        minlength: [10, 'Phone number should only contain 10 characters'],
        maxlength: [10, 'Phone number should only contain 10 characters']
    },
    imageUrl: {
        type: String,
        default: 'https://via.placeholder.com/150'
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    averageRating: {
        type: Number,
        default: 0
    },
    numReviews: {
        type: Number,
        default: 0
    },
    // Set instead of deleting when the shop has order history that must be retained.
    // Archived shops are hidden from public and owner listings. Documents without this field are active.
    archivedAt: {
        type: Date,
        default: null
    }
},{
    timestamps: true
});

shopSchema.index({ shopOwner: 1, archivedAt: 1 });
shopSchema.index({ archivedAt: 1, location: 1, name: 1 });
shopSchema.index({ followers: 1, archivedAt: 1 });

module.exports = mongoose.model('Shop', shopSchema);
