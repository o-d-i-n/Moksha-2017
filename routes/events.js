var express = require('express');
var Event = require('../models/event');
var router = express.Router();
var Account = require('../models/account');
var Team = require('../models/team');
var multer = require('multer');
var userLogic = require('../logic/userLogic');
var eventLogic = require('../logic/eventLogic');
var json2xls = require('json2xls');

var upload = multer({
    dest: 'public/uploads/',
    limits: {fileSize: 10000000, files:1}
});

router.get('/', function (req, res) {
    Event.find({}).lean().exec(function (err, events) {
        res.json({events: events});
    });
});

router.get('/category/:category', function (req, res) {
    Event.find({category: req.params.category}).lean().exec(function (err, events) {
        res.json({events: events, category: req.params.category});
    });
});

//  userLogic.ensureAuthenticated, userLogic.isEM, upload.single('eventPhoto'),

router.post('/addEvent', function(req, res) {
    var linkName = req.body.name;
    linkName = linkName.replace(/\s+/g, '-').toLowerCase();

    var fbLink = req.body.fbLink;
    if (fbLink.indexOf('http') == -1)
        fbLink = 'http://' + fbLink;

    var trimmedDetails = req.body.details.substr(0, 100);
    trimmedDetails = trimmedDetails.substr(0, Math.min(trimmedDetails.length, trimmedDetails.lastIndexOf(" ")));
    trimmedDetails = trimmedDetails + '...';

    event = new Event({
        name: req.body.name,
        linkName: linkName,
        shortDetails: trimmedDetails,
        details: req.body.details,
        fbLink: fbLink,
        minParticipants: req.body.minParticipants,
        maxParticipants: req.body.maxParticipants,
        category: req.body.category,
        isTeamEvent: req.body.isTeamEvent == 1,
        contact: req.body.contact,
        venue: req.body.venue,
        timings: req.body.timings
    });

    console.log(req.file);
    if (req.file)
        event.photo = '/uploads/' + req.file.filename;

    event.save(function (err, event) {
        if(err) {
            console.log(err);
            res.json({msg: 'Failure'});
        }
        else
            res.json({event: event.linkName, msg: 'Success'});
    });
});

router.get('/:eventLink', function (req, res) {
    Event.findOne({linkName: req.params.eventLink},
        function (err, event) {
            if(!event || err ) {
                res.json({msg: "Event not found! " + req.params.eventLink, error: {status: '', stack: ''}});
            }
            else {
                res.json({event: event});
            }
        });
});

router.post('/:eventLink/register/', userLogic.ensureAuthenticated, function (req, res){
    var elink=req.params.eventLink;
    var id = res.locals.acc._id;

    Event.findOne({linkName: elink}, function(err, event) {

        if (!event || err){
            res.json({msg: "Event not found", error: {status: '', stack: ''}});
        }

        // team event
        else if (event.isTeamEvent) {
            var count=req.body.count;
            if (count < event.minParticipants && count > event.maxParticipants) {
                res.json({msg: "No of participants are out of bounds",error : 'yes'});
                return;
            }
            var moksha_ids = req.body.members.split(',');
            var teamX = [];
            teamX.push(res.locals.acc.moksha_id);
            for (var i = 0; i < count - 1; i++) {
                var idX = moksha_ids[0].trim().toUpperCase();
                i++;
                teamX.push(idX);
            }

            Account.find({moksha_id:{ $in: teamX }},function(err, users) {
                if (err) {
                    console.log(err);
                    res.json({msg: 'Some of the users were not found, please check the Moksha IDs', error: err, moksha_id: res.locals.acc.moksha_id, mem: teamX});
                } else if (users.length == teamX.length) {
                    mem = [];
                    for (var i=0; i < users.length; i++) {
                        console.log(users[i]._id);
                        mem.push(users[i]._id);
                    }

                    team = new Team({
                        members: mem,
                        captain: id
                    });

                    team.save(function (err, Team) {
                        if(err) {
                            console.log(err);
                            res.json({error: err, moksha_id: res.locals.acc.moksha_id});
                        } else {
                            event.participants.push(team._id);
                            event.save(function (err, event) {
                                if (err) {
                                    console.log(err);
                                    res.json({msg: 'Failure', error: err});
                                }else
                                    res.json({msg: 'Success', event: event});
                            });
                        }
                    });
                } else {
                    res.json({error: "yes", msg: 'Some of the Moksha IDs were incorrect, please try again.', moksha_id: res.locals.acc.moksha_id, mem: teamX});
                }
            });
        }

        //non team event
        else {
            if (event.participants.find(id) != undefined) {
                res.json({msg:"Already registered"});
                return;
            }
            event.participants.push(id);
            event.save(function (err, event) {
                if(err) {
                    console.log(err);
                    res.json({error: err, msg: 'Failure'});
                }
                else
                    res.json({msg: 'Success'});
            });
        }
    });
});

