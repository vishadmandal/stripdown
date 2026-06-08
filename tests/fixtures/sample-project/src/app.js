const { map, filter } = require('lodash');
const axios = require('axios');
const { config: dotenvConfig } = require('dotenv');

const data = [1, 2, 3, 4, 5];
const doubled = map(data, n => n * 2);
const evens = filter(doubled, n => n % 2 === 0);

async function fetchData() {
    const response = await axios.get('https://api.example.com/data');
    return response.data;
}

dotenvConfig();

console.log({ evens });
