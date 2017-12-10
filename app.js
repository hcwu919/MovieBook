var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var request = require("request");
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'database2017.c7dghyf3qfms.us-west-2.rds.amazonaws.com',
    user: 'database2017',
    password: '550database2017',
    database: 'Movie_RDS'
});
// var http = require('http');



connection.connect();
// var server = http.createServer(app);

app.set('views',__dirname + '/views');
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

// homepage
app.get("/", function(req, res) {
    res.render("homepage");
});

// search box
app.get('/search', function (req, res) {
    res.render('search');
});


app.post('/result', function(req, res) {
    var content = req.body.searchContent;
    // content = content.split("").join("''");
    var type = req.body.searchType;
    console.log(type);
    console.log(content);
    var query;
    if(type=="title") {
        query = "SELECT DISTINCT m.title, d.title_year, group_concat(g.genres Separator ', ') as genres, d.duration, d.country, d.actor_1_name, d.actor_2_name, " +
            "d.actor_3_name, d.movie_imdb_link, r.RottenTomatoes, r.Metacritic, r.IMDB, r.Fandango_Stars FROM " +
            "Movie m INNER JOIN movie_desc d ON m.imdbId = d.imdbId LEFT JOIN Movie_rate r ON m.imdbId = r.imdbId " +
            "INNER JOIN Genres g ON m.imdbId = g.imdbId WHERE m.title LIKE '%" + content + "%' group by m.title LIMIT 50";
        connection.query(query, function (err, movies) {
            if (err) throw err;
            // console.log(JSON.stringify(movies[0]["IMDB"]));
            // if(!movies){ res.render('404', { isLogin: isLogin }); return; }
            res.render('result', {movies: movies});
        });
    }


});


app.post("/apisearch", function (req, res) {
    var content = req.body.searchContent;
    console.log(content);
    // content = content.split("").join("''");
    var type = req.body.searchType;
    var url = "http://www.omdbapi.com/?i=tt3896198&apikey=b5cf18e9&t="+content;
    request(url,function (error, response, body) {
        console.log(JSON.parse(body));
        if (error) {
            throw error;
        } else {
            var data = JSON.parse(body);
            console.log(data);
            res.render('apisearch', {movie:data})
        }
    });
});



app.get("/movie", function(req, res) {
    res.render("movie");
});



// movie details
app.get('/movieDetails', function(req, res) {
    var mid = req.params.id;
    console.log(mid);
    res.render('movieDetails');
    // var query = "SELECT * FROM Movie WHERE imdbId = " + mid + "";
    // connection.query(query, function (err, movies) {
    //     if(err) throw err;
    //     console.log(query);
    //     var movie = movies[0]["title"];
    //     res.render('movieDetails', {movie : movie});
    // })
});

app.get('/login', function (req, res) {
    res.render('login');
    var uid = req.params.id;
    console.log(mid);

    var query = "SELECT * FROM Recommendation WHERE uid = " + uid +
                "Limit 5";
    connection.query(query, function (err, movies) {
        if(err) throw err;
        console.log(query);
        res.render('homepage/:id', {movie : movies});
    })

    res.render("homepage");
});




app.listen(3000, function() {
	console.log("MovieBook Server Start!");
})

// server.listen(app.get('port'), function(){
//     console.log('Express server listening on port ' + app.get('port'));
// });