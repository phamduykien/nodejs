const proxy = require('express-http-proxy');
const app = require('express')();
const cache = require('memory-cache');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const rabbitmq = require('./rabbitmq'); // Import module for RabbitMQ

const defaultPrefix = "g1";
let mysqlConnection;
/**
 * Callback để clear cache
 * Trường hợp chạy balance nhiều service thì không được
 */
app.use('/publishCallback', function (req, res) {
    const companyCode=req.params["cpid"];
    rabbitmq.publishCacheUpdate(companyCode);
    res.send("Ok");
})

app.use('/', proxy(getProxyUrl));
function getProxyUrl(incomingMessage) {
    const originalUrl = incomingMessage.url;
    const companyCode = incomingMessage.headers["companyCode"];
    let prefix = defaultPrefix;
    if (companyCode) {
        const prefixCache = cache.get(companyCode);
        if (prefixCache) prefix = prefixCache;
    }
    return prefix + "/" + originalUrl;
}
/**
 * Lần đầu start lên lấy hết danh sách company để cache
 * Chú ý có paging đến hết
 */
function initCache() {
    cache.clear();
}

const clearCacheAndReload = async () => {
    // Clear cache and reload configuration from MySQL
    cache.clear();
    await updateCache();
};

// Listen for the cache update event from RabbitMQ
rabbitmq.cacheUpdateEmitter.on('cacheUpdated', () => {
    clearCacheAndReload();
    console.log('Cache updated');
});

const updateCache = async (companyId) => {
    let rows;
    if (companyId){
        rows = await mysqlConnection.query('SELECT * FROM config_table WHERE cpid=@cpid',companyId);
    }else{
        rows = await mysqlConnection.query('SELECT * FROM config_table');
    }
    
    
    const configData = {};
    rows.forEach((row) => {
        configData[row.key] = row.value;
    });
    cache.set('config', configData);
};

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