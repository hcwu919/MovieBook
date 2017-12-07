var express = require("express");
var app = express();

app.set("view engine", "ejs");

app.get("/", function(req, res) {
	res.render("homepage");
});

app.get("/movie", function(req, res) {
	res.render("movie");
})

app.listen(3000, function() {
	console.log("MovieBook Server Start!");
})