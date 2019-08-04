const mongoose = require('mongoose')
const validator = require('validator')
var skillsDataSchema = new mongoose.Schema({
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

skillsDataSchema.set('timestamps', true);

const Skills = mongoose.model('skills', skillsDataSchema)

module.exports = Skills
