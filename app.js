var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var request = require("request");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var User = require("./models/user");
var review = require("./models/reviews");
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'database2017.c7dghyf3qfms.us-west-2.rds.amazonaws.com',
    user: 'database2017',
    password: '550database2017',
    database: 'Movie_RDS'
});
// var http = require('http');


connection.connect();
mongoose.createConnection("mongodb://Yinchuan:123123123qq@ds129010.mlab.com:29010/movie_review", {useMongoClient: true});
app.use(require("express-session")({
    secret : "moviebook is the best",
    resave : false,
    saveUninitialized : false
}));


// var server = http.createServer(app);
app.set('views',__dirname + '/views');
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//=================================== Home ==================================
// homepage
app.get("/",function(req, res) {
    // =========  log in ? ==============
    var isLogin = false;
    console.log(JSON.stringify(req.user));
    var user = req.user;
    // var username = data["username"];
    if (req.isAuthenticated()) {
        isLogin = true;
        user = JSON.stringify(user);
        var username = JSON.parse(user)["username"];
        var userId = JSON.parse(user)["_id"].toString();
        var sum = 0;
        for(var i = 0; i < userId.length; i++) {
            sum += userId.charCodeAt(i);
        }
        userId = sum % 600;
        userId = userId.toString();
        console.log(userId);
        var path = 'recom/recom.py';

        var spawn = require("child_process").spawn;
        var process = spawn('python',[path, userId]);

        process.stdout.on('data', function (data){
            var movies = data.toString().split('|');
            // movies[0] = movies[0].substring(2, movies[0].length);
            // if(err) throw err;
            console.log(data.toString());
            console.log(movies);
            res.render('homepage', {movies: movies, isLogin: isLogin, username: username});
        });

    } else {
        console.log("isLogin = ", isLogin, "username = ", username);

        //===========   Recommendation   ============
        var query =
            "(Select m.title, m.imdbId as id, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + mr.Fandango_Stars/0.5 )/4 AS rating \n" +
            "From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId Order by rating  DESC Limit 5)\n" +
            "Union All\n" +
            "(SELECT m.title, m.imdbId as id, COUNT(*) As rating \n" +
            "FROM user_like ul natural JOIN Movie m\n" +
            "WHERE ul.rating > 3\n" +
            "GROUP BY ul.imdbId\n" +
            "ORDER BY rating  DESC\n" +
            "Limit 3, 5)";


        connection.query(query, function (err, movies) {
            if (err) throw err;
            console.log(JSON.stringify(movies));
            res.render('homepage', {movies: movies, isLogin : isLogin, username: username});
        });
    }
});





//============================== Search =========================================

// search page
app.get('/search', function (req, res) {
    res.render('search');
});


