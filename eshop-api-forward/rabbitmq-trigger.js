const amqp = require('amqplib');
const EventEmitter = require('events');

let amqpConnection;
let amqpChannel;
const cacheUpdateEmitter = new EventEmitter();

const connectRabbitMQ = async () => {
  amqpConnection = await amqp.connect('amqp://your-amqp-broker-url');
  amqpChannel = await amqpConnection.createChannel();
  await amqpChannel.assertQueue('cache-update');

  // Listen for RabbitMQ messages
  amqpChannel.consume('cache-update', (msg) => {    
    cacheUpdateEmitter.emit('cacheUpdated',msg); // Emit the event
  });
};

const publishCacheUpdate = (companyId) => {
  amqpChannel.sendToQueue('cache-update', Buffer.from(companyId));
};

module.exports = {
  connectRabbitMQ,
  publishCacheUpdate,
  cacheUpdateEmitter, // Export the event emitter
};
