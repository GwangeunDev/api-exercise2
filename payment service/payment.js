const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
const PORT = 4001;

//미들웨어
app.use(cors());
app.use(bodyParser.json());

// SQLite 데이터베이스 설정
const db = new sqlite3.Database('./payments.db'); // 파일로 데이터베이스 저장

// 데이터베이스 테이블 생성
db.serialize(() => {
    db.run('CREATE TABLE if not exists payments (id INTEGER PRIMARY KEY, item TEXT, price INTEGER)'); // if not exists로 payments가 이미 있을 경우의 오류 방지.
});

// 결제 요청 처리
app.post('/payment', (req, res) => {
    console.log(req.body);  // 요청 데이터 출력

    const { item, price } = req.body;

    db.run('INSERT INTO payments (item, price) VALUES (?, ?)', [item, price], (err) => {
        if (err) {
            console.error('Database insertion error:', err);
            res.status(500).send('Payment failed');
        } else {
            // 성공 시
            res.status(200).send('Payment success');
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


app.listen(PORT, () => {
    console.log(`Payment server running on port ${PORT}`);
});
