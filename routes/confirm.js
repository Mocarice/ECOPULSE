var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    if (req.query.code) {
        req.session.code = req.query.code;
    }
    return res.render('confirm',{title:'인증'});
});

module.exports = router;
