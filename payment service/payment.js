const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
const PORT = 4001;

//미들웨어
app.use(cors());
app.use(bodyParser.json());

// SQLite 데이터베이스 설정(결제 장부)
const db = new sqlite3.Database('./payments.db'); // 파일로 데이터베이스 저장

// 데이터베이스 테이블 생성
db.serialize(() => {
    db.run('CREATE TABLE if not exists payments (id INTEGER PRIMARY KEY, item TEXT, number INTEGER)');
});

// 결제 요청 처리
app.post('/payment', (req, res) => {
    console.log(req.body);  // 요청 데이터 출력

    const { item, number } = req.body;

    db.run('INSERT INTO payments (item, number) VALUES (?, ?)', [item, number], (err) => {
        if (err) {
            console.error('Database insertion error:', err);
            res.status(500).send('Payment failed');
        } else {
            res.status(200).send('Payment success');
            // -------------------------> order server에서 get order을 하면 왜 update가 안 되는지
            async (req, res) => {
                try { // order server의 products DB에 결과값 처리(order server에 POST) 요청
                    const response = await axios.post('http://localhost:4000/update');
                    res.send(`All success: ${response.data.massage}`);
                } catch (error) { // 오류 발생 시
                    res.status(500).send('Payment failed: order server error')
                }
            }
        }
    });
});

// 모든 결제 내역을 조회
app.get('/payments', (req, res) => {
    db.all('SELECT * FROM payments', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).send('Error retrieving payments');
        } else {
            res.json(rows);
        }
    });
});


// 포트 연결
app.listen(PORT, () => {
    console.log(`Payment server running on port ${PORT}`);
});
