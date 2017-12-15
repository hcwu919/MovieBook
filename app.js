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
mongoose.connect("mongodb://Yinchuan:123123123qq@ds129010.mlab.com:29010/movie_review", {useMongoClient: true});
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

        query = "SELECT DISTINCT t.imdbId, t.title\n" +
            "FROM(\n" +
            "(SELECT r.recom_imdbId AS imdbId, m.title AS title\n" +
            "FROM Recommendation r inner join Movie m on r.recom_imdbId = m.imdbId\n" +
            "WHERE r.like_imdbId = \n" +
            "(SELECT ul.imdbId\n" +
            "FROM User u INNER JOIN user_like ul ON u.userId = ul.User_ID\n" +
            "WHERE u.userId = '" + userId + "'\n" +
            "ORDER BY ul.rating DESC\n" +
            "LIMIT 0, 1))\n" +
            "UNION\n" +
            "(SELECT r.recom_imdbId AS imdbId, m.title AS title\n" +
            "FROM Recommendation r inner join Movie m on r.recom_imdbId = m.imdbId\n" +
            "WHERE r.like_imdbId = \n" +
            "(SELECT ul.imdbId\n" +
            "FROM User u INNER JOIN user_like ul ON u.userId = ul.User_ID\n" +
            "WHERE u.userId = '" + userId + "'\n" +
            "ORDER BY ul.rating DESC\n" +
            "LIMIT 1, 1))\n" +
            "UNION\n" +
            "(SELECT r.recom_imdbId AS imdbId, m.title AS title\n" +
            "FROM Recommendation r inner join Movie m on r.recom_imdbId = m.imdbId\n" +
            "WHERE r.like_imdbId = \n" +
            "(SELECT ul.imdbId\n" +
            "FROM User u INNER JOIN user_like ul ON u.userId = ul.User_ID\n" +
            "WHERE u.userId = '" + userId + "'\n" +
            "ORDER BY ul.rating DESC\n" +
            "LIMIT 2, 1))) t\n" +
            "ORDER BY RAND()\n" +
            "LIMIT 5";
        connection.query(query, function (err, movies) {
            console.log(userId);
            console.log(JSON.stringify(movies));
            res.render('homepage', {movies: movies, isLogin: isLogin, username: username, userId: userId});
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
    var isLogin = false;
    var user = req.user;
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
    }


    res.render('search', {isLogin: isLogin, username: username, userId: userId});
});