// search result page
app.post('/result', function(req, res) {
    var content = req.body.searchContent;
    // content = content.split("").join("''");
    var type = req.body.searchType;
    console.log(type);
    console.log(content);
    var query;
    if(type==="title") {
        query = "SELECT DISTINCT m.imdbId as id, m.title, d.title_year, group_concat(g.genres Separator ', ') as genres, d.duration, d.country, d.actor_1_name, d.actor_2_name, " +
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
    if(type==="actors") {
        query = "SELECT DISTINCT m.imdbId as id, m.title, d.title_year, group_concat(g.genres Separator ', ') as genres, d.duration, d.country, d.actor_1_name, d.actor_2_name, " +
            "d.actor_3_name, d.movie_imdb_link, r.RottenTomatoes, r.Metacritic, r.IMDB, r.Fandango_Stars FROM " +
            "Movie m INNER JOIN movie_desc d ON m.imdbId = d.imdbId LEFT JOIN Movie_rate r ON m.imdbId = r.imdbId " +
            "INNER JOIN Genres g ON m.imdbId = g.imdbId WHERE d.actor_1_name LIKE '%" + content + "%' OR d.actor_2_name " +
            "LIKE '%" + content + "%' OR d.actor_3_name LIKE '%" + content + "%' group by m.title LIMIT 50";
        connection.query(query, function (err, movies) {
            if (err) throw err;
            res.render('result', {movies: movies});
        });
    }
    if(type==="country") {
        query = "SELECT DISTINCT m.imdbId as id, m.title, d.title_year, group_concat(g.genres Separator ', ') as genres, d.duration, d.country, d.actor_1_name, d.actor_2_name, " +
            "d.actor_3_name, d.movie_imdb_link, r.RottenTomatoes, r.Metacritic, r.IMDB, r.Fandango_Stars FROM " +
            "Movie m INNER JOIN movie_desc d ON m.imdbId = d.imdbId LEFT JOIN Movie_rate r ON m.imdbId = r.imdbId " +
            "INNER JOIN Genres g ON m.imdbId = g.imdbId WHERE d.country LIKE '%" + content + "%' group by m.title LIMIT 50";
        connection.query(query, function (err, movies) {
            if (err) throw err;
            res.render('result', {movies: movies});
        });
    }
    if(type==="year") {
        query = "SELECT DISTINCT m.imdbId as id, m.title, d.title_year, group_concat(g.genres Separator ', ') as genres, d.duration, d.country, d.actor_1_name, d.actor_2_name, " +
            "d.actor_3_name, d.movie_imdb_link, r.RottenTomatoes, r.Metacritic, r.IMDB, r.Fandango_Stars FROM " +
            "Movie m INNER JOIN movie_desc d ON m.imdbId = d.imdbId LEFT JOIN Movie_rate r ON m.imdbId = r.imdbId " +
            "INNER JOIN Genres g ON m.imdbId = g.imdbId WHERE d.title_year LIKE '%" + content + "%' group by m.title LIMIT 50";
        connection.query(query, function (err, movies) {
            if (err) throw err;
            res.render('result', {movies: movies});
        });
    }
    if(type==="genres") {
        query = "SELECT DISTINCT m.imdbId as id, m.title, d.title_year, group_concat(g.genres Separator ', ') as genres, d.duration, d.country, d.actor_1_name, d.actor_2_name, " +
            "d.actor_3_name, d.movie_imdb_link, r.RottenTomatoes, r.Metacritic, r.IMDB, r.Fandango_Stars FROM " +
            "Movie m INNER JOIN movie_desc d ON m.imdbId = d.imdbId LEFT JOIN Movie_rate r ON m.imdbId = r.imdbId " +
            "INNER JOIN Genres g ON m.imdbId = g.imdbId WHERE g.genres LIKE '%" + content + "%' group by m.title LIMIT 50";
        connection.query(query, function (err, movies) {
            if (err) throw err;
            res.render('result', {movies: movies});
        });
    }
});


// api search result page
app.post("/apisearch", function (req, res) {
    var content = req.body.searchContent;
    console.log(content);
    var url = "http://www.omdbapi.com/?apikey=b5cf18e9&t="+content;
    console.log(url);
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


// ===================================  Movie ====================================

app.get("/movie", function(req, res) {
    res.render("movie");
});


// movie details
app.get('/movie/:id', function(req, res) {
    var mid = req.params.id;
    var pad = "0000000";
    mid = pad.substring(0, pad.length - mid.length) + mid;
    var url = "http://www.omdbapi.com/?apikey=b5cf18e9&i=tt"+mid;
    console.log("url: "+url);
    request(url,function (error, response, body) {
        if (error) {
            throw error;
        } else {
            var data = JSON.parse(body);
            console.log(data);
            console.log(req.params.id);
            review.find({'imdbID':Number(req.params.id)}, function (err, result) {
                if(err) throw err;
                console.log(typeof reviews);
                var reviews = JSON.stringify(result);
                reviews = JSON.parse(reviews);
                res.render('movieDetails',{id:req.params.id, reviews:reviews, movie: data});
            });
            // res.render('movieDetails', {id: req.params.id, movie: data})
        }
    });
});

app.get('/movie/reviews/:id', function (req, res) {
    console.log(req.params.id);
    review.find({'imdbID':Number(req.params.id)},function (err, reviews) {
        if(err) throw err;
        console.log(reviews);
        res.render('reviews',{id:req.params.id, reviews:reviews});
        // res.render('reviews',{reviews:reviews});
    });


    // review.find({imdbID:req.params.id},function (err, reviewSet) {
    //     if (err) {
    //         throw err;
    //     } else {
    //         console.log("success");
    //         console.log(reviewSet);
    //         res.render("reviews",{review: reviewSet});
    //     }
    // });
});

//==============================================================================





// ============================== AUTH ROUT =====================================
// app.get('/secret', function (req, res) {
//     res.render("secret");
// });


// register page
app.get('/register', function (req, res) {
    res.render("register");
});

// register logic
app.post('/register', function (req, res) {
    var newUser = new User({username: req.body.username, password: req.body.password});
    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            return res.render('register');
        }
        passport.authenticate("local")(req, res, function () {
            res.redirect("/");
        })
    })
});


