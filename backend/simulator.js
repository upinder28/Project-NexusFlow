// Mock telemetry simulator — sends fake sensor data every second
const http = require('http');

const DEVICE_ID = 'device-1';
const SENSOR_TYPE = 'temperature';
const PORT = process.env.PORT || 5000;

let base = 70;

function sendTelemetry() {
  // Random walk: value dheere dheere upar neeche jaata hai
  base += (Math.random() - 0.48) * 3;
  base = Math.max(50, Math.min(100, base)); // clamp 50–100
  const value = parseFloat(base.toFixed(2));

  const body = JSON.stringify({ deviceId: DEVICE_ID, sensorType: SENSOR_TYPE, value });

  const req = http.request(
    { hostname: 'localhost', port: PORT, path: '/api/telemetry', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
    (res) => process.stdout.write(`[${new Date().toISOString()}] Sent ${value}°C → ${res.statusCode}\n`)
  );

  req.on('error', (e) => console.error('Simulator error:', e.message));
  req.write(body);
  req.end();
}

console.log(`Simulator started → hitting http://localhost:${PORT}/api/telemetry every 1s`);
setInterval(sendTelemetry, 1000);
