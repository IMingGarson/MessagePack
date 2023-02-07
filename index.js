const encoder = require('./dist/Encoder').encode;
const decoder = require('./dist/Decoder').decode;
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: false })); 
app.use(express.json());
app.set('views', './views');
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
    res.render('index', {
        json: "",
        msgppack: "",
        encoded: "",
        decoded: ""
    });
});

app.post('/api/encode', function (req, res) {
    if (!req?.body?.inputJson) {
        return false;
    }
    const jsonData = JSON.parse(req?.body.inputJson);
    const encoded = encoder(jsonData);
    let hexData = [];
    for (let i = 0; i < encoded.length; i++) {
        let hex = ('0000' + encoded[i].toString(16).toLowerCase()).substr(-2);
        hexData.push(hex);
    }

    return res.render('index', {
        json: JSON.stringify(jsonData),
        msgppack: "",
        encoded: hexData.join(' '),
        decoded: ""
    });
});
app.post('/api/decode', function (req, res) {
    if (!req?.body?.inputMsgPack) {
        return false;
    }
    const trimmed = req?.body.inputMsgPack.replace(/\s+/g, '');
    const hex = Uint8Array.from(Buffer.from(trimmed, 'hex'));
    const decoded = decoder(hex);
    return res.render('index', {
        json: "",
        msgppack: req?.body.inputMsgPack,
        encoded: "",
        decoded: JSON.stringify(decoded)
    });
});

app.listen(3000)