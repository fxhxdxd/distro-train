import { Client, TopicId, TopicMessageQuery, } from '@hashgraph/sdk';
import Store from 'electron-store';
import { OPERATOR_ID, OPERATOR_KEY } from './utils.js';
const store = new Store();
export class LogService {
    subscription = null;
    client;
    constructor() {
        if (!OPERATOR_ID || !OPERATOR_KEY) {
            console.error('Operator credentials not found in .env for LogService.');
            this.client = Client.forTestnet();
            return;
        }
        this.client = Client.forTestnet().setOperator(OPERATOR_ID, OPERATOR_KEY);
    }
    startSubscription(mainWindow, projectId, topicId) {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        console.log(`Starting HCS log subscription for Project ${projectId} on Topic ${topicId}`);
        this.subscription = new TopicMessageQuery()
            .setTopicId(TopicId.fromString(topicId))
            .subscribe(this.client, null, (message) => {
            const newLog = {
                content: Buffer.from(message.contents).toString(),
                timestamp: message.consensusTimestamp.toString(),
            };
            console.log('New Log Received:', newLog);
            const logKey = `logs-${projectId}`;
            const currentLogs = store.get(logKey, []);
            currentLogs.push(newLog);
            store.set(logKey, currentLogs);
            mainWindow.webContents.send('hcs:new-log', newLog);
        });
    }
    stopSubscription() {
        if (this.subscription) {
            console.log('Stopping HCS log subscription.');
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
}
