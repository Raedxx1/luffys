import fetch from "node-fetch";
import { Low, JSONFile } from "lowdb";
import { join } from 'path';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

// إعداد قاعدة البيانات
const file = join('db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// قراءة البيانات من قاعدة البيانات
await db.read();
db.data ||= { conversations: [], users: [], aiStatus: 'on' }; // تم تعيين الذكاء الاصطناعي ليكون "تشغيل" افتراضياً

// إعداد عميل واتساب
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    // عرض QR كود في الطرفية
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async (msg) => {
    if (db.data.aiStatus === 'off') {
        return;
    }

    const text = msg.body;

    try {
        await msg.reply("جارٍ معالجة طلبك...");

        // تحميل المحادثات السابقة لهذا المستخدم
        const previousConversations = db.data.conversations
            .filter(convo => convo.user === msg.from)
            .map(convo => ({
                role: 'user',
                content: convo.message
            }));

        // إعداد الرسائل التي سيتم إرسالها إلى GPT
        const messages = [
            { role: 'system', content: 'أنت بوت واتس اب اسمه لوفي. تتحدث باللهجة المصرية وتتصرف كما لو كنت لوفي من أنمي "ون بيس". مطورك هو ميليودس. وانت تكره انمي اتاك اون تايتن او هجوم العمالقة وتكره خصوصاً شخصية ايرين' },
            ...previousConversations,
            { role: 'user', content: text }
        ];

        let res = await chatWithGPT(messages);
        const responseContent = res.choices[0].message.content;
        await msg.reply(responseContent);

        // حفظ المحادثة
        db.data.conversations.push({ user: msg.from, message: text, response: responseContent });

        // كتابة البيانات في قاعدة البيانات
        await db.write();
    } catch (e) {
        console.error(e);
        await msg.reply('حدث خطأ أثناء معالجة طلبك.');
    }
});

client.initialize();

/* New Line */
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
