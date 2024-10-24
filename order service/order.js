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
    db.run('CREATE TABLE if not exists products (item TEXT, remaining_quantity INTEGER)');
});

// (하드코딩 된)주문 정보
let item_name = 'banana'
let number_of_item = 5
const orderData = { item: item_name, number: number_of_item };


// 주문 처리
app.get('/order', async (req, res) => {
    try { // Payment Server로 POST 요청
        const response = await axios.post('http://localhost:4001/payment', orderData);
        res.send('Order success');
    } catch (error) { // 오류 발생 시
        res.status(500).send('Order failed: Payment server error');
    }
});

// 새로운 아이템&수량 등록 처리
app.get('/insert', (req, res) => {
    // 하드코딩
    let new_item = 'mango';
    let new_number = 35;
    db.run('INSERT INTO products (item, remaining_quantity) VALUES (?,?)', [new_item, new_number], (err) => {
        if (err) {
            console.error('Database insertion error:', err);
            res.status(500).send('Order failed');
        } else {
            res.status(200).send('Order success');
        }
    });
});

// 결과값 처리
app.post('/update', (req, res) => { //-------------->이것만 하면 또 됨
    // 먼저 아이템의 남은 수량을 가져옴
    db.get('SELECT remaining_quantity FROM products WHERE item = ?', [item_name], (err, row) => {
        if (err) {
            console.error('Database retrieval error:', err);
            res.status(500).send('Error retrieving item');
        } else if (!row) {
            // 만약 아이템이 존재하지 않으면 에러 처리
            res.status(404).send('Item not found');
        } else {
            // 남은 수량을 계산하고 업데이트
            let remaining_quantity = row.remaining_quantity - number_of_item;

            db.run('UPDATE products SET remaining_quantity = ? WHERE item = ?', [remaining_quantity, item_name], (err) => {
                if (err) {
                    console.error('Database update error:', err);
                    res.status(500).send('Order failed');
                } else {
                    res.status(200).send('Order success');
                }
            });
        }
    });
});


// 모든 재고 내역을 조회
app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
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
    console.log(`Order server running on port ${PORT}`);
});
