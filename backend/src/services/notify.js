const Contact = require("../models/Contact");

// Builds the text message that trusted contacts receive
function buildSosMessage(name, lat, lng) {
    const link = `https://maps.google.com/?q=${lat},${lng}`;
    return (
        `EMERGENCY SOS: ${name || "Someone you know"} needs help. ` +
        `Location: ${link} ` +
        `Please call them, or call 112 if you cannot reach them. - Sent by Shakti`
    );
}

// DEVELOPMENT VERSION: prints the SMS instead of sending it.
// In production, a provider like Twilio would replace this function.
async function sendSms(phone, text) {
    console.log(`[SMS to ${phone}] ${text}`);
    return { phone, sent: true, mode: "development" };
}

// Messages every trusted contact of this user (primary contact first)
async function notifyContacts(user, lat, lng) {
    const contacts = await Contact.find({ owner: user._id }).sort({
        isPrimary: -1,
        createdAt: 1,
    });
    const text = buildSosMessage(user.name, lat, lng);

    const results = [];
    for (const c of contacts) {
        results.push({ name: c.name, ...(await sendSms(c.phone, text)) });
    }
    return { text, results };
}

module.exports = { notifyContacts };