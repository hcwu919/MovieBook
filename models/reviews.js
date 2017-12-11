var mongoose = require("mongoose");


mongoose.connect("mongodb://Yinchuan:123123123qq@ds129010.mlab.com:29010/movie_review");

var reviews = new mongoose.Schema({
    imdbID: Number,
    review: String
});


module.exports = mongoose.model('review', reviews);