// search result page
app.post('/result', function(req, res) {
    var isLogin = false;
    console.log(JSON.stringify(req.user));
    var user = req.user;
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
    }
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
            res.render('result', {movies: movies, isLogin: isLogin, username: username, userId: userId});
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
            res.render('result', {movies: movies,isLogin: isLogin, username: username, userId: userId});
        });
    }
    if(type==="country") {
        query = "SELECT DISTINCT m.imdbId as id, m.title, d.title_year, group_concat(g.genres Separator ', ') as genres, d.duration, d.country, d.actor_1_name, d.actor_2_name, " +
            "d.actor_3_name, d.movie_imdb_link, r.RottenTomatoes, r.Metacritic, r.IMDB, r.Fandango_Stars FROM " +
            "Movie m INNER JOIN movie_desc d ON m.imdbId = d.imdbId LEFT JOIN Movie_rate r ON m.imdbId = r.imdbId " +
            "INNER JOIN Genres g ON m.imdbId = g.imdbId WHERE d.country LIKE '%" + content + "%' group by m.title LIMIT 50";
        connection.query(query, function (err, movies) {
            if (err) throw err;
            res.render('result', {movies: movies,isLogin: isLogin, username: username, userId: userId});
        });
    }
    if(type==="year") {
        query = "SELECT DISTINCT m.imdbId as id, m.title, d.title_year, group_concat(g.genres Separator ', ') as genres, d.duration, d.country, d.actor_1_name, d.actor_2_name, " +
            "d.actor_3_name, d.movie_imdb_link, r.RottenTomatoes, r.Metacritic, r.IMDB, r.Fandango_Stars FROM " +
            "Movie m INNER JOIN movie_desc d ON m.imdbId = d.imdbId LEFT JOIN Movie_rate r ON m.imdbId = r.imdbId " +
            "INNER JOIN Genres g ON m.imdbId = g.imdbId WHERE d.title_year LIKE '%" + content + "%' group by m.title LIMIT 50";
        connection.query(query, function (err, movies) {
            if (err) throw err;
            res.render('result', {movies: movies,isLogin: isLogin, username: username, userId: userId});
        });
    }
    if(type==="genres") {
        query = "SELECT DISTINCT m.imdbId as id, m.title, d.title_year, group_concat(g.genres Separator ', ') as genres, d.duration, d.country, d.actor_1_name, d.actor_2_name, " +
            "d.actor_3_name, d.movie_imdb_link, r.RottenTomatoes, r.Metacritic, r.IMDB, r.Fandango_Stars FROM " +
            "Movie m INNER JOIN movie_desc d ON m.imdbId = d.imdbId LEFT JOIN Movie_rate r ON m.imdbId = r.imdbId " +
            "INNER JOIN Genres g ON m.imdbId = g.imdbId WHERE g.genres LIKE '%" + content + "%' group by m.title LIMIT 50";
        connection.query(query, function (err, movies) {
            if (err) throw err;
            res.render('result', {movies: movies,isLogin: isLogin, username: username, userId: userId});
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
            res.render('apisearch', {movie:data, isLogin: isLogin, username: username, userId: userId})
        }
    });
});


// ===================================  Movie ====================================

app.get("/movie", function(req, res) {
    res.render("movie");
});


// movie details
app.get('/movie/:id', function(req, res) {
    var isLogin = false;
    var user = req.user;
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
    }


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
                var reviews = JSON.stringify(result);
                reviews = JSON.parse(reviews);
                res.render('movieDetails',{id:req.params.id, reviews:reviews, movie: data,isLogin: isLogin, username: username, userId: userId});
            });
        }
    });
});

app.get("/movie/:id/comments/new", function (req, res) {
    review.find({imdbID:req.params.id}, function (err, review) {
        if(err) {
            throw err;
        } else {
            var query = "SELECT m.title as moviename FROM Movie m WHERE m.imdbId="+Number(req.params.id);
            connection.query(query, function (err, movie) {
                if (err) {
                    throw err;
                } else {
                    res.render("comment", {id:req.params.id, review: review, movie: movie});
                }
            })
        }
    })
});

app.post("/movie/:id/comment", function (req, res) {
    review.find({imdbID: req.params.id}, function (err, movie) {
        if (err) {
            res.redirect("/movie/"+res.params.id);
        } else {
            movie[0]["review"] += ".," + req.body.comment["content"];
            console.log(movie[0]);
            movie[0].save();
            res.redirect("/movie/"+req.params.id);
        }
    })
})

//==============================================================================





// ============================== AUTH ROUT =====================================
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

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    var isLogin = req.isAuthenticated();
    res.redirect("login", {isLogin: isLogin});
}

// =======================================================================

// ==================================== Rank List ============================================
// imdb rank
app.get('/imdb', function (req, res) {
    var isLogin = false;
    console.log(JSON.stringify(req.user));
    var user = req.user;
    if (req.isAuthenticated()) {
        isLogin = true;
        user = JSON.stringify(user);
        var username = JSON.parse(user)["username"];
        var userId = JSON.parse(user)["_id"].toString();
        var sum = 0;
        for (var i = 0; i < userId.length; i++) {
            sum += userId.charCodeAt(i);
        }
        userId = sum % 600;
        userId = userId.toString();
    }
    query = "Select distinct M.imdbId as id, d.title_year, d.duration, d.duration, d.country, d.actor_1_name, " +
        "d.actor_2_name, d.actor_3_name, d.movie_imdb_link, M.title, MR.IMDB From Movie_rate MR INNER JOIN movie_desc " +
        "d ON MR.imdbId = d.imdbId Inner Join Movie M on MR.imdbId = M.imdbId " +
        "Order by MR.IMDB Desc Limit 10";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        console.log(JSON.stringify(movies));
        res.render('imdb_rank', {movies: movies, isLogin: isLogin, userId: userId, username: username});
    });
});

