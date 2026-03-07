import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resend } from 'resend';
import { EmailLog } from './entities/email-log.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { Language } from '../../common/enums/language.enum';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend;

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  private buildWhatsAppLink(reservation: Reservation): string {
    const number = process.env.WHATSAPP_SUPPORT_NUMBER || '221XXXXXXXXX';
    const lang = reservation.language;
    const msg =
      lang === Language.EN
        ? `Hello! My booking ${reservation.code} is confirmed for ${reservation.amount} FCFA`
        : `Bonjour ! Ma réservation ${reservation.code} est confirmée pour ${reservation.amount} FCFA`;
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  }

  private t(lang: Language, fr: string, en: string): string {
    return lang === Language.EN ? en : fr;
  }

  private buildEmailHtml(reservation: Reservation, title: string, body: string, whatsappLink?: string): string {
    const waButton = whatsappLink
      ? `<a href="${whatsappLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#25D366;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
           ${this.t(reservation.language, 'Recevoir sur WhatsApp', 'Get on WhatsApp')}
         </a>`
      : '';

    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1a1a2e;color:#fff;padding:24px 32px;">
      <h1 style="margin:0;font-size:22px;">WEND'D Transport</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1a1a2e;margin-top:0;">${title}</h2>
      ${body}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="font-size:12px;color:#999;">
        ${this.t(reservation.language,
          'Code réservation : <strong>' + reservation.code + '</strong>',
          'Booking code: <strong>' + reservation.code + '</strong>'
        )}
      </p>
      ${waButton}
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">WEND'D Transport — Dakar, Sénégal</p>
    </div>
  </div>
</body>
</html>`;
  }

  async sendReservationConfirmed(reservation: Reservation): Promise<void> {
    const lang = reservation.language;
    const waLink = this.buildWhatsAppLink(reservation);

    const title = this.t(lang, 'Réservation confirmée', 'Booking Confirmed');
    const body = `
      <p>${this.t(lang, `Bonjour <strong>${reservation.clientFirstName}</strong>,`, `Hello <strong>${reservation.clientFirstName}</strong>,`)}</p>
      <p>${this.t(lang, 'Votre réservation a bien été enregistrée.', 'Your booking has been recorded.')}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Code', 'Code')}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Date', 'Date')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${new Date(reservation.pickupDateTime).toLocaleString(lang === Language.EN ? 'en-GB' : 'fr-FR')}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Départ', 'From')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.pickupZone?.name}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Destination', 'To')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.dropoffZone?.name}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">${this.t(lang, 'Montant', 'Amount')}</td><td style="padding:8px;font-weight:bold;color:#1a1a2e;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>
      ${reservation.cancelToken ? `
      <div style="margin:20px 0;padding:16px;background:#fff8e1;border:2px dashed #f59e0b;border-radius:8px;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;color:#92400e;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">
          ${this.t(lang, "Code d'annulation", 'Cancellation Code')}
        </p>
        <p style="margin:0 0 8px;font-size:28px;font-family:monospace;font-weight:bold;color:#1a1a2e;letter-spacing:6px;">
          ${reservation.cancelToken}
        </p>
        <p style="margin:0;font-size:11px;color:#78350f;">
          ${this.t(lang, 'Conservez ce code pour annuler votre réservation depuis la page Suivi.', 'Keep this code to cancel your booking from the Tracking page.')}
        </p>
      </div>` : ''}
      <p style="margin-top:16px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/suivi?code=${reservation.code}"
           style="display:inline-block;padding:10px 20px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
          ${this.t(lang, 'Suivre ma réservation', 'Track my booking')}
        </a>
      </p>`;

    await this.sendEmail(
      reservation.clientEmail,
      `${title} — #${reservation.code}`,
      this.buildEmailHtml(reservation, title, body, waLink),
      NotificationType.RESERVATION_CONFIRMED,
      reservation.id,
    );
  }

  async sendDriverAssigned(reservation: Reservation): Promise<void> {
    const lang = reservation.language;
    const waLink = this.buildWhatsAppLink(reservation);
    const driver = reservation.driver;

    const title = this.t(lang, 'Chauffeur assigné', 'Driver Assigned');
    const body = `
      <p>${this.t(lang, `Bonjour <strong>${reservation.clientFirstName}</strong>,`, `Hello <strong>${reservation.clientFirstName}</strong>,`)}</p>
      <p>${this.t(lang, 'Votre chauffeur a été assigné.', 'Your driver has been assigned.')}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Chauffeur', 'Driver')}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${driver?.firstName} ${driver?.lastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Téléphone', 'Phone')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${driver?.phone}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Véhicule', 'Vehicle')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${driver?.vehicleType}</td></tr>
        <tr><td style="padding:8px;color:#666;">${this.t(lang, 'Heure de prise en charge', 'Pickup time')}</td><td style="padding:8px;">${new Date(reservation.pickupDateTime).toLocaleString(lang === Language.EN ? 'en-GB' : 'fr-FR')}</td></tr>
      </table>
      <p><strong>${this.t(lang, 'Montant confirmé :', 'Confirmed amount:')} ${Number(reservation.amount).toLocaleString()} FCFA</strong></p>`;

    await this.sendEmail(
      reservation.clientEmail,
      `${title} — #${reservation.code}`,
      this.buildEmailHtml(reservation, title, body, waLink),
      NotificationType.DRIVER_ASSIGNED,
      reservation.id,
    );
  }

  async sendReminderJ1(reservation: Reservation): Promise<void> {
    const lang = reservation.language;
    const waLink = this.buildWhatsAppLink(reservation);

    const title = this.t(lang, 'Rappel — Votre course est demain', 'Reminder — Your ride is tomorrow');
    const body = `
      <p>${this.t(lang, `Bonjour <strong>${reservation.clientFirstName}</strong>,`, `Hello <strong>${reservation.clientFirstName}</strong>,`)}</p>
      <p>${this.t(lang, 'Votre course est prévue demain.', 'Your ride is scheduled for tomorrow.')}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Date & Heure', 'Date & Time')}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString(lang === Language.EN ? 'en-GB' : 'fr-FR')}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Chauffeur', 'Driver')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.driver ? `${reservation.driver.firstName} ${reservation.driver.lastName}` : this.t(lang, 'À confirmer', 'To be confirmed')}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">${this.t(lang, 'Montant', 'Amount')}</td><td style="padding:8px;font-weight:bold;color:#1a1a2e;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>`;

    await this.sendEmail(
      reservation.clientEmail,
      `${title} — #${reservation.code}`,
      this.buildEmailHtml(reservation, title, body, waLink),
      NotificationType.REMINDER_J1,
      reservation.id,
    );
  }

  async sendReservationCancelled(reservation: Reservation): Promise<void> {
    const lang = reservation.language;

    const title = this.t(lang, 'Réservation annulée', 'Booking Cancelled');
    const body = `
      <p>${this.t(lang, `Bonjour <strong>${reservation.clientFirstName}</strong>,`, `Hello <strong>${reservation.clientFirstName}</strong>,`)}</p>
      <p>${this.t(lang, `Votre réservation <strong>${reservation.code}</strong> a été annulée.`, `Your booking <strong>${reservation.code}</strong> has been cancelled.`)}</p>
      <p>${this.t(lang, 'Si vous pensez qu\'il s\'agit d\'une erreur, contactez-nous.', 'If you believe this is an error, please contact us.')}</p>`;

    await this.sendEmail(
      reservation.clientEmail,
      `${title} — #${reservation.code}`,
      this.buildEmailHtml(reservation, title, body),
      NotificationType.RESERVATION_CANCELLED,
      reservation.id,
    );
  }

  async sendDriverNewRide(reservation: Reservation): Promise<void> {
    if (!reservation.driver?.email) return;

    const title = 'Nouvelle course assignée';
    const body = `
      <p>Bonjour <strong>${reservation.driver.firstName}</strong>,</p>
      <p>Une nouvelle course vous a été assignée.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Tél. client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientPhone}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Départ</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.pickupZone?.name}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Destination</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.dropoffZone?.name}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Date & Heure</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">Montant</td><td style="padding:8px;font-weight:bold;color:#1a1a2e;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>
      ${reservation.notes ? `<p><em>Note client :</em> ${reservation.notes}</p>` : ''}
      <p style="font-size:12px;background:#fffbe6;padding:8px;border-radius:4px;">Langue client : <strong>${reservation.language === Language.EN ? '🇬🇧 EN' : '🇫🇷 FR'}</strong></p>`;

    await this.sendEmail(
      reservation.driver.email,
      `${title} — #${reservation.code}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`,
      NotificationType.DRIVER_NEW_RIDE,
      reservation.id,
    );
  }

  async sendDriverCancelled(reservation: Reservation): Promise<void> {
    if (!reservation.driver?.email) return;

    const title = 'Course annulée';
    const body = `
      <p>Bonjour <strong>${reservation.driver.firstName}</strong>,</p>
      <p>La course <strong>#${reservation.code}</strong> qui vous était assignée a été annulée.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Date prévue</td><td style="padding:8px;border-bottom:1px solid #eee;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
        <tr><td style="padding:8px;color:#666;">Départ</td><td style="padding:8px;">${reservation.pickupZone?.name} → ${reservation.dropoffZone?.name}</td></tr>
      </table>
      <p style="color:#888;font-size:13px;">Vous êtes à nouveau disponible pour d'autres courses.</p>`;

    await this.sendEmail(
      reservation.driver.email,
      `${title} — #${reservation.code}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`,
      NotificationType.RESERVATION_CANCELLED,
      reservation.id,
    );
  }

  async sendRideStarted(reservation: Reservation): Promise<void> {
    const lang = reservation.language;
    const title = this.t(lang, 'Votre course a démarré', 'Your ride has started');
    const body = `
      <p>${this.t(lang, 'Bonjour', 'Hello')} <strong>${reservation.clientFirstName}</strong>,</p>
      <p>${this.t(lang, 'Votre chauffeur a démarré la course.', 'Your driver has started the ride.')}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Code', 'Code')}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Chauffeur', 'Driver')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.driver?.firstName} ${reservation.driver?.lastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Véhicule', 'Vehicle')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.driver?.vehicleType} - ${reservation.driver?.vehiclePlate}</td></tr>
        <tr><td style="padding:8px;color:#666;">${this.t(lang, 'Trajet', 'Route')}</td><td style="padding:8px;">${reservation.pickupZone?.name} → ${reservation.dropoffZone?.name}</td></tr>
      </table>
      <p style="font-size:13px;color:#888;">${this.t(lang, 'Bon voyage !', 'Have a safe trip!')}</p>`;

    await this.sendEmail(
      reservation.clientEmail,
      `${title} — #${reservation.code}`,
      this.buildEmailHtml(reservation, title, body),
      NotificationType.RIDE_STARTED,
      reservation.id,
    );
  }

  async sendRideCompleted(reservation: Reservation, pdfBuffer?: Buffer): Promise<void> {
    const lang = reservation.language;
    const title = this.t(lang, 'Course terminée', 'Ride completed');
    const body = `
      <p>${this.t(lang, 'Bonjour', 'Hello')} <strong>${reservation.clientFirstName}</strong>,</p>
      <p>${this.t(lang, 'Votre course est terminée. Merci d\'avoir utilisé nos services !', 'Your ride is completed. Thank you for using our services!')}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Code', 'Code')}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Trajet', 'Route')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.pickupZone?.name} → ${reservation.dropoffZone?.name}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">${this.t(lang, 'Montant', 'Amount')}</td><td style="padding:8px;font-weight:bold;color:#1a1a2e;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>
      <p style="font-size:13px;color:#888;">${this.t(lang, 'À bientôt pour une prochaine course !', 'See you soon for your next ride!')}</p>`;

    // Resend accepte les pièces jointes en base64
    const attachments = pdfBuffer ? [{
      filename: `recu-${reservation.code}.pdf`,
      content: pdfBuffer.toString('base64'),
    }] : [];

    await this.sendEmail(
      reservation.clientEmail,
      `${title} — #${reservation.code}`,
      this.buildEmailHtml(reservation, title, body),
      NotificationType.RIDE_COMPLETED,
      reservation.id,
      attachments,
    );
  }

  async sendDriverReminderJ1(reservation: Reservation): Promise<void> {
    if (!reservation.driver?.email) return;

    const title = 'Rappel — Course demain';
    const body = `
      <p>Bonjour <strong>${reservation.driver.firstName}</strong>,</p>
      <p>Rappel : vous avez une course assignée <strong>demain</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Tél. client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientPhone}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Date & Heure</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Trajet</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.pickupZone?.name} → ${reservation.dropoffZone?.name}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">Montant</td><td style="padding:8px;font-weight:bold;color:#1a1a2e;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>
      ${reservation.notes ? `<p><em>Note client :</em> ${reservation.notes}</p>` : ''}`;

    await this.sendEmail(
      reservation.driver.email,
      `${title} — #${reservation.code}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`,
      NotificationType.REMINDER_J1,
      reservation.id,
    );
  }

  // ─── Méthode privée — seule partie modifiée ────────────────────────────────
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    type: NotificationType,
    reservationId: string,
    attachments: { filename: string; content: string }[] = [],
    attempt = 1,
  ): Promise<void> {
    const log = this.emailLogRepository.create({
      recipient: to,
      notificationType: type,
      reservationId,
      attempts: attempt,
    });

    try {
      await this.resend.emails.send({
        from: `${process.env.MAIL_FROM_NAME || "WEND'D Transport"} <${process.env.MAIL_FROM}>`,
        to,
        subject,
        html,
        attachments,
      });

      log.status = 'ENVOYE';
      await this.emailLogRepository.save(log);
      this.logger.log(`Email sent [${type}] to ${to}`);
    } catch (error) {
      log.status = 'ECHEC';
      log.errorMessage = error?.message;
      await this.emailLogRepository.save(log);
      this.logger.error(`Email failed [${type}] to ${to} (attempt ${attempt}): ${error?.message}`);

      if (attempt < 3) {
        const delay = attempt * 2000;
        setTimeout(
          () => this.sendEmail(to, subject, html, type, reservationId, attachments, attempt + 1),
          delay,
        );
      }
    }
  }
}