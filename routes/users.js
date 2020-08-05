const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');

const superagent = require('superagent');

const passport = require('passport');
var GoogleStrategy = require( 'passport-google-oauth20' ).Strategy

const client_id = "GD0ToM2wJfzgNa8m72yOle8xmlfEyQkGlPUJwK6S";
const client_secret = 'TgaU0IHw29FZEixIWh21OL3Rwu75BIJqLLJ3O3g9';
const scope = "login inquiry transfer";
const redirectURI = "http://localhost:3000/confirm";
const client_info = "12345678901234567890128475648394";
const state = "12345678901234567890128475648394";
const auth_type = "0";
//let auth_code="0"

//구글인증 관련 passport
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GoogleStrategy({
      clientID: '388309316683-gt68g25st6i0gv7bqmkl5tengavhe3eg.apps.googleusercontent.com',
      clientSecret: 'OjL2kn0OxmwvZwXMqgfJ2R3L',
      callbackURL: 'http://localhost:3000/auth'
  }, function(accessToken, refreshToken, profile, done) {
      process.nextTick(function() {
          user = profile;
          return done(null, user);
      });
  }
));
//------------------------------------------------------------------------------------------------------------

function findOne(identity){
  const users = readUsers();
  const selectedUser = users.filter(function(user){
    return identity === user.identity;
  })[0];
  return selectedUser;
}

function findOneByNick(nickname){
  const users = readUsers();
  const selectedUser = users.filter(function(user){
    return nickname ===user.nickname;
  })[0];
  return selectedUser;
}


function createUser(identity, password, nickname, email, createdAt, bankname, cellphone, bankaccount, refid, fintechNumber, bankHolderName, accessToken, point, level){
  const user = {
    identity,
    password,
    nickname,
    email,
    createdAt,
    bankname,
    cellphone,
    bankaccount,
    refid,
    fintechNumber,
    bankHolderName,
    accessToken,
    point,
    level
  };
  const users = readUsers();
  users.push(user);
  fs.writeFileSync('./db/users.json', JSON.stringify(users, null, 2))
}

function readUsers(){
  const users = JSON.parse(fs.readFileSync('./db/users.json').toString());//파일읽고 스트링으로 변환하고 제이슨객체로 파싱
  return users;
}

function encryptStr(str, salt){
  return crypto.pbkdf2Sync(str, salt, 5658, 256, 'sha256').toString('hex');
//  return crypto.createHash('sha256').update(str).digest('hex');
}

// function pointCharge(points, identity){
//     const users = readUsers();

//     const user = users.filter((user) => {
//         return user.identity === identity;
//     })[0];
//     console.log(identity);
//     console.log(points);

//     user.point += points;
//     fs.writeFileSync('./db/users.json', JSON.stringify(users, null ,2));
  
// }

router.post('/pointCharge', function(req,res){
  let points = parseInt(req.body.point);
  const identity = req.session.userInfo.identity;
  const users = readUsers();

    const user = users.filter((user) => {
        return user.identity === identity;
    })[0];

    user.point += points;
    req.session.userInfo.point = user.point;
    user.level = 2;
    req.session.userInfo.level = user.level;
    fs.writeFileSync('./db/users.json', JSON.stringify(users, null ,2));
  //pointCharge(points, identity);
  res.send("Charge Success");
});

router.post('/login', function(req, res){
  const identity = req.body.identity;
  const selectedUser = findOne(identity);

  if(selectedUser){
    const password = encryptStr(req.body.password, selectedUser.createdAt.toString());    
    if(selectedUser.password === password){
      req.session.userInfo={
        ...selectedUser//...은 스프레드 연산자(펼친다)...은 노드.js에서만하는게 좋다
      };
      return res.send("Success");
    }
  }
  
    //어떤 속성값이 일치하는 것들로 한정시켜줄때 filter map이랑 사용방법비슷
  //필터는 원본데이터랑 같은 배열로 리턴
  res.status(401).send("Bad Authorization")
});//createHasg해시함수 만들고 update 바디에 업데이트 digest결과산출
/* GET users listing. */
//router.get('/set/session', function(req, res){
//  req.session.identity = 'admin';
//  res.send("Success");
//})
//router.get('/session', function(req, res){
//  res.send(req.session.identity);
//});
router.post('/logout', function(req, res, _next){
  req.session.userInfo = undefined;
  res.send("Success");
});
router.get('/', function(_req, res, _next) {
  res.send('respond with a resource');
});

