var express = require("express");
var app = express();

app.set("view engine", "ejs");

app.get("/", function(req, res) {
	res.render("landing");
});

app.get("/introduction", function(req, res) {
	review = [
	{
		userID:"123";
		content:"nsaofdnioasf",
	"sadnlaf",
	"andsfioa"]

	res.render("introduction", {review:review});
})

app.listen(3000, function() {
	console.log("MovieBook Server Start!");
})