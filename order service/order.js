const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 4000;

// 미들웨어
app.use(cors());

// SQLite 데이터베이스 설정(상품 장부)
const db = new sqlite3.Database('./products.db'); // 파일로 데이터베이스 저장

// 데이터베이스 테이블 생성
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS products (item TEXT, remaining_quantity INTEGER)');
});

// (하드코딩된) 주문 정보
let item_name = 'mango';
let number_of_item = 5;
const orderData = { item: item_name, number: number_of_item };

// 주문 처리
app.get('/order', async (req, res) => {
    try {
        // Payment Server로 POST 요청
        const response = await axios.post('http://localhost:4001/payment', orderData);
        res.send('주문 성공했어요!');
    } catch (error) {
        res.status(500).send('주문 실패: 결제 서버에 문제가 있어요...');
    }
});

// 여러 아이템 & 수량 등록 처리
app.get('/insert', (req, res) => {
    const itemsToInsert = [
        { item: 'mango', number: 35 },
        { item: 'apple', number: 50 },
        { item: 'orange', number: 20 }
    ];

    db.serialize(() => {
        const insertStmt = db.prepare('INSERT INTO products (item, remaining_quantity) VALUES (?, ?)');

        itemsToInsert.forEach(({ item, number }) => {
            insertStmt.run(item, number, (err) => {
                if (err) {
                    console.error(`아이템 추가에 문제 생김... (${item})`, err);
                }
            });
        });

        insertStmt.finalize((err) => {
            if (err) {
                console.error('마지막에 뭔가 잘못됐네요...', err);
                res.status(500).send('추가 실패');
            } else {
                res.status(200).send('추가 성공했어요!');
            }
        });
    });
});

// 결과값 처리
app.post('/update', (req, res) => {
    db.get('SELECT remaining_quantity FROM products WHERE item = ?', [item_name], (err, row) => {
        if (err) {
            console.error('데이터를 가져오는 중에 문제가 있어요...', err);
            res.status(500).send('물건을 가져오는데 문제가 있어요');
        } else if (!row) {
            res.status(404).send('물건을 찾을 수 없어요...');
        } else {
            let remaining_quantity = row.remaining_quantity - number_of_item;

            db.run('UPDATE products SET remaining_quantity = ? WHERE item = ?', [remaining_quantity, item_name], (err) => {
                if (err) {
                    console.error('데이터 업데이트가 뭔가 잘못됐어요...', err);
                    res.status(500).send('업데이트 실패했어요');
                } else {
                    res.status(200).send('주문 성공했어요!');
                }
            });
        }
    });
});

// 모든 재고 내역 조회
app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) {
            console.error('재고 데이터를 불러오는데 문제가 있어요...', err);
            res.status(500).send('재고 확인 실패');
        } else {
            res.json(rows);
        }
    });
});

// 포트 연결
app.listen(PORT, () => {
    console.log(`주문 서버가 포트 ${PORT}에서 열렸어요!`);
});
