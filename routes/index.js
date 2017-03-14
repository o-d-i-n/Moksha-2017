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
var passids = new Hashids(config.get('passids').secret, config.get('passids').no_chars, config.get('passids').chars);

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

router.post('/register', function (req, res) {
    moksha_id = '';
    Account.register(new Account({email: req.body.email, endpoint:req.body.endpoint, firstName: req.body.firstName, lastName: req.body.lastName, college: req.body.college, phone_no: req.body.phone_no, dob: req.body.dob}), config.get('passids').secret, function (err, account) {
        if (err) {
            return res.json({msg: err.msg, error: err});
        }
        passport.authenticate('local')(req, res, function () {
            account.moksha_id = 'M' + hashids.encode(account.accNo);
            account.pass = passids.encode(account.accNo);
            moksha_id = account.moksha_id;
            account.save(function (err, data) {
                if(err)
                    console.log(err);
                else {
                    var set = function(val, moksha_id, err) {
                        if (val) {
                            console.log("Error: " + err + " " + moksha_id);
                        }
                    };
                    res.app.render('emails/welcome', {user: data}, function (err, html) {
                        userLogic.sendMail(data.email, "Welcome to Moksha'17!",
                            "Greetings " + data.firstName + " ,Now that you've registered for Innovision '16, we welcome you to this four dimensional journey through space-time.Your Moksha ID is " + data.moksha_id + " " + data.pass + ". You will be able to register for events and participate in them (and probably win exciting prizes!) with this. Please carry your INNO ID and an identification proof on the days of the fest, i.e. 9th to 12th March. If you have any further queries please drop us a mail at pr.innovision.nsit@gmail.com. See you there, Team Innovision"
                            ,html, data.moksha_id, set);
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

router.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function (req, res) {
    res.json({msg:'success', user :req.user});
});

router.get('/logout', function (req, res) {
    req.logout();
    res.json({msg : 'success'});
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

module.exports = router;
