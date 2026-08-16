import amqplib from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

export interface ObservedEvent {
  eventId: string;
  eventType: string;
  payload: any;
  exchange: string;
  timestamp: Date;
}

class EventObserver {
  private events: ObservedEvent[] = [];
  private connection: any = null;
  private channel: any = null;
  private queues: string[] = [];
  private tag: string;

  constructor() {
    this.tag = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async start() {
    this.connection = await amqplib.connect(RABBITMQ_URL);
    this.channel = await this.connection.createChannel();

    const exchanges = [
      { name: 'booking_events_exchange', queue: `${this.tag}-booking` },
      { name: 'payment_events_exchange', queue: `${this.tag}-payment` },
    ];

    for (const { name, queue } of exchanges) {
      await this.channel.assertExchange(name, 'fanout', { durable: true });
      await this.channel.assertQueue(queue, { durable: false, autoDelete: true });
      await this.channel.bindQueue(queue, name, '');
      this.queues.push(queue);

      this.channel.consume(queue, (msg: any) => {
        if (!msg) return;
        const raw = JSON.parse(msg.content.toString());
        this.events.push({
          eventId: raw.eventId,
          eventType: raw.eventType,
          payload: raw.payload,
          exchange: name,
          timestamp: new Date(),
        });
        this.channel.ack(msg);
      });
    }
  }

  async stop() {
    try {
      if (this.channel) {
        for (const q of this.queues) {
          try { await this.channel.deleteQueue(q); } catch {}
        }
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch {}
  }

  eventsFor(bookingId: number): ObservedEvent[] {
    return this.events.filter(
      (e) => e.payload?.bookingId === bookingId,
    );
  }

  countEvent(eventType: string, bookingId: number): number {
    return this.events.filter(
      (e) => e.eventType === eventType && e.payload?.bookingId === bookingId,
    ).length;
  }

  allEvents(): ObservedEvent[] {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }
}

export const observer = new EventObserver();
