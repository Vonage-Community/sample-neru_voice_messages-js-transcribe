import { neru, Messages, Voice } from 'neru-alpha';
import express from 'express';

const app = express();
const port = process.env.NERU_APP_PORT;

app.use(express.json());

const vonageNumber = JSON.parse(process.env.NERU_CONFIGURATIONS).contact;

const session = neru.createSession();
const voice = new Voice(session);
await voice.onVapiAnswer('onCall').execute();

app.get('/_/health', async (req, res) => {
    res.sendStatus(200);
});

app.post('/onCall', async (req, res, next) => { 
    const session = neru.createSession();
    const voice = new Voice(session);
    const messages = new Messages(session);

    await messages.onMessage(
        'onMessage',
        {type: 'sms', number: req.body.from },
        vonageNumber
    ).execute();

    await voice.onVapiEvent({ vapiUUID: req.body.uuid, callback: "onEvent" }).execute();

    let ncco = [
        {
            action: 'talk',
            text: 'Say some words, then text this number for a transcript',
        },
        {
          "action": "input",
          "type": ["speech"]
        }
    ];

    res.json(ncco);
});

app.post('/onEvent', async (req, res) => {
    if (req.body.speech != null) {
        const session = neru.getSessionFromRequest(req);
        const state = session.getState();
        await state.set('text', req.body.speech.results[0].text);
    } else {
        console.log(req.body)
    }
    res.sendStatus(200);
});

app.post('/onMessage', async (req, res) => {
    const session = neru.getSessionFromRequest(req);
    const messages = new Messages(session);
    const state = session.getState();
    const text = await state.get('text');
   
    if (text != null) {
        await messages.send({
            message_type: "text",
            to: req.body.from,
            from: vonageNumber.number,
            channel: vonageNumber.type,
            text: text
        }).execute();
    }

    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
});