// log in page
app.get('/login', function (req, res) {
    console.log("login");
    res.render("login");
});

// log in logic
// middleware
app.post('/login', passport.authenticate("local",
    {
        successRedirect : "/",
        failureRedirect : "/login"
    }) ,function (req, res) {
});


// log out
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect("/");
});

function isLoggedIn(res, req, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    var isLogin = req.isAuthenticated();
    res.redirect("/login", {isLogin: isLogin});
}

// =======================================================================

// ==================================== Rank List ============================================
// imdb rank
app.get('/imdb', function (req, res) {
    query = "Select distinct m.imdbId as id, M.title, MR.IMDB From Movie_rate MR Inner Join Movie M on MR.imdbId = M.imdbId " +
        "Order by MR.IMDB Desc Limit 10";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        console.log(JSON.stringify(movies));
        res.render('imdb_rank', {movies: movies});
    });
});

// metacritic rank
app.get('/metacritic', function (req, res) {
    query = "Select distinct m.imdbId as id, M.title, MR.Metacritic From Movie_rate MR Inner Join Movie M on MR.imdbId = M.imdbId " +
        "Order by MR.Metacritic Desc Limit 10";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        console.log(JSON.stringify(movies));
        res.render('metacritic_rank', {movies: movies});
    });
});

// rotten tomatoes rank
app.get('/rotten_tomatoes', function (req, res) {
    query = "Select distinct m.imdbId as id, M.title, MR.RottenTomatoes From Movie_rate MR Inner Join Movie M on MR.imdbId = M.imdbId " +
        "Order by MR.RottenTomatoes Desc Limit 10";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        console.log(JSON.stringify(movies));
        res.render('tomato_rank', {movies: movies});
    });
});

// fadango rank
app.get('/fandango', function (req, res) {
    query = "Select distinct m.imdbId as id, M.title, MR.Fandango_Stars From Movie_rate MR Inner Join Movie M on MR.imdbId = M.imdbId Order by MR.Fandango_Stars Desc Limit 10";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        console.log(JSON.stringify(movies));
        res.render('fandango_rank', {movies: movies});
    });
});

// rank of all
app.get('/rank', function (req, res) {
    query = "Select distinct m.imdbId as id, m.title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + mr.Fandango_Stars/0.5 " +
        ")/4 AS avg_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId Order by avg_rate DESC Limit 10";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        console.log(JSON.stringify(movies));
        res.render('ranklist', {movies: movies});
    });
});

//===========================================================================

// ================== Genres ============================================

app.get('/action', function(req, res) {
    query = "Select distinct m.imdbId as id, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId Where g.genres = 'Action' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies});
    });
});

app.get('/comedy', function(req, res) {
    query = "Select distinct m.imdbId as id, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId Where g.genres = 'Comedy' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies});
    });
});

app.get('/drama', function(req, res) {
    query = "Select distinct m.imdbId as id, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId Where g.genres = 'Drama' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies});
    });
});

app.get('/thriller', function(req, res) {
    query = "Select distinct m.imdbId as id, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId Where g.genres = 'Thriller' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies});
    });
});

app.get('/crime', function(req, res) {
    query = "Select distinct m.imdbId as id, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId Where g.genres = 'Crime' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies});
    });
});

app.get('/horror', function(req, res) {
    query = "Select distinct m.imdbId as id, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId Where g.genres = 'Horror' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies});
    });
});

app.get('/romance', function(req, res) {
    query = "Select distinct m.imdbId as id, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId Where g.genres = 'Romance' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies});
    });
});

app.get('/documentary', function(req, res) {
    query = "Select distinct m.imdbId as id, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId Where g.genres = 'Documentary' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies});
    });
});

//===========================================================================

app.get('/userpage/:userId', function(req, res) {
    var username = req.params.userId;
    res.render('userpage');
});


app.listen(3000, function() {
	console.log("MovieBook Server Start!");
});

// server.listen(app.get('port'), function(){
//     console.log('Express server listening on port ' + app.get('port'));
// });