require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const environment = require('./src/configs/environment.config');
const corsOptions = require('./src/configs/cors.config');
const { globalLimiter } = require('./src/middlewares/index.middleware');
const mainRouter = require('./src/routes/index.routes');
const { globalErrorHandler, logger } = require('./src/utils/index.util');
const path = require('path');

const app = express();
const PORT = environment.port;

app.use(cors(corsOptions));
// app.use(cors({
//     origin: [
//         "http://localhost:8081",
//         "http://localhost:5173",
//         "http://localhost:3000",
//         "http://192.168.0.12:5173",
//         "http://192.168.0.12:8081",
//     ],
//     credentials: true,
//     methods: "GET,POST,PUT,PATCH,DELETE",
//     allowedHeaders: "Content-Type,Authorization"
// }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

app.use('/', (req, res, next) => globalLimiter(req, res, next), mainRouter);
app.use('/uploads', express.static(path.join(__dirname, 'src', 'uploads')));

app.use(globalErrorHandler);

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
