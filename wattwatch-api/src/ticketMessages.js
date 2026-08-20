import { Op } from 'sequelize';
import { Ticket, TicketMessage } from './models/index.js';

/** Seed thread from legacy ticket.body (and optional admin_reply). */
export async function ensureTicketThread(ticket) {
  const plain = ticket.get ? ticket.get({ plain: true }) : ticket;
  const ticketId = plain.id;

  const existing = await TicketMessage.count({ where: { ticket_id: ticketId } });
  if (existing === 0 && plain.body) {
    await TicketMessage.create({
      ticket_id: ticketId,
      sender_role: 'customer',
      sender_name: 'You',
      body: plain.body,
      created_at: plain.created_at ?? new Date(),
    });
  }

  if (plain.admin_reply) {
    const staffCount = await TicketMessage.count({
      where: { ticket_id: ticketId, sender_role: 'staff' },
    });
    if (staffCount === 0) {
      await TicketMessage.create({
        ticket_id: ticketId,
        sender_role: 'staff',
        sender_name: 'Support',
        body: plain.admin_reply,
      });
    }
  }
}

export async function listTicketMessages(ticketId) {
  return TicketMessage.findAll({
    where: { ticket_id: ticketId },
    order: [['created_at', 'ASC'], ['id', 'ASC']],
  });
}

export async function addTicketMessage({ ticketId, senderRole, senderName, body }) {
  const text = String(body || '').trim();
  if (!text) throw new Error('Message cannot be empty');

  return TicketMessage.create({
    ticket_id: ticketId,
    sender_role: senderRole,
    sender_name: senderName || (senderRole === 'staff' ? 'Support' : 'Customer'),
    body: text,
  });
}

async function unreadCount(ticket, readerRole) {
  await ensureTicketThread(ticket);
  const plain = ticket.get ? ticket.get({ plain: true }) : ticket;
  const since = readerRole === 'customer' ? plain.customer_last_read_at : plain.staff_last_read_at;
  const senderRole = readerRole === 'customer' ? 'staff' : 'customer';

  const where = { ticket_id: plain.id, sender_role: senderRole };
  if (since) where.created_at = { [Op.gt]: since };
  return TicketMessage.count({ where });
}

export async function unreadSummaryForCustomer(userId) {
  const tickets = await Ticket.findAll({
    where: { user_id: userId },
    attributes: ['id', 'subject', 'customer_last_read_at', 'body', 'admin_reply', 'created_at'],
  });

  const perTicket = [];
  let total = 0;
  for (const ticket of tickets) {
    const count = await unreadCount(ticket, 'customer');
    if (count > 0) {
      perTicket.push({ ticketId: ticket.id, subject: ticket.subject, count });
      total += count;
    }
  }
  return { total, tickets: perTicket };
}

export async function unreadSummaryForStaff() {
  const tickets = await Ticket.findAll({
    attributes: ['id', 'subject', 'crm_id', 'staff_last_read_at', 'body', 'admin_reply', 'created_at'],
  });

  const perTicket = [];
  let total = 0;
  for (const ticket of tickets) {
    const count = await unreadCount(ticket, 'staff');
    if (count > 0) {
      perTicket.push({
        ticketId: ticket.id,
        crmId: ticket.crm_id,
        subject: ticket.subject,
        count,
      });
      total += count;
    }
  }
  return { total, tickets: perTicket };
}

export async function markReadByCustomer(ticketId, userId) {
  const [n] = await Ticket.update(
    { customer_last_read_at: new Date(), updated_at: new Date() },
    { where: { id: ticketId, user_id: userId } },
  );
  return n > 0;
}

export async function markReadByStaff(ticketId) {
  const [n] = await Ticket.update(
    { staff_last_read_at: new Date(), updated_at: new Date() },
    { where: { id: ticketId } },
  );
  return n > 0;
}

export async function unreadCountForTicket(ticketId, readerRole) {
  const ticket = await Ticket.findByPk(ticketId, {
    attributes: ['id', 'customer_last_read_at', 'staff_last_read_at', 'body', 'admin_reply', 'created_at'],
  });
  if (!ticket) return 0;
  return unreadCount(ticket, readerRole);
}
