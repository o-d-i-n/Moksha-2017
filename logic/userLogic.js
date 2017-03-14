var express = require('express');
var Event = require('../models/event');
var Account = require('../models/account');
var Team = require('../models/team');
var nodemailer  = require('nodemailer');
var config = require('config');
var webPush = require('web-push');

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

var users = {
    setLoginStatus: function(req, res, next) {
        if(req.isAuthenticated()) {
            res.locals.login = true;
            res.locals.firstName = req.user.firstName;
            res.locals.is_admin = req.user.is_admin;
            res.locals.is_em = req.user.is_em;
            if (req.user.is_new && (req.path.indexOf('users/details') == -1 && req.path.indexOf('logout') == -1)) {
                res.redirect('/users/details');
            }
        } else {
            res.locals.login = false;
            res.locals.is_admin = false;
            res.locals.is_em = false;
        }
        next();
    },
    ensureAuthenticated: function(req, res, next) {
        Account.find({moksha_id: req.body.moksha_id}).lean().exec(function(err, acc) {
            if (err || !acc)
                res.json({msg: "moksha id does not exist", error: err});
            else if (acc.pass == req.body.pass) {
                res.user = acc;
                return next();
            } else
                res.json({msg: "wrong pass", err: acc})
        });
    },
    getEvents: function(req, res, next) {
        req.eventList = [];
        Event.find({isTeamEvent: false, participants: req.user._id})
            .lean().exec(function(err, events) {
                req.eventList = events;
                next();
        });

        //
        //Team.find({members: req.user._id}).lean().exec( function(err, teams, next) {
        //    if (err) {
        //        req.eventList = [];
        //    } else {
        //        teams.forEach(function(team, index, arr) {
        //            captains.push(team.captain);
        //        });
        //        next();
        //    }
        //});
        //Event.find({isTeamEvent: true, participants: {$in: captains}}).lean().exec(function(err, events) {
        //    eventsParticipating = events;
        //    console.log(events);
        //}).then(Event.find({isTeamEvent: false, participants: req.user._id}).lean().exec(function(err, events) {
        //    console.log(events);
        //    eventsParticipating.push.apply(eventsParticipating, events);
        //})).then(function() {
        //    console.log(eventsParticipating);
        //    req.eventList = eventsParticipating;
        //}).then(next());
    },
    isAdmin: function(req, res, next) {
        if(req.user.is_admin)
            return next();
        else
            res.json({msg: "You don't have permissions to view thisA", error: req.user});
    },
    isEM: function(req, res, next) {
        if(req.user.is_em || req.user.is_admin)
            return next();
        else
            res.json({msg: "You don't have permissions to view thisEM", error: req.user});
    },
    sendMail: function(to,subject,text,html,moksha_id,setsuc){
        var mailOpts;
        console.log('sending mail to ' + to);

        mailOpts = {
            from: config.get('contactEmail'), //grab form data from the request body object
            to: to,
            subject: subject,
            text: text,
            html:html
        };

        nMailer.sendMail(mailOpts, function(err, response) {
            if (err) {
                console.log('ERROR MAIL : ' + to);
                setsuc(true, moksha_id, err);
            } else {
                console.log('MAIL Sent : ' + to);
                setsuc(false, moksha_id, "");
            }
        })
    },
    sendPushNotif: function(endpoint,notification){

        webPush.setGCMAPIKey("AIzaSyALCXuOzNamMKIMSIXnf9lq26vajjyFU1w");
        webPush.sendNotification(endpoint, 5);

    }
};

module.exports = users;
