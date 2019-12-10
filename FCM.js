var FCM = require('fcm-node');

exports.PushNormal = function (token, message) {
    var serverKey = "AAAAxUWFW2A:APA91bFGqmC114bcuoBLFgFL7SdAWQXfFBmrT29j3iKTrpP_34ItIrALD15C2AnpSbzPCWD-euMqe8pA8rludKHwIuliH-39q2ArKlCq4P22pCkhpPljpGJJ-GFrU4C8pYO7zsu7G76e";
    var fcm = new FCM(serverKey);

    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: token,
        notification: {
            title:'BoxLinker',
            body: message
        },

        data: {  //you can send only notification or only data(or include both)
            my_key: 'my value',
            my_another_key: 'my another value'
        }
    };

    fcm.send(message, function (err, response) {
        if (err) {
            console.error(err);
        } else {
            console.log('fcm 발송 성공');
        }
    });

}