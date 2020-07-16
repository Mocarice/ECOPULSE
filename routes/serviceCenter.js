const express = require('express');
const router = express.Router();
const fs = require('fs');
const app = express();


router.get('/', function(req, res, next) {
  if(req.session.userInfo){
    return res.render('serviceCenter',{title:'ECO-PULSE', userInfo: req.session.userInfo});
  }
  res.render('article', { title: 'ECO-PULSE' });//render는 한번만 실행되야해서
  //리턴으로 한번만 되게한다.
});

router.post('/send', (req, res) => {
  const identity = req.body.identity;
  const title = req.body.title;
  const contents = req.body.contents;
  const createdAt= new Date();
 
  createSendToDB(identity, title, contents, createdAt);
  res.send("success");
})

function readFromDB() {
  const serviceCenterDatas = JSON.parse(fs.readFileSync('./db/serviceCenter.json'));
  return serviceCenterDatas;
}

function createSendToDB(identity, title, contents, createdAt){
  const serviceContents = {
    identity,
    title,
    contents,
    createdAt
  };
  const DB = readFromDB();
  DB.push(serviceContents);
  fs.writeFileSync('./db/serviceCenter.json', JSON.stringify(DB, null, 2))
}




module.exports = router;