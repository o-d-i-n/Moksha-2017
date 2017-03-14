var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var Team = require('../models/team');
var Event = require('../models/event');
var router = express.Router();
var Hashids = require("hashids");
var nodemailer = require('nodemailer');
var userLogic = require('../logic/userLogic.js');
var config = require('config');
var async = require("async");

var hashids = new Hashids(config.get('hashids').secret, config.get('hashids').no_chars, config.get('hashids').chars);

poolConfig = {
    pool: true,
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use TLS
    auth: {
        user: config.get('nEmail'),
        pass: config.get('nPass')
    }
};
var nMailer = nodemailer.createTransport(poolConfig);

router.get('/', function (req, res) {
    res.render('index', {user: req.user});
});

router.get('/register', function (req, res) {
    res.render('register', {});
});

router.post('/register', function (req, res) {

    moksha_id = '';
    Account.register(new Account({email: req.body.email, endpoint:req.body.endpoint, firstName: req.body.firstName, lastName: req.body.lastName, college: req.body.college, phone_no: req.body.phone_no, dob: req.body.dob}), config.get('hashids').secret, function (err, account) {
        if (err) {
            return res.json({msg: err.msg, error: err});
        }
        passport.authenticate('local')(req, res, function () {
            account.moksha_id = 'M' + hashids.encode(account.accNo);
            account.pass = hashids.encode(account._id);
            moksha_id = account.moksha_id;
            account.save(function (err) {
                if(err)
                    console.log(err);
                else {
                    var set = function(val, moksha_id) {
                        if (val) {
                            console.log("Error: " + moksha_id);
                        }
                    };
                    res.app.render('emails/welcome', {user: data}, function (err, html) {
                        userLogic.sendMail(data.email, "Welcome to Innovision'16!",
                            "Greetings " + data.firstName + " ,Now that you've registered for Innovision '16, we welcome you to this four dimensional journey through space-time.Your INNO ID is " + data.moksha_id + ". You will be able to register for events and participate in them (and probably win exciting prizes!) with this. Please carry your INNO ID and an identification proof on the days of the fest, i.e. 9th to 12th March. If you have any further queries please drop us a mail at pr.innovision.nsit@gmail.com. See you there, Team Innovision"
                            ,html, user.moksha_id, set);
                    });
                    res.json({msg: 'success', moksha_id: account.moksha_id});
                }
            });
        });
    });
});


router.get('/login/fb', passport.authenticate('facebook', {authType: 'rerequest', scope: ['email']}));

router.get('/login/fb/callback',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }), function(req, res) {
        if (req.user.is_new) {
            res.json({is_new: true, });
        } else {
            res.redirect('/');
        }
    }, function(err, req, res) {
        if(err) {
            req.logout();
            res.redirect('/login');
        }
    }
);

router.get('/login', function (req, res) {
    res.render('login');
});

router.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function (req, res) {
    res.json({msg:'success', user :req.user});
});

router.get('/logout', function (req, res) {
    req.logout();
    res.json({msg : 'success'});
});

router.get('/contact', function(req, res) {
    if(req.isAuthenticated()) {
        res.render('contactUs', {user: req.user});
    } else {
        res.render('contactUs', {user: {}});
    }
});

router.post('/contact', function(req, res) {
    var mailOpts;

    mailOpts = {
        from: req.body.name + ' <' + req.body.email + '>', //grab form data from the request body object
        to: config.get('contactEmail'),
        subject: 'Moksha Website Contact Form: ' + req.body.subject,
        text: req.body.mail
    };

    nMailer.sendMail(mailOpts, function(err, response) {
        var user = {};
        if (req.isAuthenticated()) {
            user = req.user;
        }
        if (err) {
            res.json({ msg: 'Error occured, Message not sent.', err: err, user: user});
        } else {
            res.json({ msg: 'Message Sent! Thank You.', err: false, user: {}});
        }
    })
});

router.get('/about', function(req, res) {
    res.render('about');
});

router.get('/sponsors', function(req, res) {
    res.render('sponsors');
});

router.get('/schedule', function(req, res) {
    res.render('schedule');
});

router.get('/campus', function(req, res) {
    res.render('campus');
});

module.exports = router;
