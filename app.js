var express = require("express");
var app = express();

app.set("view engine", "ejs");

app.get("/", function(req, res) {
	res.render("landing");
});


app.listen(3000, function() {
	console.log("MovieBook Server Start!");
})