const mysql = require('sync-mysql');
const fs = require('fs');
require('date-utils');
/*MySQL 연동 쿼리 분리를 위해 
callback이 필요 없는 sync-mysql 모듈 사용 */

const connection = new mysql({
    host: 'localhost',
    user: 'BoxLinker',   //Iot DB관리 로컬 계정
    password: fs.readFileSync('pw.dat', 'utf-8'),   //비밀번호는 파일로 따로 관리
    database: 'BoxLinker'
});

//회원 생성
exports.CreateMember = function (Phone, Name, Password) {
    const query = `insert into Members set Phone='${Phone}', Name='${Name}', Password='${Password}'`;
    try {
        connection.query(query);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

//로그인
exports.MemberLogin = function (Phone, Password, Token) {
    const query = `select Phone, Name from Members where Phone='${Phone}' and Password='${Password}'`;
    const result = connection.query(query)[0];
    //토큰 업데이트
    if (result) {
        const tokenQuery = `update Members set Token='${Token}' where Phone='${Phone}'`;
        connection.query(tokenQuery);
    }
    return result;
}

//주문 생성
exports.CreateOrder = function (MemberID, StdPhone, StdName, StdAddr, DstPhone, DstName, DstAddr, Size, Weight, PayMethod, Latitude, Longitude, ImagePath, Message) {
    var date = new Date();
    var orderID = date.toFormat('YYYYMMDDHH24MMSS');
    const query = `insert into Orders set OrderID='${orderID}', MemberID='${MemberID}', StdPhone='${StdPhone}', StdName='${StdName}',
     StdAddr='${StdAddr}', DstPhone='${DstPhone}', DstName='${DstName}', DstAddr='${DstAddr}', 
     Size=${Size}, Weight=${Weight}, PayMethod='${PayMethod}',
     Latitude=${Latitude}, Longitude=${Longitude}, ImagePath='${ImagePath}', Message='${Message}', Status=1`;

    try {
        connection.query(query);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

exports.GetOrderList = function (Phone) {
    const query = `select O.OrderID, S.StatusName as Status from Orders O join 
    Status S on S.StatusID=O.Status
    where DstPhone='${Phone}' or StdPhone='${Phone}' order by O.OrderID desc`;

    return connection.query(query);
}

exports.GetOrderById = function (OrderID) {
    const query = `select O.*, S.StatusName from Orders O join 
    Status S on S.StatusID=O.Status
    where O.OrderID='${OrderID}'`;

    const result = connection.query(query)[0];
    console.log(result);
    return result;
}

exports.GetRecentSend = function (Phone) {
    var date = new Date();
    var month = date.toFormat('YYYYMM');
    const query = `select count(*) as cnt from Orders where OrderID like '${month}%' and stdphone='${Phone}'`;
    const result = connection.query(query)[0].cnt;
    return result;
}

exports.GetRecentReceive = function (Phone) {
    var date = new Date();
    var month = date.toFormat('YYYYMM');
    const query = `select count(*) as cnt from Orders where OrderID like '${month}%' and dstphone='${Phone}'`;
    const result = connection.query(query)[0].cnt;
    return result;
}

//배송기사
exports.CreateDriver = function (phone, name, password) {
    const query = `insert into Drivers set Phone='${phone}', name='${name}', password='${password}'`;

    try {
        connection.query(query);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

exports.DriverLogin = function (phone, pw, token) {
    const query = `select Phone, Name from Drivers where Phone='${phone}' and Password='${pw}'`;
    const result = connection.query(query)[0];
    if (result) {
        const tokenQuery = `update Drivers set Token='${token}' where phone='${phone}'`;
        connection.query(tokenQuery);
    }
    return result;
}