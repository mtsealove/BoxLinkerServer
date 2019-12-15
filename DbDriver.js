const mysql = require('sync-mysql');
const fs = require('fs');
const NodeGeocoder = require('node-geocoder');
const distanceManager = require('./Distance');
const request = require('request');
const connection = new mysql({
    host: 'localhost',
    user: 'root',   //Iot DB관리 로컬 계정
    password: fs.readFileSync('pw.dat', 'utf-8'),   //비밀번호는 파일로 따로 관리
    database: 'BoxLinker'
});

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

//새로운 주문 목록
exports.GetNewOrders = async function (Latitude, Longitude, res) {

    const max_distance = 15000;
    //출발지 기반
    var Orders = [];
    const firstQuery = `select OO.*, TT.TmnNm from
    (select O.OrderID, O.StdAddr, O.Size, O.Weight, O.DstTmnCd, T.TmnNm as DstAddr from Orders O
    join Terminal T
    on O.StTmnCd=T.TmnCd
    where FirstDriverID is null and Status!=4 ) OO
    join Terminal TT
    on OO.DstTmnCd=TT.TmnCd`;
    const first = connection.query(firstQuery);
    for (var i = 0; i < first.length; i++) {
        await GeoCode(first[i].StdAddr).then(function (data) {
            var distance = distanceManager.GetDistance(Latitude, Longitude, data.Latitude, data.Longitude);
            if (distance <= max_distance) {
                first[i].Start = true;
                Orders.push(first[i]);
            }
        });
    }

    //도착지 기반
    const lastQuery = `select OO.*, TT.TmnNm from
    (select O.OrderID, O.DstAddr, O.Size, O.Weight, O.DstTmnCd, O.ArrPrdtTm, T.TmnNm as StdAddr from Orders O
    join Terminal T
    on O.DstTmnCd=T.TmnCd
    where LastDriverID is null and Status!=4) OO
    join Terminal TT
    on OO.DstTmnCd=TT.TmnCd`;
    const last = connection.query(lastQuery);
    for (var i = 0; i < last.length; i++) {
        await GeoCode(last[i].DstAddr).then(function (data) {
            var distance = distanceManager.GetDistance(Latitude, Longitude, data.Latitude, data.Longitude);
            if (distance <= max_distance) {
                last[i].Start = false;
                Orders.push(last[i]);
            }
        });
    }
    res.json(Orders);
}

//지오코딩
function GeoCode(Address) {
    var options = {
        provider: 'google',
        httpAdapter: 'https',
        apiKey: 'AIzaSyB5lgCJ9HTVukxeQCEHVB1kWXPz_4bxCMs',
        formatter: null
    };

    var result;
    var geocoder = NodeGeocoder(options);
    return new Promise(function (resolve, reject) {
        geocoder.geocode(Address, function (err, res) {
            const latitude = res[0].latitude;
            const longitude = res[0].longitude;
            result = {
                Latitude: latitude,
                Longitude: longitude
            }
            resolve(result);
        });
    });
}

