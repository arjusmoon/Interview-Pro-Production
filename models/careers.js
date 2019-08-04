const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
var careersDataSchema = new mongoose.Schema({
  title:{
    type: String,
    index: true,
    unique: true,
    required: true,
    minlength: 3,
    trim: true,
  },
  team:{
    type: String,
    required: true,
    trim:true,
    lowercase: true,
  },
  hr:[{
    type : mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'users'
  }],
  recruiters: [{
    type : mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'recruiters'
  }],
  description:{
    type: String,
    trim: true,
    required: true,
  },
  career_location:[],
  excerpt:{
    type: String,
    trim: true,
    required: true,
  },
  custom_url:[{
    chennai:{
      type: String,
      trim: true,
      required: true
    },
    bangalore:{
      type: String,
      trim: true,
      required: true
    },
    mumbai:{
      type: String,
      trim: true,
      required: true
    }
  }],
  career_question:{
    type:String,
    trim:true,
    required:false,
  },
  status:{
    type: String,
    trim: true,
    required: true,
  }
});

careersDataSchema.set('timestamps', true);

const Careers = mongoose.model('careers', careersDataSchema)

module.exports = Careers
