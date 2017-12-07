var express = require("express");
var app = express();
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'database2017.c7dghyf3qfms.us-west-2.rds.amazonaws.com',
    user: 'database2017',
    password: '550database2017',
    database: 'Movie_RDS'
});

console.log("connected");

connection.connect();

app.set("view engine", "ejs");

app.get("/", function(req, res) {
	res.render("homepage");
});

app.get("/movie", function(req, res) {
	res.render("movie");
});

app.get('/movies/:id', function(req, res) {
    var mid = req.params.id;
    console.log(mid);

    var query = "SELECT * FROM Movie WHERE imdbId = " + mid + "";
    connection.query(query, function (err, movies) {
        if(err) throw err;
        console.log(query);
        var movie = movies[0]["title"];
        res.render('movieDetails', {movie : movie});
    })
});

app.listen(3000, function() {
	console.log("MovieBook Server Start!");
});