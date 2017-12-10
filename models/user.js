var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
var passportLocalMongoose = require("passport-local-mongoose");

mongoose.connect("mongodb://localhost/users");

var UserSchema = new mongoose.Schema({
    username : String,
    password : String
});
// var MAN = mongoose.model("User", UserSchema);
// var test = new MAN({
//     username : "chuanchuan",
//     password : "666"
// });
//
// test.save(function (err, hhh) {
//     if (err) {
//         console.log("sth wrong");
//     } else {
//         console.log("add a test");
//         console.log(hhh);
//     }
// });


UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);