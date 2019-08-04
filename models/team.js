const mongoose = require('mongoose')
const validator = require('validator')
var teamDataSchema = new mongoose.Schema({
  name:{
    type: String,
    index: true,
    unique: true,
    required: true,
    minlength: 3,
    trim: true,
    lowercase: false,
  }
});

teamDataSchema.set('timestamps', true);

const Teams = mongoose.model('teams', teamDataSchema)

module.exports = Teams
