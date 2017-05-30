var express = require("express");
var app = express();

var http = require('http');
var https = require('https');
var fs = require('fs');

var cookieParser = require("cookie-parser");
var session = require('express-session');

var methodOverride = require("method-override");
var bodyParser = require("body-parser");
var request = require("request");

var passport = require("passport");
var BnetStrategy = require('passport-bnet').Strategy;
var BNET_ID = 'uavm8rpvacsads4ua377hguumppc6uwm'
var BNET_SECRET = 'hFur2adBEpnEt84ya2uxJtTRpEvcprW6'

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});
 
// Use the BnetStrategy within Passport. 
passport.use(new BnetStrategy({
    clientID: BNET_ID,
    clientSecret: BNET_SECRET,
    scope: "wow.profile sc2.profile",
    callbackURL: "https://localhost:3000/auth/bnet/callback"
}, function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
}));

app.use(bodyParser.urlencoded({extended: true}));

// configure Express
app.use(cookieParser());
app.use(session({ secret: 'blizzard',
                  saveUninitialized: true,
                  resave: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

var score;
var user = {
	battletag: "",
	token: "",
	wow: {
		achievementPoints: 0,
		mounts: 0
	}
};

app.get('/auth/bnet',
    passport.authenticate('bnet'));

app.get('/auth/bnet/callback',
    passport.authenticate('bnet', { failureRedirect: '/' }),

    function(req, res){
    	user.battletag = req.user.battletag;
    	user.token = req.user.token;
    	console.log(user.wow.achievementPoints);
    	res.redirect("/profile/" + user.battletag.replace("#", "-"));
    }
);

app.get("/", function(req, res){
	res.render("index");	
});

app.get("/profile/:battletag", function(req, res){
	var WoWcharacters = [];

	//https://www.npmjs.com/package/request#custom-http-headers
	request({ url: 'https://owapi.net/api/v3/u/' + user.battletag.replace("#", "-") + '/stats', headers: { 'User-Agent': 'BlizzScore' }}, function(error, response, body){
		console.log('error:', error);
		console.log('statusCode:', response && response.statusCode);
		console.log(body);

		if(user.token) {
			request('https://us.api.battle.net/wow/user/characters?access_token=' + user.token, function (error, response, body) {
				console.log('error:', error);
				console.log('statusCode:', response && response.statusCode);

				WoWcharacters = JSON.parse(body).characters;

				WoWcharacters.forEach(function(character){
					if(character.achievementPoints > user.wow.achievementPoints){
						user.wow.achievementPoints = character.achievementPoints;
					};
				});

				res.render("profile", { blizzID: user.battletag, wowAP: user.wow.achievementPoints });
			});
		} else {
			res.render("profile", { blizzID: user.battletag, wowAP: user.wow.achievementPoints });
		}
	});	
});

var options = {
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/cert.pem'),
    passphrase: 'blizz'
};

https.createServer(options, app).listen(3000, function(){
	console.log("app started");
});