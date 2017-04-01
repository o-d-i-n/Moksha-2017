var express = require('express');
var passport = require('passport');
var path = require('path');
var Account = require('../models/account');
var Team = require('../models/team');
var Event = require('../models/event');
var router = express.Router();
var Hashids = require("hashids");
var nodemailer = require('nodemailer');
var userLogic = require('../logic/userLogic.js');
var config = require('config');
var async = require("async");
var validator = require('validator');

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

router.get('/', function (req, res) {
    res.sendFile(path.resolve('web/index.html'));
})

router.post('/register', function (req, res) {
    if(!req.body.email || !validator.isEmail(req.body.email)  || !req.body.firstName || !req.body.phone_no){
        return res.json({msg: "tampering", error: "requiede fields not present"});
    }
    else{
        moksha_id = '';
        req.body.password = req.body.password || 'xxxxxx';
        Account.register(new Account({email: req.body.email, endpoint:req.body.endpoint, firstName: req.body.firstName, lastName: req.body.lastName, college: req.body.college, phone_no: req.body.phone_no, dob: req.body.dob}), req.body.password, function (err, account) {
            if (err) {
                return res.json({msg: err.msg, error: err});
            }
            passport.authenticate('local')(req, res, function () {
                account.moksha_id = 'M' + hashids.encode(account.accNo);
                account.pass = "" + passids.encode(account.accNo);
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
                                "Greetings " + data.firstName + " ,Congratulations! You have been successfully registered to be a part of MOKSHA, the annual cultural fest of Netaji Subhas Institute of Technology. With high spirits and a presentiment of pure bliss, we are looking forward to yet another year of great participation and numerous cultural facets from across the country, engaging in a true, competitive spirit. With a sense of youthful exuberance, we invite you to be a part of the biggest explosion that will take the capital by storm! Your Moksha ID is " + data.moksha_id + " and Password is " + data.pass + " . You will be able to register for events and participate in them (and probably win exciting prizes!) with this. Please carry your Moksha ID and an identification proof on the days of the fest, i.e. 29th to 31st March. If you have any further queries please drop us a mail at publicrelations.moksha@gmail.com. See you there, Team Moksha"
                                ,html, data.moksha_id, set);
                        });
                        res.json({msg: 'success', moksha_id: account.moksha_id, email: account.email});
                    }
                });
            });
        });
    }
});

router.post('/login', userLogic.ensureAuthenticated, function (req, res) {
    res.json({msg:'success', user :res.locals.acc});
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
        if (err) {
            res.json({ msg: 'Error occured, Message not sent.', err: err});
        } else {
            res.json({ msg: 'Message Sent! Thank You.', err: false, user: {}});
        }
    })
});

module.exports = router;
