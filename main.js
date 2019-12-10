const express = require('express');
const app = express();
const body_parser = require('body-parser');
const port = 3700;
const db = require('./DB');
const dbDriver = require('./DbDriver');
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
app.use('/images', express.static('images'));

//일반 소비자용 메서드

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
    const Price=info.Price;

    if (db.CreateOrder(MemberID, StdPhone, StdName, StdAddr, DstPhone, DstName, DstAddr, Size, Weight, PayMethod, Latitude, Longitude, imagePath, Message, Price)) {
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
app.get('/Recent', (req, res) => {
    const phone = req.query.phone;
    const send = db.GetRecentSend(phone);
    const receive = db.GetRecentReceive(phone);
    const result = {
        Send: send,
        Receive: receive
    };
    res.json(result);
});

//배송 기사 메서드

//회원가입
app.post('/driver/signUp', (req, res) => {
    const phone = req.body['Phone'];
    const name = req.body['Name'];
    const pw = req.body['Password'];

    if (dbDriver.CreateDriver(phone, name, pw)) {
        res.json(Ok);
    } else {
        res.json(Err);
    }
});

//로그인
app.post('/driver/login', (req, res) => {
    const phone = req.body['Phone'];
    const pw = req.body['Password'];
    const token = req.body['Token'];

    const result = dbDriver.DriverLogin(phone, pw, token);
    if (result) {
        res.json(result);
    } else {
        res.json({ "Phone": null, "Name": null });
    }
});

//새로운 주문 목록 받아오기
app.get('/driver/Get/newOrderList', (req, res) => {
    const Latitude = req.query.Latitude;
    const Longitude = req.query.Longitude;
    const result = dbDriver.GetNewOrders(Latitude, Longitude, res);
});

//주문 수락
app.post('/driver/takeOrder', (req, res) => {
    const orderID = req.body['OrderID'];
    const phone = req.body['Phone'];
    const Start = req.body['Start'];
    if (dbDriver.TakeOrder(orderID, phone, Start)) {
        res.json(Ok);
    } else {
        res.json(Err);
    }
})

//내 배송 목록
app.get('/driver/Get/myOrderList', (req, res) => {
    const phone = req.query.Phone;
    res.json(dbDriver.GetMyOrders(phone));
});

//상태 업데이트
app.post('/driver/Update/Status', (req, res) => {
    const OrderID = req.body['OrderID'];
    const Status = req.body['Status'];

    if (dbDriver.UpdateOrderStatus(OrderID, Status)) {
        res.json(Ok);
    } else {
        res.json(Err);
    }
});

//위치정보 업데이트
app.post('/driver/Update/Location', (req, res) => {
    const phone = req.body['DriverID'];
    const Latitude = req.body['Latitude'];
    const Longitude = req.body['Longitude'];

    if (dbDriver.UpdateLocation(phone, Latitude, Longitude)) {
        console.log(phone + ": 위치 업데이트");
        res.json(Ok);
    } else {
        res.json(Err);
    }
});

//최근 내역
app.get('/driver/Get/recent', (req, res) => {
    const phone = req.query.phone;
    const recent = dbDriver.GetRecent(phone);
    res.json({ "Recent": recent });
});

//이전 배송
app.get('/driver/Get/Last', (req, res)=>{
    const phone=req.query.Phone;
    res.json(dbDriver.GetLast(phone));
});


app.listen(port, function (req, res) {
    const ip = require('ip');
    console.log('Server IP: ' + ip.address());
    console.log("안드로이드 서버 실행 중: " + port);
});

