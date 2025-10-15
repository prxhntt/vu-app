const rateLimit = require('express-rate-limit');


// const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, 
//   max: 1000, 
//   message: 'Too many requests from this IP, please try again later.'
// });


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: 'Too many login attempts, please try again later.'
});


const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5000, 
  message: 'Too many upload attempts, please try again later.'
});

module.exports = { generalLimiter, authLimiter, uploadLimiter };