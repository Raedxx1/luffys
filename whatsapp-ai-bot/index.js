const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');
const { Low, JSONFile } = require('lowdb');
const { join } = require('path');

// إعداد قاعدة البيانات
const file = join('db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// قراءة البيانات من قاعدة البيانات
async function initDB() {
  await db.read();
  db.data ||= { conversations: [], users: [], aiStatus: 'on' };
  await db.write();
}

initDB();

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async msg => {
    if (db.data.aiStatus === 'off') return;

    const chat = await msg.getChat();
    if (!chat.isGroup) {
        const text = msg.body;

        const messages = [
            { role: 'system', content: 'أنت بوت واتس اب اسمه لوفي. تتحدث باللهجة المصرية وتتصرف كما لو كنت لوفي من أنمي "ون بيس". مطورك هو ميليودس. وانت تكره انمي اتاك اون تايتن او هجوم العمالقة وتكره خصوصاً شخصية ايرين' },
            { role: 'user', content: text }
        ];

        try {
            const response = await chatWithGPT(messages);
            const responseContent = response.choices[0].message.content;
            msg.reply(responseContent);

            // حفظ المحادثة
            db.data.conversations.push({ user: msg.from, message: text, response: responseContent });
            if (!db.data.users.includes(msg.from)) {
                db.data.users.push(msg.from);
            }
            await db.write();
        } catch (e) {
            console.error(e);
            msg.reply('حدث خطأ أثناء معالجة طلبك.');
        }
    }
});

async function chatWithGPT(messages) {
    try {
        const response = await fetch("https://chatbot-ji1z.onrender.com/chatbot-ji1z", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ messages }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
}

client.initialize();
