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

router.post('/addEvent', userLogic.isEM, upload.single('eventPhoto'), function(req, res) {
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
        managers: [req.user._id],
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
            res.json({msg: 'failure'});
        }
        else
            res.json({event: event.linkName, msg: 'success'});
    });
});

router.get('/:eventLink', userLogic.getTeams, eventLogic.isRegistered, function (req, res) {
    Event.findOne({linkName: req.params.eventLink},
        function (err, event) {
            if(!event || err ) {
                res.json({msg: "Event not found! " + req.params.eventLink, error: {status: '', stack: ''}});
            }
            else {
                console.log('inside event link' + res.locals.teams);
                res.json({event: event});
            }
        });
});

router.post('/:eventLink/register/', userLogic.ensureAuthenticated, function (req, res){

    var elink=req.params.eventLink;
    var id = req.user._id;

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
            var teamX = [];
            teamX.push(id);
            for (i = 0; i < count - 1; i++) {
                var idX = req.body.members[i].trim().toUpperCase();
                i++;
                teamX.push(idX);
            }

            Account.find({moksha_id:{ $in: teamX }},function(err, users) {
                if (err) {
                    console.log(err);
                    res.json({msg: 'Some of the users were not found, please check the INNO IDs', error: err, moksha_id: req.user.moksha_id});
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
                            res.json({error: err, moksha_id: req.user.moksha_id});
                        } else {
                            event.participants.push(team._id);
                            event.save(function (err, event) {
                                if (err) {
                                    console.log(err);
                                    res.json({msg: 'failure', error: err});
                                else
                                    res.json({msg: 'success'});
                            });
                        }
                    });
                } else {
                    res.json({error: "yes", msg: 'Some of the Moksha IDs were incorrect, please try again.', moksha_id: req.user.moksha_id});
                }
            }
        }

        //non team event
        else {
            event.participants.push(id);
            event.save(function (err, event) {
                if(err) {
                    console.log(err);
                    res.json({error: err, msg: 'failure'});
                }
                else
                    res.json({msg: 'success'});
            });
        }
    });
});

// router.post('/:eventLink/register-i', function (req, res){
//     var elink=req.params.eventLink;
//     var array = req.body.moksha_ids.split(',');
//     for(var i = 0; i < array.length; i++) {
//         Event.findOne({linkName: elink}, function (err, event) {
//             if (!event || err) {
//                 res.json({msg: "Event not found", error: {status: '', stack: ''}});
//             }
//             //non team event
//             else {
//                 Account.find({moksha_id: {$in: array}}).lean().exec(function(err, users) {
//                     var ids = [];
//                     for (var i in users) {
//                         ids.push(users[i]._id);
//                     }
//                     event.participants.push.apply(event.participants, ids);
//                     event.save(function (err, event) {
//                         if (err) {
//                             console.log(err);
//                             res.json({error : err, msg: 'failure'});
//                         }
//                         res.json({msg : 'success'});
//                     });
//
//                 });
//             }
//         });
//     }
// });
//
// router.post('/:eventLink/register-t', function (req, res){
//     Event.findOne({linkName: req.params.eventLink}, function(err, event) {
//         if (!event || err) {
//             res.json({success: false});
//         } else {
//             var count=req.body.category;
//             count--;
//             var inno = [];
//             var captain = req.body.captain;
//             inno.push(captain);
//             if(count){
//                 var id2 = req.body.mem2.trim().toUpperCase();
//                 count--;
//                 inno.push(id2);
//             }
//             if(count){
//                 var id3 = req.body.mem3.trim().toUpperCase();
//                 count--;
//                 inno.push(id3);
//             }
//             if(count){
//                 var id4 = req.body.mem4.trim().toUpperCase();
//                 count--;
//                 inno.push(id4);
//             }
//             if(count){
//                 var id5 = req.body.mem5.trim().toUpperCase();
//                 count--;
//                 inno.push(id5);
//             }
//             if(count){
//                 var id6 = req.body.mem6.trim().toUpperCase();
//                 inno.push(id6);
//             }
//             var tname = req.body.name;
//             var mem = [];
//
//             Account.find({moksha_id:{ $in: inno }},function(err, users) {
//                 console.log("in");
//                 if (err) {
//                     console.log(err);
//                     res.redirect('/events/' + event.linkName + '/participants/error');
//                 } else if (users.length == inno.length) {
//                     for (var i=0; i < users.length; i++) {
//                         console.log(users[i]._id);
//                         mem.push(users[i]._id);
//                     }
//
//                     team = new Team({
//                         name: tname,
//                         members: mem,
//                         captain: mem[0]
//                     });
//
//                     team.save(function (err, Team) {
//                         if(err) {
//                             console.log(err);
//                             res.redirect('/events/' + event.linkName + '/participants/name-taken');
//                         } else {
//                             event.participants.push(Team._id);
//                             event.save(function() {
//                                 res.redirect('/events/' + event.linkName + '/participants/success');
//                             });
//                         }
//                     });
//                 } else {
//                     res.redirect('/events/' + event.linkName + '/participants/invalid-inno-ids');
//                 }
//             });
//         }
//     });
// });

router.post('/:eventLink/edit', userLogic.isEM, upload.single('eventPhoto'),
    function(req, res) {
        Event.findOne({linkName: req.params.eventLink}, function (err, event) {
            if (err)
                console.log(err);
            else {
                var linkName = req.body.name;
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
                event.minParticipants = req.body.minParticipants;
                event.category = req.body.category;
                event.isTeamEvent = req.body.isTeamEvent == 1;
                event.contact = req.body.contact;
                event.venue = req.body.venue;
                event.timings = req.body.timings;
                if (req.file)
                    event.photo = '/uploads/' + req.file.filename;
                event.save(function() {
                    res.json({msg: 'success', event: event});
                });
            }
        })
});

//TODO: Admin Panel
router.get('/:eventLink/participants', userLogic.isEM, function (req, res) {
    Event.findOne({linkName: req.params.eventLink},
        function (err, event) {
            if(!event || err ) {
                res.json({msg: "Event not found!", error: {status: 404, stack: ''}});
            } else {
                var list = event.participants;
                if (!event.isTeamEvent) {
                    Account.find({_id: {$in: list}}).lean().exec(function (err, users) {
                        res.json({participants: users, event: event, err: ""});
                    })
                } else {
                    Team.find({_id: {$in: list}}).populate('members captain').lean().exec(function(err, teams) {
                        res.json({teams: teams, event: event, err: ""});
                    })
                }
            }
        })
});

router.get('/:eventLink/participants.xls', userLogic.isEM, json2xls.middleware, function (req, res) {
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
