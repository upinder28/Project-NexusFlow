const { Subject } = require('rxjs');

// One Subject per deviceId — sensor data aata hai toh isme push hota hai
const sensorStreams = {};

function getSensorStream(deviceId) {
  if (!sensorStreams[deviceId]) {
    sensorStreams[deviceId] = new Subject();
  }
  return sensorStreams[deviceId];
}

function pushToStream(deviceId, value) {
  const stream = getSensorStream(deviceId);
  stream.next(value);
}

module.exports = { getSensorStream, pushToStream };