// metacritic rank
app.get('/metacritic', function (req, res) {
    var isLogin = false;
    console.log(JSON.stringify(req.user));
    var user = req.user;
    if (req.isAuthenticated()) {
        isLogin = true;
        user = JSON.stringify(user);
        var username = JSON.parse(user)["username"];
        var userId = JSON.parse(user)["_id"].toString();
        var sum = 0;
        for (var i = 0; i < userId.length; i++) {
            sum += userId.charCodeAt(i);
        }
        userId = sum % 600;
        userId = userId.toString();
    }
    query = "Select distinct M.imdbId as id, M.title, d.title_year, d.duration, d.duration, d.country, d.actor_1_name, " +
        "d.actor_2_name, d.actor_3_name, d.movie_imdb_link, MR.Metacritic From Movie_rate MR INNER JOIN movie_desc d ON " +
        "MR.imdbId = d.imdbId Inner Join Movie M on MR.imdbId = M.imdbId " +
        "Order by MR.Metacritic Desc Limit 10";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        console.log(JSON.stringify(movies));
        res.render('metacritic_rank', {movies: movies, isLogin: isLogin, userId: userId, username: username});
    });
});

// rotten tomatoes rank
app.get('/rotten_tomatoes', function (req, res) {
    var isLogin = false;
    console.log(JSON.stringify(req.user));
    var user = req.user;
    if (req.isAuthenticated()) {
        isLogin = true;
        user = JSON.stringify(user);
        var username = JSON.parse(user)["username"];
        var userId = JSON.parse(user)["_id"].toString();
        var sum = 0;
        for (var i = 0; i < userId.length; i++) {
            sum += userId.charCodeAt(i);
        }
        userId = sum % 600;
        userId = userId.toString();
    }
    query = "Select distinct M.imdbId as id, M.title, d.title_year, d.duration, d.duration, d.country, d.actor_1_name, " +
        "d.actor_2_name, d.actor_3_name, d.movie_imdb_link, MR.RottenTomatoes From Movie_rate MR INNER JOIN movie_desc " +
        "d ON MR.imdbId = d.imdbId Inner Join Movie M on MR.imdbId = M.imdbId " +
        "Order by MR.RottenTomatoes Desc Limit 10";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        console.log(JSON.stringify(movies));
        res.render('tomato_rank', {movies: movies, isLogin: isLogin, userId: userId, username: username});
    });
});

// fadango rank
app.get('/fandango', function (req, res) {
    var isLogin = false;
    console.log(JSON.stringify(req.user));
    var user = req.user;
    if (req.isAuthenticated()) {
        isLogin = true;
        user = JSON.stringify(user);
        var username = JSON.parse(user)["username"];
        var userId = JSON.parse(user)["_id"].toString();
        var sum = 0;
        for (var i = 0; i < userId.length; i++) {
            sum += userId.charCodeAt(i);
        }
        userId = sum % 600;
        userId = userId.toString();
    }
    query = "Select distinct M.imdbId as id, M.title, d.title_year, d.duration, d.duration, d.country, d.actor_1_name, " +
        "d.actor_2_name, d.actor_3_name, d.movie_imdb_link, MR.Fandango_Stars From Movie_rate MR INNER JOIN movie_desc " +
        "d ON MR.imdbId = d.imdbId Inner Join Movie M on MR.imdbId = M.imdbId Order by MR.Fandango_Stars Desc Limit 10";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        console.log(JSON.stringify(movies));
        res.render('fandango_rank', {movies: movies, isLogin: isLogin, userId: userId, username: username});
    });
});

