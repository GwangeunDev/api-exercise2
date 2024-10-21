const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 4000;


app.get('/order', async (req, res) => {
    const orderData = { item: 'Sample', price: 7700 };  // 하드코딩된 주문 정보

    try {
        // Payment Server로 POST 요청
        const response = await axios.post('http://localhost:4001/payment', orderData);
        res.send(`Order success: ${response.data.message}`);
    } catch (error) {
        // 오류 발생 시 오류 메시지를 콘솔에 기록
        console.error('Order error:', error.response ? error.response.data : error.message); // 서버 응답이 있을 경우 error.response.data를, 없을 경우 error.message를 출력
        res.status(500).send('Order failed: Payment server error');
    }
});


app.listen(PORT, () => {
    console.log(`Order server running on port ${PORT}`);
});
