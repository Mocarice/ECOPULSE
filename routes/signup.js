var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
    return res.render('signup',{title:'인증'});
});

module.exports = router;