exports.TakeOrder = function (orderID, phone, start) {
    var query = '';
    if (start) {
        query = `update Orders set FirstDriverID='${phone}' where OrderID='${orderID}'`;
    } else {
        query = `update Orders set LastDriverID='${phone}' where OrderID='${orderID}'`;
    }

    try {
        connection.query(query);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

exports.GetMyOrders = function (phone) {
    var result = [];
    const firstQuery = `select O.OrderID, O.StdAddr, O.Size, O.Weight, O.StdPhone, O.DstPhone, O.ImagePath, O.ArrPrdtTm, O.CorpNm, T.TmnNm as DstAddr
     from Orders O join Terminal T on O.StTmnCd=T.TmnCd
     where FirstDriverID='${phone}' and Status!=4`;
    const first = connection.query(firstQuery);
    for (var i = 0; i < first.length; i++) {
        result.push(first[i]);
    }
    const lastQuery = `select O.OrderID, O.DstAddr, O.Size, O.Weight, O.StdPhone, O.DstPhone, O.ImagePath, O.ArrPrdtTm, O.CorpNm, T.TmnNm as StdAddr
    from Orders O join Terminal T on O.DstTmnCd=T.TmnCd
    where LastDriverID='${phone}' and Status!=4`;
    const last = connection.query(lastQuery);
    for (var i = 0; i < last.length; i++) {
        result.push(last[i]);
    }
    return result;
};

//상태 업데이트
exports.UpdateOrderStatus = function (orderID, status) {
    const FCM = require('./FCM');
    const query = `update Orders set Status=${status}  where orderID='${orderID}'`;
    try {
        connection.query(query);
        //알림 발송
        const phoneQuery = `select StdPhone, DstPhone from Orders where OrderID='${orderID}'`;
        const phone = connection.query(phoneQuery)[0];
        const tokenQuery = `select Token from Members where Phone='${phone.StdPhone}' or Phone='${phone.DstPhone}'`;
        const tokens = connection.query(tokenQuery);
        for (var i = 0; i < tokens.length; i++) {
            FCM.PushNormal(tokens[i].Token, "주문 상태가 변경되었습니다");
        }
        if (status == 6) {
            const tmnQuery = `select StTmnCd, DstTmnCd from Orders where OrderID='${orderID}'`;
            const tmn = connection.query(tmnQuery)[0];
            var StTmnCd = String(tmn.StTmnCd);
            var DstTmnCd = String(tmn.DstTmnCd);
            if (StTmnCd.length < 3)
                StTmnCd = "0" + StTmnCd;
            if (DstTmnCd.length < 3)
                DstTmnCd = "0" + DstTmnCd;

            SetTerminalTime(orderID, StTmnCd, DstTmnCd);
        }

        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

function SetTerminalTime(orderID, stTmn, dstTmn) {
    var url = 'http://openapi.tago.go.kr/openapi/service/ExpBusArrInfoService/getExpBusArrPrdtInfo';
    var queryParams = '?' + encodeURIComponent('ServiceKey') + '=ArpN26ykcA%2FOVG5glFhhBYwU3OJAO4x%2B2bQyILHAmwAH%2FLZUbQM7xig9xdwe77qwoVYkNuko4Hs%2F6qg%2B4WmfVw%3D%3D'; /* Service Key*/
    queryParams += '&' + encodeURIComponent('depTmnCd') + '=' + encodeURIComponent(stTmn);
    queryParams += '&' + encodeURIComponent('arrTmnCd') + '=' + encodeURIComponent(dstTmn);
    const convert = require('xml-js');

    request({
        url: url + queryParams,
        method: 'GET'
    }, function (error, response, body) {
        var date = new Date();
        var time = date.toFormat('HH24MI');
        console.log(time);
        var xmlToJson = JSON.parse(convert.xml2json(body, { compact: true, spaces: 4 }));
        const data = xmlToJson.response.body.items.item;
        try {
            for (var i = 0; i < data.length; i++) {
                var deptime = data[i].depTm._text.replace(':', '');
                var arrPrdtTm = data[i].arrPrdtTm._text.substr(11, 15).replace(':', '');
                console.log("arr: " + arrPrdtTm);
                console.log("dep: " + deptime);
                if (deptime < time || arrPrdtTm < time) {
                    const corpNm = data[i].corpNm._text;
                    const arrTime = data[i].arrPrdtTm._text;
                    const updateQuery = `update Orders set CorpNm='${corpNm}', ArrPrdtTm='${arrTime}' where OrderID='${orderID}'`;
                    connection.query(updateQuery);
                    break;
                }
            }
        } catch (err) {

        }
    });
}

//위치정보 업데이트
exports.UpdateLocation = function (phone, latitude, longitude) {
    const driverQuery = `update Drivers set Latitude=${latitude}, Longitude=${longitude} where Phone='${phone}'`;
    const firstQuery = `update Orders set Latitude=${latitude}, Longitude=${longitude}
     where FirstDriverID='${phone}' and Status!=6 and Status!=4`;
    const lastQuery = `update Orders set Latitude=${latitude}, Longitude=${longitude}
    where LastDriverID='${phone}' and Status!=4`;


    try {
        connection.query(driverQuery);
        connection.query(firstQuery);
        connection.query(lastQuery);
        return true;
    } catch (err) {
        console.error(err);
        return true;
    }
}

exports.GetRecent = function (Phone) {
    var date = new Date();
    var month = date.toFormat('YYYYMM');
    const query = `select count(*) as cnt from Orders where OrderID like '${month}%' and (FirstDriverID='${Phone}' or LastDriverID='${Phone}')`;
    const result = connection.query(query)[0].cnt;
    return result;
}

exports.GetLast = function (phone) {
    var result = [];
    const firstQuery = `select O.OrderID, O.StdAddr, O.Size, O.Weight, O.StdPhone, O.DstPhone, O.ImagePath, T.TmnNm as DstAddr
     from Orders O join Terminal T on O.StTmnCd=T.TmnCd
     where FirstDriverID='${phone}' and (Status=6 or Status=4)`;
    console.log(firstQuery);
    const first = connection.query(firstQuery);
    console.log(first);
    for (var i = 0; i < first.length; i++) {
        result.push(first[i]);
    }
    const lastQuery = `select O.OrderID, O.DstAddr, O.Size, O.Weight, O.StdPhone, O.DstPhone, O.ImagePath, T.TmnNm as StdAddr
    from Orders O join Terminal T on O.DstTmnCd=T.TmnCd
    where LastDriverID='${phone}' and Status=4`;
    const last = connection.query(lastQuery);
    for (var i = 0; i < last.length; i++) {
        result.push(last[i]);
    }
    return result;
}