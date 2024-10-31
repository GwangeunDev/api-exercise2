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
let number_of_item = 50;
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
        { item: 'pineapple', number: 50 },
        { item: 'lemon', number: 20 }
    ];

    db.serialize(() => {
        itemsToInsert.forEach(({ item, number }) => {
            // 먼저 아이템이 있는지 확인
            db.get('SELECT remaining_quantity FROM products WHERE item = ?', [item], (err, row) => {
                if (err) {
                    console.error(`아이템 조회 중 오류 발생 (${item})`, err);
                    return res.status(500).send('아이템 조회 실패');
                }

                if (row) {
                    // 아이템이 이미 있을 때: 수량 업데이트
                    const updatedQuantity = row.remaining_quantity + number;
                    db.run('UPDATE products SET remaining_quantity = ? WHERE item = ?', [updatedQuantity, item], (err) => {
                        if (err) {
                            console.error(`아이템 수량 업데이트 중 오류 발생 (${item})`, err);
                        }
                    });
                } else {
                    // 아이템이 없을 때: 새로 추가
                    db.run('INSERT INTO products (item, remaining_quantity) VALUES (?, ?)', [item, number], (err) => {
                        if (err) {
                            console.error(`아이템 추가 중 오류 발생 (${item})`, err);
                        }
                    });
                }
            });
        });

        res.status(200).send('재고 추가/업데이트 완료!');
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
        } else if (row.remaining_quantity < number_of_item) {
            res.status(400).send('주문하려는 수량이 남아 있는 개수보다 많아요...');
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