router.post('/create', function(req, res){
  const identity = req.body.identity;
  const password = req.body.password;
  const name = req.body.name
  const nickname = req.body.nickname;
  const email = req.body.email || '';
  const bankaccount = req.body.bankaccount;
  const bankname = req.body.bankname;
  const cellphone = req.body.cellphone;
  const refid = req.body.refid || ''; //?
  let point = 0;
  let level = 1;
  
  if (!identity || !password || !nickname){
    return res.status(400).send("Some parameter lost");
  }
  if(password.length <= 6){
    return res.status(400).send("Not enough pw length");
  };
  //아래부터 중복검사
  const existUser = findOne(identity);
  const existUserByNick = findOneByNick(nickname);
  if(existUser || existUserByNick){
    return res.status(400).send("Identity or nickname is already exist");
  }
  if(bankname !== req.session.realBankName || name !== req.session.bankHolderName){
    return res.status(400).send("Incorrect Account Info");
  }
  const createdAt = new Date().getTime();
  createUser(identity, encryptStr(password, createdAt.toString()), nickname, email, createdAt, bankname, cellphone, bankaccount, refid, req.session.fintechNumber, req.session.bankHolderName, req.session.access_token, point, level);
  res.send("Success");
});

//Access token 발급 request
router.post("/proxy/get/token", async function (req, res, next) { 
  
  const result = await superagent
    .post('https://testapi.openbanking.or.kr/oauth/2.0/token')
    .query({code: req.session.code})
    .query({client_id: client_id})
    .query({client_secret: client_secret})
    .query({redirect_uri: "http://localhost:3000/confirm"})
    .query({grant_type: 'authorization_code'});
  
  req.session.access_token = result.body.access_token;
  req.session.refresh_token = result.body.refresh_token;
  req.session.user_seq_no = result.body.user_seq_no;
  
  if (!result.body || !result.body.access_token) {
    return res.json(result.body);
  }
  //회원가입 전 세션 접속자 계좌와 이름 가져온 후 추후 회원가입시 대조
  const result1 = await superagent
    .get('https://testapi.openbanking.or.kr/v2.0/account/list')
    .set({'Authorization': 'Bearer '+ req.session.access_token})
    .query({user_seq_no: req.session.user_seq_no})
    .query({include_cancel_yn:'N'})
    .query({sort_order: "D"});
    
  req.session.fintechNumber = result1.body.res_list[0].fintech_use_num;
  req.session.realBankName = result1.body.res_list[0].bank_name;
  req.session.bankHolderName = result1.body.res_list[0].account_holder_name;
  res.json(result.body);
});

//Access token 갱신 request
router.post("/proxy/refresh/token", async function (req, res, next) { 
  const result = await superagent
    .post('https://testapi.openbanking.or.kr/oauth/2.0/token')
    .query({client_id: client_id})
    .query({client_secret: client_secret})
    .query({refresh_token: req.session.refresh_token})
    .query({scope: scope})
    .query({grant_type: 'refresh_token'});

  

  req.session.access_token = result.body.access_token;
  req.session.refresh_token = result.body.refresh_token;
  req.session.user_seq_no=result.body.user_seq_no;
  res.json(result.body);
});



router.get('/auth/google', passport.authenticate('google', { scope:
  ['profile']}));

router.get('/auth/google/callback', passport.authenticate( 'google', { failureRedirect: '/login' }),
  function(req, res) {
          res.redirect('/auth'); 
});

router.get('/auth', function(req,res) {
  api_url = 'https://testapi.openbanking.or.kr/oauth/2.0/authorize?response_type=code&client_id=' + client_id + '&redirect_uri=' + redirectURI + '&scope=' + scope + '&client_info=' + client_info + '&state=' + state + '&auth_type=' + auth_type;
  api_url2 = 'http://localhost:3000/auth/google';
  res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
  res.end("<a href='"+ api_url + "'><img height='50' src='https://cdn1.iconfinder.com/data/icons/basic-ui-7/100/Artboard_95-512.png'/></a> <a href='"+ api_url2 + "'><img height='50' src='https://img1.daumcdn.net/thumb/R720x0.q80/?scode=mtistory2&fname=http%3A%2F%2Fcfile27.uf.tistory.com%2Fimage%2F998689465C3D7D1217F053'/></a>");
});

//등록된 계좌가 있을시 access token 기반으로 인증절차 예외 -------- 미업데이트
router.post('/withdraw', async function(req,res){
  const result = await superagent
    .post('https://testapi.openbanking.or.kr/v2.0/transfer/withdraw/fin_num')
    .set({'Authorization': 'Bearer '+ req.session.access_token})
    .query({bank_tran_id: 'code'})
    .query({cntr_account_type:client_id})
    .query({cntr_account_num: redirectURI})
    .query({dps_print_content: scope})
    .query({fintech_use_num: req.session.fintechNumber})
    .query({tran_amt: state})
    .query({tran_dtime: auth_type})
    .query({req_client_name: state})
    .query({req_client_num: state})
    .query({transfer_purpose: state});

  
  res.json(result.body);
});


module.exports = router;