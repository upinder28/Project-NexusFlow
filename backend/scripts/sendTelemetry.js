const http = require('http');

let value = 70;
let count = 0;

function send() {
  value += (Math.random() - 0.48) * 3;
  value = Math.max(50, Math.min(100, value));

  const body = JSON.stringify({ deviceId: 'device-1', sensorType: 'temperature', value: parseFloat(value.toFixed(2)) });
  const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/telemetry', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
    count++;
    if (count % 10 === 0) console.log(`Sent ${count} readings | last value: ${value.toFixed(2)}°C`);
  });
  req.on('error', (e) => console.error('Error:', e.message));
  req.write(body);
  req.end();
}

console.log('Sending telemetry for device-1 every 1s... (Ctrl+C to stop)');
setInterval(send, 1000);
