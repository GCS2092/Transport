import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientInboxMessage, InboxMessageType } from './entities/client-inbox-message.entity';
import { Reservation } from './entities/reservation.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InboxService {
  constructor(
    @InjectRepository(ClientInboxMessage)
    private inboxRepository: Repository<ClientInboxMessage>,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    private notificationsService: NotificationsService,
  ) {}

  async createMessage(params: {
    reservationId: string;
    clientEmail: string;
    message: string;
    messageType?: InboxMessageType;
    quotedAmount?: number | null;
    isFromAdmin?: boolean;
  }): Promise<ClientInboxMessage> {
    const msg = this.inboxRepository.create({
      reservationId: params.reservationId,
      clientEmail: params.clientEmail.trim().toLowerCase(),
      message: params.message,
      messageType: params.messageType ?? InboxMessageType.SYSTEM,
      quotedAmount: params.quotedAmount ?? null,
      isFromAdmin: params.isFromAdmin ?? false,
    });
    return this.inboxRepository.save(msg);
  }

  async getMessagesForReservation(code: string, email: string): Promise<ClientInboxMessage[]> {
    const reservation = await this.reservationsRepository.findOne({ where: { code } });
    if (!reservation) throw new NotFoundException('Reservation not found');

    const normalizedEmail = email.trim().toLowerCase();
    if (reservation.clientEmail.trim().toLowerCase() !== normalizedEmail) {
      throw new ForbiddenException('Email does not match this reservation');
    }

    return this.inboxRepository.find({
      where: { reservationId: reservation.id },
      order: { createdAt: 'ASC' },
    });
  }

  async sendPriceQuote(
    reservationId: string,
    amount: number,
    message?: string,
  ): Promise<{ reservation: Reservation; inboxMessage: ClientInboxMessage }> {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId },
      relations: ['pickupZone', 'dropoffZone', 'driver'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    await this.reservationsRepository.update(reservationId, {
      amount,
      pricePending: false,
    });

    const defaultMessage =
      reservation.language === 'en'
        ? `Your trip price has been set: ${amount.toLocaleString('fr-FR')} FCFA. You can proceed with payment from the tracking page.`
        : `Le tarif de votre course a été fixé : ${amount.toLocaleString('fr-FR')} FCFA. Vous pouvez procéder au paiement depuis la page Suivi.`;

    const inboxMessage = await this.createMessage({
      reservationId,
      clientEmail: reservation.clientEmail,
      message: message?.trim() || defaultMessage,
      messageType: InboxMessageType.PRICE_QUOTE,
      quotedAmount: amount,
      isFromAdmin: true,
    });

    const updated = await this.reservationsRepository.findOne({
      where: { id: reservationId },
      relations: ['pickupZone', 'dropoffZone', 'driver'],
    });

    setImmediate(async () => {
      try {
        await this.notificationsService.sendPriceQuoteToClient(updated!, amount);
      } catch {}
    });

    return { reservation: updated!, inboxMessage };
  }
}
