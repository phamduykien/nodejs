// ... (import statements)

const app = express();
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const cache = new NodeCache();

let mysqlConnection;
const rabbitmq = require('./rabbitmq'); // Import module for RabbitMQ

const updateCache = async () => {
  // Load configuration from MySQL and cache it
  const [rows] = await mysqlConnection.query('SELECT * FROM config_table');
  const configData = {};
  rows.forEach((row) => {
    configData[row.key] = row.value;
  });
  cache.set('config', configData);
};

const clearCacheAndReload = async () => {
  // Clear cache and reload configuration from MySQL
  cache.flushAll();
  await updateCache();
};

// Listen for the cache update event from RabbitMQ
rabbitmq.cacheUpdateEmitter.on('cacheUpdated', () => {
  clearCacheAndReload();
  console.log('Cache updated');
});

// ... (express routes)

// Start RabbitMQ connection
rabbitmq.connectRabbitMQ(); // Connect to RabbitMQ

const startServer = async () => {
  try {
    mysqlConnection = await mysql.createConnection(config.mysql);

    await updateCache();

    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  } catch (err) {
    console.error('Error starting the server:', err);
  }
};

startServer();
