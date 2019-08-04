const mongoose = require('mongoose');
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
var userDataSchema = new mongoose.Schema({
  email:{
    type: String,
    index: true,
    unique: true,
    required: true,
    minlength: 3,
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
  password:{
    type: String,
    required: true,
    minlength: 6,
    trim:true,
    validate(value) {
        if (value.toLowerCase().includes('password')) {
            throw new Error('Password cannot contain "password"')
        }
    }
  },
  token:{}
});

userDataSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ _id: user._id.toString() }, 'interviewProv1')

    user.token = token
    await user.save()

    return token
}

userDataSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email })

    if (!user) {
        throw new Error('Unable to login')
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        throw new Error('Unable to login')
    }

    return user.token
}

userDataSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()
})

userDataSchema.set('timestamps', true)

const User = mongoose.model('users', userDataSchema)

module.exports = User
