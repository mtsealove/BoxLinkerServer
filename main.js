const express = require('express');
const app = express();
const body_parser = require('body-parser');
const port = 3700;
const db = require('./DB');
const multer = require('multer');
var upload = multer({ dest: 'images/' });

const Ok = {
    Result: true
};
const Err = {
    Result: false
};

app.use(body_parser.urlencoded({ extended: true, limit: '150mb' }));
app.use(body_parser.json());    //json 파싱

//로그인
app.post('/Login', (req, res) => {
    const phone = req.body['Phone'];
    const Password = req.body['Password'];
    const token = req.body['Token'];
    const result = db.MemberLogin(phone, Password, token);
    if (result) {
        res.json(result);
    } else {
        res.json({ "Phone": null, "Name": null });
    }
});

//회원가입
app.post('/SignUp', (req, res) => {
    const body = req.body;
    const Phone = body['Phone'];
    const Name = body['Name'];
    const Password = body['Password'];
    if (db.CreateMember(Phone, Name, Password)) {
        res.json(Ok);
    } else {
        res.json(Err);
    }
});

//주문 생성
app.post('/MakeOrder', upload.single('imgFile'), function (req, res) {
    const imagePath = req.file.filename;
    const info = JSON.parse(req.body['info']);
    const DstAddr = info.DstAddr;
    const DstName = info.DstName;
    const DstPhone = info.DstPhone;
    const Latitude = info.Latitude;
    const Longitude = info.Longitude;
    const MemberID = info.MemberID;
    const PayMethod = info.PayMethod;
    const Size = info.Size;
    const StdAddr = info.StdAddr;
    const StdName = info.StdName;
    const StdPhone = info.StdPhone;
    const Weight = info.Weight;
    const Message = info.Msg;

    if (db.CreateOrder(MemberID, StdPhone, StdName, StdAddr, DstPhone, DstName, DstAddr, Size, Weight, PayMethod, Latitude, Longitude, imagePath, Message)) {
        console.log('주문 생성');
        res.json(Ok);
    } else {
        res.json(Err);
    }

});

//주문 목록 조회
app.get('/OrderList', (req, res) => {
    const phone = req.query.phone;
    const result = db.GetOrderList(phone);
    res.json(result);
});

//개별 주문 조회
app.get('/Order', (req, res) => {
    const orderID = req.query.OrderID;
    const result = db.GetOrderById(orderID);
    res.json(result);
});

//최근 사용 내역 조회
app.get('/SRecent', (req, res) => {
    const phone = req.query.phone;
    const send = db.GetRecentSend(phone);
    const receive = db.GetRecentReceive(phone);
    const result = {
        Send: send,
        Receive: receive
    };
    res.json(result);
});


app.listen(port, function (req, res) {
    console.log("안드로이드 서버 실행 중: " + port);
});