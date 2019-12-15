const mysql = require('sync-mysql');
const fs = require('fs');
const NodeGeocoder = require('node-geocoder');
const distanceManager = require('./Distance');
require('date-utils');
/*MySQL 연동 쿼리 분리를 위해 
callback이 필요 없는 sync-mysql 모듈 사용 */

const connection = new mysql({
    host: 'localhost',
    user: 'root',   //Iot DB관리 로컬 계정
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
exports.CreateOrder = function (MemberID, StdPhone, StdName, StdAddr, DstPhone, DstName, DstAddr, Size, Weight, Latitude, Longitude, ImagePath, Message, Price) {
    var date = new Date();
    var orderID = date.toFormat('YYYYMMDDHH24MMSS');
    const query = `insert into Orders set OrderID='${orderID}', MemberID='${MemberID}', StdPhone='${StdPhone}', StdName='${StdName}',
     StdAddr='${StdAddr}', DstPhone='${DstPhone}', DstName='${DstName}', DstAddr='${DstAddr}', 
     Size=${Size}, Weight=${Weight}, 
     Latitude=${Latitude}, Longitude=${Longitude}, ImagePath='${ImagePath}', Message='${Message}', Status=1, Price=${Price}, Confirm=false`;

    try {
        connection.query(query);
        GeoCode(StdAddr, orderID, true);
        GeoCode(DstAddr, orderID, false);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

//결제 확인
exports.UpdateConfirm = function (name, Price) {
    const query = `update Orders set Confirm=true where StdName='${name}' and Price=${Price}`;
    try {
        connection.query(query);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

//지오코딩
function GeoCode(Address, OrderID, isStart) {
    var options = {
        provider: 'google',
        httpAdapter: 'https',
        apiKey: 'AIzaSyB5lgCJ9HTVukxeQCEHVB1kWXPz_4bxCMs',
        formatter: null
    };

    var geocoder = NodeGeocoder(options);
    geocoder.geocode(Address, function (err, res) {
        const latitude = res[0].latitude;
        const longitude = res[0].longitude;
        GetNearTermianl(latitude, longitude, OrderID, isStart);
    });
}

//가까운 터미널 찾기
function GetNearTermianl(Latitude, Longitude, OrderID, isStart) {
    var distanceList = [];
    const terminalQuery = `select TmnCd, Latitude, Longitude from terminal`;
    const terminalList = connection.query(terminalQuery);

    //모든 터미널과 비교
    for (var i = 0; i < terminalList.length; i++) {
        var distance = distanceManager.GetDistance(Latitude, Longitude, terminalList[i].Latitude, terminalList[i].Longitude);
        distanceList.push({ "TmnCd": terminalList[i].TmnCd, "Distance": distance });
    }

    //가까운 거리순 정렬
    distanceList.sort(function (a, b) {
        return a.Distance < b.Distance ? -1 : a.Distance > b.Distance ? 1 : 0;
    });
    //터미널 코드
    const TmnCd = distanceList[0].TmnCd;

    var updateQuery = '';
    //시작터미널인지 판단
    if (isStart) {
        updateQuery = `update Orders set StTmnCd=${TmnCd} where OrderID='${OrderID}'`;
    } else {
        updateQuery = `update Orders set DstTmnCd=${TmnCd} where OrderID='${OrderID}'`;
    }
    //터미널 업데이트
    connection.query(updateQuery);
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