// rank of all
app.get('/rank', function (req, res) {
    var isLogin = false;
    console.log(JSON.stringify(req.user));
    var user = req.user;
    if (req.isAuthenticated()) {
        isLogin = true;
        user = JSON.stringify(user);
        var username = JSON.parse(user)["username"];
        var userId = JSON.parse(user)["_id"].toString();
        var sum = 0;
        for (var i = 0; i < userId.length; i++) {
            sum += userId.charCodeAt(i);
        }
        userId = sum % 600;
        userId = userId.toString();
    }
    query = "Select distinct m.imdbId as id, m.title, d.title_year, d.duration, d.duration, d.country, d.actor_1_name, d.actor_2_name, " +
        "d.actor_3_name, d.movie_imdb_link, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + mr.Fandango_Stars/0.5 " +
        ")/4 AS avg_rate From Movie m INNER JOIN movie_desc d ON m.imdbId = d.imdbId Inner join  Movie_rate mr on m.imdbId=mr.imdbId Order by avg_rate DESC Limit 10";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        console.log(JSON.stringify(movies));
        res.render('ranklist', {movies: movies, isLogin: isLogin, userId: userId, username: username});
    });
});

//===========================================================================

// ================== Genres ============================================

app.get('/action', function(req, res) {
    var isLogin = false;
    var user = req.user;
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
    }
    query = "Select distinct m.imdbId as id, d.title_year as title_year, d.duration as duration, d.country, " +
        "d.actor_1_name,d.actor_2_name, d.actor_3_name, d.movie_imdb_link, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId INNER JOIN movie_desc d ON mr.imdbId = d.imdbId  Where g.genres = 'Action' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies,isLogin: isLogin, username: username, userId: userId});
    });
});

app.get('/comedy', function(req, res) {
    var isLogin = false;
    var user = req.user;
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
    }
    query = "Select distinct m.imdbId as id, d.title_year as title_year, d.duration as duration, d.country,d.actor_1_name,d.actor_2_name, d.actor_3_name, d.movie_imdb_link, g.genres, m.title As Title, " +
        "(mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId  INNER JOIN movie_desc d ON mr.imdbId = d.imdbId  Where g.genres = 'Comedy' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies,isLogin: isLogin, username: username, userId: userId});
    });
});

app.get('/drama', function(req, res) {
    var isLogin = false;
    var user = req.user;
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
    }
    query = "Select distinct m.imdbId as id, d.title_year as title_year, d.duration as duration, d.country,d.actor_1_name,d.actor_2_name, d.actor_3_name, d.movie_imdb_link, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId INNER JOIN movie_desc d  ON mr.imdbId = d.imdbId  Where g.genres = 'Drama' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies,isLogin: isLogin, username: username, userId: userId});
    });
});

app.get('/thriller', function(req, res) {
    var isLogin = false;
    var user = req.user;
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
    }
    query = "Select distinct m.imdbId as id, d.title_year as title_year, d.duration as duration, d.country,d.actor_1_name,d.actor_2_name, d.actor_3_name, d.movie_imdb_link, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId  INNER JOIN movie_desc d ON mr.imdbId = d.imdbId  Where g.genres = 'Thriller' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies,isLogin: isLogin, username: username, userId: userId});
    });
});

app.get('/crime', function(req, res) {
    var isLogin = false;
    var user = req.user;
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
    }
    query = "Select distinct m.imdbId as id, d.title_year as title_year, d.duration as duration, d.country,d.actor_1_name,d.actor_2_name, d.actor_3_name, d.movie_imdb_link, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId  INNER JOIN movie_desc d ON mr.imdbId = d.imdbId  Where g.genres = 'Crime' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies,isLogin: isLogin, username: username, userId: userId});
    });
});

app.get('/horror', function(req, res) {
    var isLogin = false;
    var user = req.user;
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
    }
    query = "Select distinct m.imdbId as id, d.title_year as title_year, d.duration as duration, d.country,d.actor_1_name,d.actor_2_name, d.actor_3_name, d.movie_imdb_link, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId  INNER JOIN movie_desc d  ON mr.imdbId = d.imdbId Where g.genres = 'Horror' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies,isLogin: isLogin, username: username, userId: userId});
    });
});

