const mongoose = require('mongoose')
const validator = require('validator')
// var uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
var recruitesDataSchema = new mongoose.Schema({
  email:{
    type: String,
    required: true,
    minlength: 3,
    unique:false,
    trim: true,
    lowercase: true,
    validate(value) {
        if (!validator.isEmail(value)) {
            throw new Error('Email is invalid')
        }
    }
  },
  name:{
    type: String,
    required: true,
    minlength: 2,
    trim: true,
    lowercase: false
  },
  phone:{
    type: String,
    required: true,
    minlength: 2,
    trim: true
  },
  experience:{
    type: String,
    required: false,
    trim:true
  },
  team:{
    type: String,
    required: true,
    minlength: 3,
    trim: true,
    lowercase: true
  },
  position:{
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'careers'
  },
  location:{
    type:String,
    required:false,
    trim:true,
    lowercase:true
  },
  city:{
    type:String,
    required:false,
    trim:true,
  },
  current_company:{
    type:String,
    required:false,
    trim:true,
  },
  career_question:{
    type: String,
    required:false,
    trim:true,
    lowercase:false
  },
  application_no:{
    type: String,
    required: true,
    trim: true
  },
  status:{
    type: String,
    required : false,
    trim: true
  },
  recruiters:[{
    type : mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'recruiters'
  }],
  hr:[{
    type : mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'users'
  }],
  inetrview_status:{
    type: String,
    required: true
  },
  calendar_id:{
    type: String,
    required: false
  },
  inetrview_date:{
    type: String,
    required: false
  },
  interview_start_time:{
    type: String,
    required: false,
  },
  interview_end_time:{
    type: String,
    required: false,
  },
  recruit_type:{
    type: String,
    required: true,
    trim: true
  },
  resume:{
    type:String,
    required: true,
    trim: true,
  },
  feedback:{
    current_ctc:{
      type:String,
      required:false,
      trim:true
    },
    expected_ctc:{
      type:String,
      required:false,
      trim:true
    },
    current_position:{
      type:String,
      required:false,
      trim:true
    },
    skill_set:[{
      skill_title:{
        type : mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'skills'
      },
      skill_score:{
        type:String,
        trim:true
      }
    }],
    comments:[],
    sb_values:[{
      value_title:{
        type:String,
        trim:true
      },
      value_score:{
        type:String,
        trim:true
      }
    }]
  },
  token:{}
});

recruitesDataSchema.virtual('recruiter_profile', {
    ref: 'recruiters',
    localField: 'recruiter',
    foreignField: '_id'
})

recruitesDataSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ _id: user._id.toString() }, 'interviewProv1')

    user.token = token
    await user.save()

    return token
}

recruitesDataSchema.set('timestamps', true);

const Recruites = mongoose.model('recruites', recruitesDataSchema)
// recruitesDataSchema.plugin(uniqueValidator);
module.exports = Recruites
