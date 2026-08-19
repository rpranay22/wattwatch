import 'dotenv/config';
import { sequelize, Ticket } from '../src/models/index.js';

const qi = sequelize.getQueryInterface();
let tickets;
try {
  tickets = await qi.describeTable('tickets');
} catch {
  console.log('No tickets table');
  await sequelize.close();
  process.exit(0);
}

const isCrmShape = tickets.customerId && tickets.description && !tickets.user_id && !tickets.body;
console.log('CRM-corrupted tickets table:', isCrmShape);
console.log('columns:', Object.keys(tickets).join(', '));

if (isCrmShape) {
  const [count] = await sequelize.query('SELECT COUNT(*) AS c FROM tickets');
  console.log('rows to lose:', count[0]?.c);
}

await sequelize.close();
