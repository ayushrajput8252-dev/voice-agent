
const http = require('http');
const req = http.request('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', d => console.log('DATA:', d.toString()));
  res.on('end', () => console.log('END'));
});
req.write(JSON.stringify({ message: 'What is the weather in London?', conversationHistory: [] }));
req.end();

