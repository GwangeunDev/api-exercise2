const express = require('express'); 
const axios = require('axios');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
const PORT = 4001;

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());

// SQLite 데이터베이스 설정(결제 장부)
const db = new sqlite3.Database('./payments.db'); // 파일로 데이터베이스 저장

// 데이터베이스 테이블 생성
db.serialize(() => {
    db.run('CREATE TABLE if not exists payments (id INTEGER PRIMARY KEY, item TEXT, number INTEGER)');
});

// 결제 요청 처리
app.post('/payment', async (req, res) => {
    console.log('받은 요청:', req.body);  // 요청 데이터 출력

    const { item, number } = req.body;

    // 비동기 함수 내부에서 에러를 핸들링하며 DB 삽입 로직을 포함합니다.
    try {
        // 1. payments.db에 결제 정보 삽입
        const paymentId = await new Promise((resolve, reject) => {
            db.run('INSERT INTO payments (item, number) VALUES (?, ?)', [item, number], function (err) {
                if (err) {
                    console.error('데이터 넣는 도중에 문제가 생겼어요...', err);
                    reject(err);  // 에러 발생 시 Promise reject
                } else {
                    resolve(this.lastID); // 삽입된 행의 ID 반환
                }
            });
        });

        // 2. order 서버에 POST 요청으로 products.db 업데이트
        const response = await axios.post('http://localhost:4000/update', { item, number });

        // 모든 요청이 성공하면 최종 응답
        res.status(200).send('결제와 주문 업데이트 성공했어요!');

    } catch (error) {
        console.error('결제 처리 중에 문제가 생겼어요...', error);

        // 3. 보상 트랜잭션: products.db 업데이트 실패 시 payments.db에서 결제 취소
        if (error.isAxiosError) {  // order 서버 오류
            db.run('DELETE FROM payments WHERE item = ? AND number = ?', [item, number], (err) => {
                if (err) {
                    console.error('결제 취소도 실패했어요...', err);
                    res.status(500).send('결제 실패, 취소도 실패했어요...');
                } else {
                    res.status(500).send('결제 실패, 취소는 성공했어요');
                }
            });
        } else {  // DB 오류 처리
            res.status(500).send('결제 실패: 데이터베이스에 문제가 있어요');
        }
    }
});

// 모든 결제 내역을 조회
app.get('/payments', (req, res) => {
    db.all('SELECT * FROM payments', [], (err, rows) => {
        if (err) {
            console.error('데이터 불러오는 중에 문제가 있어요...', err);
            res.status(500).send('결제 내역을 불러오지 못했어요');
        } else {
            res.json(rows);
        }
    });
});

// 포트 연결
app.listen(PORT, () => {
    console.log(`결제 서버가 포트 ${PORT}에서 실행 중이에요!`);
});