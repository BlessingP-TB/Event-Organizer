require('dotenv').config();
const { PrismaClient } = require('./prisma/generate/prisma');
const bcrypt = require('bcrypt');
const readline = require('readline');
const Joi = require('joi');

const prisma = new PrismaClient();

const { SUPER_ADMIN_PASSWORD } = process.env;

const HARDCODED_PASSWORD_POLICY = {
    minLength: 10,
    regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/,
    errorMessage:
        'Password must be at least 10 characters long and include at least one uppercase letter, one lowercase letter, and one digit.',
};

const HARDCODED_ERROR_MESSAGES = {
    INVALID_CELLPHONE_FORMAT:
        'Cellphone number must be in international format (e.g., +27721234567).',
};

const customJoi = Joi.extend((joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.password': HARDCODED_PASSWORD_POLICY.errorMessage,
    },
    rules: {
        password: {
            validate(value, helpers) {
                if (!HARDCODED_PASSWORD_POLICY.regex.test(value)) {
                    return helpers.error('string.password');
                }
                return value;
            },
        },
    },
}));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer.trim());
        });
    });
}

function passwordQuestion(prompt) {
    return new Promise((resolve) => {
        const onData = (char) => {
            char = char.toString();
            if (char === '\n' || char === '\r') {
                process.stdin.setRawMode(false);
                process.stdin.off('data', onData);
                process.stdout.write('\n');
                resolve(buffer);
            } else if (char === '\u0003') {
                process.exit();
            } else {
                process.stdout.write('*');
                buffer += char;
            }
        };
        let buffer = '';
        process.stdout.write(prompt);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', onData);
    });
}

async function validatedQuestion(prompt, schema) {
    while (true) {
        const answer = await question(prompt);
        const { error, value } = schema.validate(answer);
        if (error) {
            console.error(
                `❌ Validation Error: ${error.details.map((d) => d.message).join(', ')}\n`
            );
        } else {
            return value;
        }
    }
}

const schemas = {
    email: customJoi.string().email().required().label('Email'),
    name: customJoi.string().min(2).required().label('Full Name'),
    password: customJoi.string().password().required().label('Password'),
    cellphone: customJoi
        .string()
        .pattern(/^\+[1-9]\d{1,14}$/)
        .required()
        .messages({
            'string.pattern.base': HARDCODED_ERROR_MESSAGES.INVALID_CELLPHONE_FORMAT,
        })
        .label('Cellphone Number'),
};

async function createAdmin() {
    console.log('\n=== Create New Admin User ===\n');

    const email = await validatedQuestion('Admin email: ', schemas.email);
    await validatedQuestion(
        'Confirm admin email: ',
        schemas.email.valid(email).messages({ 'any.only': 'Emails do not match.' })
    );

    const name = await validatedQuestion('Admin full name: ', schemas.name);

    const password = await validatedQuestion(
        `Admin password (${HARDCODED_PASSWORD_POLICY.errorMessage}): `,
        schemas.password
    );
    await validatedQuestion(
        'Confirm admin password: ',
        customJoi
            .string()
            .valid(password)
            .required()
            .messages({ 'any.only': 'Passwords do not match.' })
    );

    const cellphone_number = await validatedQuestion(
        'Admin cellphone number (e.g., +27721234567): ',
        schemas.cellphone
    );
    await validatedQuestion(
        'Confirm admin cellphone number: ',
        customJoi
            .string()
            .valid(cellphone_number)
            .required()
            .messages({ 'any.only': 'Cellphone numbers do not match.' })
    );

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.error('\n❌ Error: User with this email already exists.');
        return;
    }

    const hashedPassword = await bcrypt.hash(
        password,
        parseInt(process.env.BCRYPT_ROUNDS || '10', 10)
    );

    const adminUser = await prisma.user.create({
        data: {
            email,
            name,
            role: 'ADMIN',
            cellphone_number: cellphone_number,
            account: {
                create: {
                    passwordHash: hashedPassword,
                    emailVerified: true,
                },
            },
        },
    });

    console.log('\n✅ Admin user created successfully!');
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`👤 Name: ${adminUser.name}`);
    console.log(`📱 Phone: ${adminUser.cellphone_number}`);
}

async function showMenu() {
    while (true) {
        console.log('\n--- Super Admin Menu ---');
        console.log('[1] Create New Admin User');
        console.log('[2] Exit');
        const choice = await question('Select an option: ');

        switch (choice) {
            case '1':
                await createAdmin();
                break;
            case '2':
                return;
            default:
                console.error('❌ Invalid option. Please try again.');
        }
    }
}

async function main() {
    if (!SUPER_ADMIN_PASSWORD) {
        console.error(
            '❌ Error: SUPER_ADMIN_PASSWORD must be set in your .env file.'
        );
        return;
    }

    const inputPassword = await passwordQuestion(
        'Enter Super Admin Password: '
    );
    if (inputPassword !== SUPER_ADMIN_PASSWORD) {
        console.error('❌ Authentication failed. Exiting.');
        return;
    }

    console.log('\n✅ Super Admin Authenticated.');
    await showMenu();
}

main()
    .catch((e) => {
        console.error('Error:', e);
    })
    .finally(async () => {
        rl.close();
        await prisma.$disconnect();
    });