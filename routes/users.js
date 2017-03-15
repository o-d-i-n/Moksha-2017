var express = require('express');
var router = express.Router();
var Account = require('../models/account');
var Event = require('../models/event');
var userLogic = require('../logic/userLogic');
var multer = require('multer');
var http = require('http');

var upload = multer({
    dest: 'public/uploads/photoids/',
    limits: {fileSize: 10000000, files:1}
});

router.get('/details', userLogic.ensureAuthenticated, userLogic.getEvents, function (req, res) {
    res.json({user: res.locals.acc, events: req.eventList});
});

router.post('/details', userLogic.ensureAuthenticated, function (req, res) {
    if (res.locals.acc)
    Account.findOne({_id: res.locals.acc._id},
        function (err, user) {
            if(err) {
                res.json({msg: err.msg, error: err});
            }

            if (user.email == null) {
                user.email = req.body.email;
            }
            user.firstName = req.body.firstName;
            user.lastName = req.body.lastName;
            user.phone_no = req.body.phone_no;
            user.dob = req.body.dob;
            user.college = req.body.college;
            user.save(function (err, data) {
                if (err) {
                    console.log(err);
                    res.json({user: res.locals.acc, edit: 'Failure'})
                } else {
                    res.json({user: data, edit: 'Success'})
                }
            });
        });
});

router.post('/addEM', userLogic.isEM, function(req, res) {
    var array = req.body.moksha_ids.split(',');
    for(var i = 0; i < array.length; i++) {
        Account.findOne({moksha_id: array[i]}, function(err, user) {
            if (err || !user)
                res.json({msg: "Failure"});
            else {
                user.is_em = true;
                user.save(function (err) {
                    if (!err)
                        res.json({msg: "Success"})
                    else
                        res.json({msg: "Failure"});
                });
            }
        })
    }
});

router.post('/userInfo', userLogic.isEM, function(req,res) {
    Account.findOne({moksha_id:req.body.moksha_id},function(err,user){
        if(!err && user) {
            res.json({ msg: 'User Exists.', err:false, inno: true, user:user});
        } else {
            res.json({ msg: 'User Does Not Exist.', err:true});
        }
    });
});

router.post('/photoUpload',userLogic.isEM, upload.single('userPhoto'), function(req,res) {
    Account.findOne({moksha_id:req.body.moksha_id},function(err,user){
        if(!err && user) {
            user.photoId = '/uploads/photoids/' + req.file.filename;
            user.save();
            res.json({err: false, msg: 'Success'});
        } else {
            res.json({err: true, msg: 'Failure'});
        }
    });

});

module.exports = router;
