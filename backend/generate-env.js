const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const {
    DB_SERVER_NAME,
    DB_SERVER,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASS,
} = process.env;

if (!DB_SERVER_NAME || !DB_SERVER || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASS) {
    throw new Error('Missing required DB environment variables (DB_SERVER_NAME, DB_SERVER, DB_PORT, DB_NAME, DB_USER, DB_PASS)');
}

function getConnectionString() {
    const user = encodeURIComponent(DB_USER);
    const pass = encodeURIComponent(DB_PASS);
    const server = encodeURIComponent(DB_SERVER);
    const port = encodeURIComponent(DB_PORT);
    const name = encodeURIComponent(DB_NAME);

    switch (DB_SERVER_NAME.toLowerCase()) {
        case 'postgresql':
        case 'postgres':
            return `postgresql://${user}:${pass}@${server}:${port}/${name}?schema=public`;
        case 'mysql':
            return `mysql://${user}:${pass}@${server}:${port}/${name}`;
        case 'sqlserver':
        case 'mssql':
            return `sqlserver://${server}:${port};database=${name};user=${user};password=${pass};trustServerCertificate=true`;
        default:
            throw new Error(`Unsupported DB type: ${DB_SERVER_NAME}`);
    }
}

const DATABASE_URL = getConnectionString();

const envPath = path.join(process.cwd(), '.env');

let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
}

const lines = envContent.split('\n');
const otherLines = lines.filter(line => !line.startsWith('DATABASE_URL='));

if (otherLines.length > 0 && otherLines[otherLines.length - 1] === '') {
    otherLines.pop();
}

const newEnvContent = otherLines
    .concat(`DATABASE_URL="${DATABASE_URL}"`)
    .join('\n');

fs.writeFileSync(envPath, newEnvContent);

console.log('DATABASE_URL updated in .env');
