var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Event = new Schema({
    name: {type:String, unique:true, dropDups:true, trim:true},
    linkName: {type:String, unique:true, dropDups:true, trim:true},
    shortDetails: String,
    details: {type:String, trim: true},
    fbLink: {type:String, trim: true},
    contact: String,
    timings: String,
    venue: String,
    photo: String,
    minParticipants: {type:Number},
    maxParticipants: {type:Number},
    isTeamEvent: {type:Boolean,default:false},
    category: [String],
    // In case of team events, participants and winners refer to team._id of teams
    participants: [{type: Schema.ObjectId}],
    winners: [{type: Schema.ObjectId}]
});

module.exports = mongoose.model('Event', Event);