app.get('/romance', function(req, res) {
    var isLogin = false;
    var user = req.user;
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
    }
    query = "Select distinct m.imdbId as id, d.title_year as title_year, d.duration as duration, d.country,d.actor_1_name,d.actor_2_name, d.actor_3_name, d.movie_imdb_link, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId  INNER JOIN movie_desc d ON mr.imdbId = d.imdbId  Where g.genres = 'Romance' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies,isLogin: isLogin, username: username, userId: userId});
    });
});

app.get('/documentary', function(req, res) {
    var isLogin = false;
    var user = req.user;
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
    }
    query = "Select distinct m.imdbId as id, d.title_year as title_year, d.duration as duration, d.country,d.actor_1_name,d.actor_2_name, d.actor_3_name, d.movie_imdb_link, g.genres, m.title As Title, (mr.RottenTomatoes / 10 + mr.Metacritic /9.4 + mr.IMDB / 0.8 + " +
        "mr.Fandango_Stars/0.5 )/4 AS Avr_rate From Movie m Inner join  Movie_rate mr on m.imdbId=mr.imdbId INNER " +
        "JOIN Genres g ON m.imdbId = g.imdbId  INNER JOIN movie_desc d ON mr.imdbId = d.imdbId  Where g.genres = 'Documentary' Order by Avr_rate DESC LIMIT 5";
    connection.query(query, function (err, movies) {
        if (err) throw err;
        res.render('genre', {movies: movies,isLogin: isLogin, username: username, userId: userId});
    });
});

//===========================================================================

//=============================== User Page ============================================
app.get('/userpage/:userId', function(req, res) {
    var isLogin = false;
    console.log(JSON.stringify(req.user));
    var user = req.user;
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

        var id = req.params.userId;
        console.log(id);
        query = "SELECT DISTINCT ul.User_ID FROM user_like ul WHERE ul.User_ID NOT IN (SELECT DISTINCT User_ID " +
            "FROM user_like WHERE imdbId NOT IN (SELECT imdbId FROM user_like WHERE User_ID = '" + id + "')) AND ul.User_ID " +
            "!= '" + id + "' GROUP BY ul.User_ID ORDER BY COUNT(ul.imdbId) DESC LIMIT 5";
        connection.query(query, function (err, same_like) {
            query = "Select User_ID2\n" +
                "From Following\n" +
                "Where User_ID = '" + id + "' and User_ID2 in (Select User_ID\n" +
                "From Following\n" +
                "Where User_ID2 = '" + id + "')";
            connection.query(query, function (err, friend) {
                query = "Select User_id2\n" +
                    "From Following \n" +
                    "Where User_id = '" + id + "'";
                connection.query(query, function (err, follow) {
                    query = "Select m.imdbId, m.title\n" +
                        "From Movie m Inner join  user_like ul on m.imdbId=ul.imdbId \n" +
                        "where User_ID = '" + id + "' and rating > 2.5";
                    connection.query(query, function (err, movie_like) {
                        query = "Select DISTINCT u.userName FROM User u WHERE u.userId = '" + id + "'";
                        connection.query(query, function (err, name) {
                            if(err) throw err;
                            console.log(JSON.stringify(same_like));
                            console.log(JSON.stringify(friend));
                            console.log(JSON.stringify(follow));
                            console.log(JSON.stringify(movie_like));
                            console.log(JSON.stringify(name));
                            res.render('userpage', {id: id, same_like: same_like, friend: friend, follow: follow, movie_like: movie_like, name: name, userId: userId});
                        });
                    });
                });
            });
        });
    }
});
//===========================================================================

app.get('/thanks', function (req, res) {
    res.render('thanks');
});

app.listen(3000, function() {
	console.log("MovieBook Server Start!");
});

