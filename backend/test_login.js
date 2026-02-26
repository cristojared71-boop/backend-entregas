const axios = require('axios');

async function testLogin() {
    try {
        console.log("Testing Login...");
        const response = await axios.post('http://127.0.0.1:5000/api/login', {
            matricula: 'admin',
            password: '123456' 
        });
        console.log("Login Status:", response.status);
        console.log("Login Data:", response.data);
    } catch (error) {
        console.error("Login Failed:", error.response ? error.response.data : error.message);
    }
}

testLogin();
