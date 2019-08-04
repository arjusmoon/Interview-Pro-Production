const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/interviewPro', { useNewUrlParser: true, useCreateIndex: true,useFindAndModify: false });
// mongoose.connect('mongodb+srv://interview_pro_admin:interview_pro_v1_social_326@interviewpro-fb6ze.mongodb.net/test?retryWrites=true&w=majority', { useNewUrlParser: true, useCreateIndex: true });
module.exports = {mongoose};
