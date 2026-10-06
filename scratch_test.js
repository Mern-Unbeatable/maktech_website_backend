import imaps from 'imap-simple';
import dotenv from 'dotenv';
dotenv.config();

const imapConfig = {
    imap: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASS,
        host: process.env.EMAIL_IMAP_HOST || process.env.EMAIL_HOST,
        port: process.env.EMAIL_IMAP_PORT || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 3000,
    }
};

async function test() {
    console.time("connectAndOpen");
    const connection = await imaps.connect(imapConfig);
    await connection.openBox('INBOX');
    console.timeEnd("connectAndOpen");

    console.time("searchAll");
    const allMessages = await connection.search(['ALL'], { bodies: [] });
    console.timeEnd("searchAll");

    connection.end();
}
test();