router.post('/:eventLink/edit', userLogic.ensureAuthenticated, userLogic.isEM, upload.single('eventPhoto'),
    function(req, res) {
        Event.findOne({linkName: req.params.eventLink}, function (err, event) {
            if (err) {
                console.log(err);
                res.json({msg:'failue', error : err});
            }else {
                        var linkName = req.body.name;
                if (linkName)
                    linkName = linkName.replace(/\s+/g, '-').toLowerCase();

                var fbLink = req.body.fbLink;
                if (fbLink.indexOf('http') == -1)
                    fbLink = 'http://' + fbLink;

                var trimmedDetails = req.body.details.substr(0, 100);
                trimmedDetails = trimmedDetails.substr(0, Math.min(trimmedDetails.length, trimmedDetails.lastIndexOf(" ")));
                trimmedDetails = trimmedDetails + '...';

                event.name = req.body.name;
                event.linkName = linkName;
                event.shortDetails = trimmedDetails;
                event.details = req.body.details;
                event.fbLink = fbLink;
                event.minParticipants = req.body.minParticipants == 1;
                event.maxParticipants = req.body.maxParticipants == 1;
                event.category = req.body.category;
                event.isTeamEvent = req.body.isTeamEvent == 1;
                event.contact = req.body.contact;
                event.venue = req.body.venue;
                event.timings = req.body.timings;
                if (req.file)
                    event.photo = '/uploads/' + req.file.filename;
                event.save(function() {
                    res.json({msg: 'Success', event: event});
                });
            }
        })
});

//TODO: Admin Panel
router.post('/:eventLink/participants', userLogic.ensureAuthenticated, userLogic.isEM, function (req, res) {
    Event.findOne({linkName: req.params.eventLink},
        function (err, event) {
            if(!event || err ) {
                res.json({msg: "Event not found!", error: {status: 404, stack: ''}});
            } else {
                var list = event.participants;
                console.log(list);
                if (!event.isTeamEvent) {
                    Account.find({_id: {$in: list}}).lean().exec(function (err, users) {
                        console.log(users);
                        res.json({participants: users, event: event});
                    })
                } else {
                    Team.find({_id: {$in: list}}).populate('members captain').lean().exec(function(err, teams) {
                        res.json({teams: teams, event: event});
                    })
                }
            }
        })
});

router.post('/:eventLink/participants.xls', userLogic.ensureAuthenticated, userLogic.isEM, json2xls.middleware, function (req, res) {
    Event.findOne({linkName: req.params.eventLink},
        function (err, event) {
            if(!event || err ) {
                res.json({msg: "Event not found!", error: {status: 404, stack: ''}});
            } else {
                var list = event.participants;
                if (!event.isTeamEvent) {
                    Account.find({_id: {$in: list}}).lean().exec(function (err, users) {
                        res.xls(event.linkName + '.xlsx', users, {fields: ['moksha_id', 'firstName', 'lastName', 'email', 'phone_no', 'college']});
                    })
                } else {
                    Team.find({_id: {$in: list}}).populate('members captain').lean().exec(function(err, teams) {
                        var out = [];
                        for (var i in teams) {
                           out.push({
                               moksha_id: "Team",
                               firstName: teams[i].name,
                               lastName: "",
                               email: "",
                               phone_no: "",
                               college: ""
                           });
                            out.push.apply(out, teams[i].members);
                        }
                        res.xls(event.linkName + '.xlsx', out, {fields: ['moksha_id', 'firstName', 'lastName', 'email', 'phone_no', 'college', 'course']});
                    })
                }
            }
        })
});

module.exports = router;
