import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resend } from 'resend';
import { createTransport, Transporter } from 'nodemailer';
import { EmailLog } from './entities/email-log.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { Language } from '../../common/enums/language.enum';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend;
  private gmailTransporter: Transporter | null = null;

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  private getReplyTo(): string {
    return process.env.REPLY_TO_EMAIL || 'wenddtransport@gmail.com';
  }

  private getFromResend(): string {
    const name = process.env.MAIL_FROM_NAME || "WEND'D Transport";
    const email = process.env.MAIL_FROM || 'noreply@wenddtransport.com';
    return `${name} <${email}>`;
  }

  private getGmailTransporter(): Transporter {
    if (!this.gmailTransporter) {
      this.gmailTransporter = createTransport({
        host: process.env.GMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.GMAIL_PORT || '587', 10),
        secure: false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
    }
    return this.gmailTransporter;
  }

  private async sendWithGmail(
    to: string,
    subject: string,
    html: string,
    attachments: { filename: string; content: string }[] = [],
  ): Promise<void> {
    const transporter = this.getGmailTransporter();
    await transporter.sendMail({
      from: `WEND'D Transport <${process.env.GMAIL_USER || 'wenddtransport@gmail.com'}>`,
      to,
      subject,
      html,
      replyTo: this.getReplyTo(),
      attachments: attachments.map(a => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64'),
      })),
    });
  }

  private getOneSignalAppId(): string | undefined {
    return process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  }

  private getOneSignalRestApiKey(): string | undefined {
    return process.env.ONESIGNAL_REST_API_KEY;
  }

  // ✅ CORRECTION : utilise toujours l'email comme external ID (jamais userId)
  private normalizeExternalId(email?: string | null): string | null {
    if (!email) return null;
    return email.trim().toLowerCase();
  }

  private async sendPushNotification(
    externalUserIds: string[],
    title: string,
    message: string,
    data: Record<string, string> = {},
  ): Promise<void> {
    const appId = this.getOneSignalAppId();
    const restApiKey = this.getOneSignalRestApiKey();
    if (!appId || !restApiKey) {
      this.logger.warn('OneSignal: missing appId or restApiKey, skipping push');
      return;
    }
    const ids = externalUserIds.filter(Boolean);
    if (!ids.length) {
      this.logger.warn('OneSignal: no valid externalUserIds, skipping push');
      return;
    }

    try {
      const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${restApiKey}`,
        },
        body: JSON.stringify({
          app_id: appId,
          include_external_user_ids: ids,
          channel_for_external_user_ids: 'push',
          headings: { fr: title, en: title },
          contents: { fr: message, en: message },
          data,
        }),
      });
      const responseData = await res.json();
      if (!res.ok) {
        this.logger.warn(`OneSignal push failed (${res.status}): ${JSON.stringify(responseData)}`);
      } else {
        this.logger.log(`OneSignal push sent to [${ids.join(', ')}] — id: ${responseData?.id}`);
      }
    } catch (e) {
      this.logger.warn(`OneSignal push error: ${e?.message}`);
    }
  }

  async hasSent(reservationId: string, type: NotificationType): Promise<boolean> {
    const existing = await this.emailLogRepository.findOne({
      where: { reservationId, notificationType: type, status: 'ENVOYE' },
    });
    return !!existing;
  }

  async sendAdminArchiveReport(
    adminEmails: string[],
    subject: string,
    html: string,
    filename: string,
    xlsxBuffer: Buffer,
  ): Promise<void> {
    if (!adminEmails.length) return;
    const attachment = {
      filename,
      content: xlsxBuffer.toString('base64'),
    };

    for (const email of adminEmails) {
      await this.sendEmail(
        email,
        subject,
        html,
        NotificationType.ADMIN_ARCHIVE,
        'archive',
        [attachment],
      );
    }

    await this.sendPushNotification(
      adminEmails.map(e => this.normalizeExternalId(e)).filter(Boolean),
      'Archivage terminé',
      "Un fichier Excel d'archivage a été généré et envoyé par email.",
      {},
    );
  }

  private getPickupAddress(reservation: Reservation): string {
    return reservation.pickupCustomAddress || reservation.pickupZone?.name || 'Adresse de départ';
  }

  private getDropoffAddress(reservation: Reservation): string {
    return reservation.dropoffCustomAddress || reservation.dropoffZone?.name || "Adresse d'arrivée";
  }

  private buildWhatsAppLink(reservation: Reservation): string {
    const number = process.env.WHATSAPP_SUPPORT_NUMBER || '221XXXXXXXXX';
    const lang = reservation.language;
    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);
    const msg =
      lang === Language.EN
        ? `Hello! My booking ${reservation.code} is confirmed for ${reservation.amount} FCFA. From: ${pickup} To: ${dropoff}`
        : `Bonjour ! Ma réservation ${reservation.code} est confirmée pour ${reservation.amount} FCFA. Départ: ${pickup} → Destination: ${dropoff}`;
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

    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);

    const title = this.t(lang, 'Réservation confirmée', 'Booking Confirmed');
    const body = `
      <p>${this.t(lang, `Bonjour <strong>${reservation.clientFirstName}</strong>,`, `Hello <strong>${reservation.clientFirstName}</strong>,`)}</p>
      <p>${this.t(lang, 'Votre réservation a bien été enregistrée.', 'Your booking has been recorded.')}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Code', 'Code')}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Date', 'Date')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${new Date(reservation.pickupDateTime).toLocaleString(lang === Language.EN ? 'en-GB' : 'fr-FR')}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Départ', 'From')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Destination', 'To')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${dropoff}</td></tr>
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

    // ✅ Push client — confirmation réservation
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.clientEmail)].filter(Boolean),
      this.t(lang, 'Réservation confirmée', 'Booking confirmed'),
      this.t(
        lang,
        `Votre réservation ${reservation.code} est confirmée.`,
        `Your booking ${reservation.code} is confirmed.`,
      ),
      { reservationCode: reservation.code },
    );
  }

  async sendCancelTokenReminder(reservation: Reservation): Promise<void> {
    const lang = reservation.language;

    const title = this.t(lang, "Votre code d'annulation", 'Your cancellation code');
    const body = `
      <p>${this.t(lang, `Bonjour <strong>${reservation.clientFirstName}</strong>,`, `Hello <strong>${reservation.clientFirstName}</strong>,`)}</p>
      <p>${this.t(lang, "Voici votre code d'annulation pour la réservation ci-dessous.", 'Here is your cancellation code for the booking below.')}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Code réservation', 'Booking code')}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Date', 'Date')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${new Date(reservation.pickupDateTime).toLocaleString(lang === Language.EN ? 'en-GB' : 'fr-FR')}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Départ', 'From')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${this.getPickupAddress(reservation)}</td></tr>
        <tr><td style="padding:8px;color:#666;">${this.t(lang, 'Destination', 'To')}</td><td style="padding:8px;">${this.getDropoffAddress(reservation)}</td></tr>
      </table>
      <div style="margin:20px 0;padding:16px;background:#fff8e1;border:2px dashed #f59e0b;border-radius:8px;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;color:#92400e;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">
          ${this.t(lang, "Code d'annulation", 'Cancellation Code')}
        </p>
        <p style="margin:0 0 8px;font-size:28px;font-family:monospace;font-weight:bold;color:#1a1a2e;letter-spacing:6px;">
          ${reservation.cancelToken}
        </p>
        <p style="margin:0;font-size:11px;color:#78350f;">
          ${this.t(lang, 'Utilisez ce code sur la page Suivi pour annuler votre réservation.', 'Use this code on the Tracking page to cancel your booking.')}
        </p>
      </div>
      <p style="margin-top:16px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/suivi?code=${reservation.code}"
           style="display:inline-block;padding:10px 20px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
          ${this.t(lang, 'Aller sur la page Suivi', 'Go to Tracking page')}
        </a>
      </p>`;

    await this.sendEmail(
      reservation.clientEmail,
      `${title} — #${reservation.code}`,
      this.buildEmailHtml(reservation, title, body),
      NotificationType.CANCEL_TOKEN_REMINDER,
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

    // ✅ Push client — chauffeur assigné
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.clientEmail)].filter(Boolean),
      this.t(lang, 'Chauffeur assigné', 'Driver assigned'),
      this.t(
        lang,
        `Un chauffeur est assigné à la réservation ${reservation.code}.`,
        `A driver is assigned to booking ${reservation.code}.`,
      ),
      { reservationCode: reservation.code },
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

    // ✅ Push client — rappel J-1
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.clientEmail)].filter(Boolean),
      title,
      this.t(
        lang,
        `Rappel : votre course ${reservation.code} est demain.`,
        `Reminder: your ride ${reservation.code} is tomorrow.`,
      ),
      { reservationCode: reservation.code },
    );
  }

  async sendReminderH1(reservation: Reservation): Promise<void> {
    const lang = reservation.language;
    const title = this.t(lang, 'Rappel — Votre course dans 1 heure', 'Reminder — Your ride in 1 hour');
    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);

    const body = `
      <p>${this.t(lang, `Bonjour <strong>${reservation.clientFirstName}</strong>,`, `Hello <strong>${reservation.clientFirstName}</strong>,`)}</p>
      <p>${this.t(lang, 'Petit rappel : votre course commence dans environ 1 heure.', 'Quick reminder: your ride starts in about 1 hour.')}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Code', 'Code')}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Départ', 'From')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Destination', 'To')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${dropoff}</td></tr>
        <tr><td style="padding:8px;color:#666;">${this.t(lang, 'Heure', 'Time')}</td><td style="padding:8px;">${new Date(reservation.pickupDateTime).toLocaleString(lang === Language.EN ? 'en-GB' : 'fr-FR')}</td></tr>
      </table>`;

    await this.sendEmail(
      reservation.clientEmail,
      `${title} — #${reservation.code}`,
      this.buildEmailHtml(reservation, title, body),
      NotificationType.REMINDER_H1,
      reservation.id,
    );

    // ✅ Push client — rappel H-1
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.clientEmail)].filter(Boolean),
      title,
      this.t(
        lang,
        `Rappel : votre course ${reservation.code} commence dans 1 heure.`,
        `Reminder: your ride ${reservation.code} starts in 1 hour.`,
      ),
      { reservationCode: reservation.code },
    );
  }

  async sendReservationCancelled(reservation: Reservation): Promise<void> {
    const lang = reservation.language;

    const title = this.t(lang, 'Réservation annulée', 'Booking Cancelled');
    const body = `
      <p>${this.t(lang, `Bonjour <strong>${reservation.clientFirstName}</strong>,`, `Hello <strong>${reservation.clientFirstName}</strong>,`)}</p>
      <p>${this.t(lang, `Votre réservation <strong>${reservation.code}</strong> a été annulée.`, `Your booking <strong>${reservation.code}</strong> has been cancelled.`)}</p>
      <p>${this.t(lang, "Si vous pensez qu'il s'agit d'une erreur, contactez-nous.", 'If you believe this is an error, please contact us.')}</p>`;

    await this.sendEmail(
      reservation.clientEmail,
      `${title} — #${reservation.code}`,
      this.buildEmailHtml(reservation, title, body),
      NotificationType.RESERVATION_CANCELLED,
      reservation.id,
    );

    // ✅ Push client — annulation
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.clientEmail)].filter(Boolean),
      title,
      this.t(
        lang,
        `Votre réservation ${reservation.code} a été annulée.`,
        `Your booking ${reservation.code} has been cancelled.`,
      ),
      { reservationCode: reservation.code },
    );
  }

  async sendDriverNewRide(reservation: Reservation): Promise<void> {
    if (!reservation.driver?.email) return;

    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);

    const title = 'Nouvelle course assignée';
    const body = `
      <p>Bonjour <strong>${reservation.driver.firstName}</strong>,</p>
      <p>Une nouvelle course vous a été assignée.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Tél. client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientPhone}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Départ</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Destination</td><td style="padding:8px;border-bottom:1px solid #eee;">${dropoff}</td></tr>
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

    // ✅ CORRECTION : utilise driver.email (jamais driver.userId)
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.driver.email)].filter(Boolean),
      'Nouvelle course assignée',
      `Course ${reservation.code} — ${pickup} → ${dropoff}`,
      { reservationCode: reservation.code },
    );
  }

  async sendDriverCancelled(reservation: Reservation): Promise<void> {
    if (!reservation.driver?.email) return;

    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);

    const title = 'Course annulée';
    const body = `
      <p>Bonjour <strong>${reservation.driver.firstName}</strong>,</p>
      <p>La course <strong>#${reservation.code}</strong> qui vous était assignée a été annulée.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Date prévue</td><td style="padding:8px;border-bottom:1px solid #eee;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
        <tr><td style="padding:8px;color:#666;">Départ</td><td style="padding:8px;">${pickup} → ${dropoff}</td></tr>
      </table>
      <p style="color:#888;font-size:13px;">Vous êtes à nouveau disponible pour d'autres courses.</p>`;

    await this.sendEmail(
      reservation.driver.email,
      `${title} — #${reservation.code}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`,
      NotificationType.DRIVER_RIDE_CANCELLED,
      reservation.id,
    );

    // ✅ CORRECTION : utilise driver.email (jamais driver.userId)
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.driver.email)].filter(Boolean),
      title,
      `Course #${reservation.code} annulée.`,
      { reservationCode: reservation.code },
    );
  }

  async sendDriverRideModified(reservation: Reservation): Promise<void> {
    if (!reservation.driver?.email) return;
    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);
    const title = 'Course modifiée';
    const body = `
      <p>Bonjour <strong>${reservation.driver.firstName}</strong>,</p>
      <p>La course <strong>#${reservation.code}</strong> a été modifiée.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Départ</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Destination</td><td style="padding:8px;border-bottom:1px solid #eee;">${dropoff}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Date & Heure</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
      </table>`;

    await this.sendEmail(
      reservation.driver.email,
      `${title} — #${reservation.code}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`,
      NotificationType.DRIVER_RIDE_MODIFIED,
      reservation.id,
    );

    // ✅ CORRECTION : utilise driver.email (jamais driver.userId)
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.driver.email)].filter(Boolean),
      title,
      `La course ${reservation.code} a été modifiée. Ouvrez l'app pour voir les détails.`,
      { reservationCode: reservation.code },
    );
  }

  async sendRideStarted(reservation: Reservation): Promise<void> {
    const lang = reservation.language;
    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);
    const title = this.t(lang, 'Votre course a démarré', 'Your ride has started');
    const body = `
      <p>${this.t(lang, 'Bonjour', 'Hello')} <strong>${reservation.clientFirstName}</strong>,</p>
      <p>${this.t(lang, 'Votre chauffeur a démarré la course.', 'Your driver has started the ride.')}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Code', 'Code')}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Chauffeur', 'Driver')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.driver?.firstName} ${reservation.driver?.lastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Véhicule', 'Vehicle')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.driver?.vehicleType} - ${reservation.driver?.vehiclePlate}</td></tr>
        <tr><td style="padding:8px;color:#666;">${this.t(lang, 'Trajet', 'Route')}</td><td style="padding:8px;">${pickup} → ${dropoff}</td></tr>
      </table>
      <p style="font-size:13px;color:#888;">${this.t(lang, 'Bon voyage !', 'Have a safe trip!')}</p>`;

    await this.sendEmail(
      reservation.clientEmail,
      `${title} — #${reservation.code}`,
      this.buildEmailHtml(reservation, title, body),
      NotificationType.RIDE_STARTED,
      reservation.id,
    );

    // ✅ Push client — course démarrée
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.clientEmail)].filter(Boolean),
      title,
      this.t(
        lang,
        `Votre chauffeur a démarré la course ${reservation.code}.`,
        `Your driver started ride ${reservation.code}.`,
      ),
      { reservationCode: reservation.code },
    );
  }

  async sendRideCompleted(reservation: Reservation, pdfBuffer?: Buffer): Promise<void> {
    const lang = reservation.language;
    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);
    const title = this.t(lang, 'Course terminée', 'Ride completed');
    const body = `
      <p>${this.t(lang, 'Bonjour', 'Hello')} <strong>${reservation.clientFirstName}</strong>,</p>
      <p>${this.t(lang, "Votre course est terminée. Merci d'avoir utilisé nos services !", 'Your ride is completed. Thank you for using our services!')}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Code', 'Code')}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${this.t(lang, 'Trajet', 'Route')}</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup} → ${dropoff}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">${this.t(lang, 'Montant', 'Amount')}</td><td style="padding:8px;font-weight:bold;color:#1a1a2e;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>
      <p style="font-size:13px;color:#888;">${this.t(lang, 'À bientôt pour une prochaine course !', 'See you soon for your next ride!')}</p>`;

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

    // ✅ Push client — course terminée + reçu
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.clientEmail)].filter(Boolean),
      this.t(lang, 'Reçu disponible', 'Receipt available'),
      this.t(
        lang,
        `Votre reçu pour la réservation ${reservation.code} est disponible.`,
        `Your receipt for booking ${reservation.code} is available.`,
      ),
      { reservationCode: reservation.code },
    );
  }

  async sendDriverReminderJ1(reservation: Reservation): Promise<void> {
    if (!reservation.driver?.email) return;

    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);

    const title = 'Rappel — Course demain';
    const body = `
      <p>Bonjour <strong>${reservation.driver.firstName}</strong>,</p>
      <p>Rappel : vous avez une course assignée <strong>demain</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Tél. client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientPhone}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Date & Heure</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Trajet</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup} → ${dropoff}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">Montant</td><td style="padding:8px;font-weight:bold;color:#1a1a2e;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>
      ${reservation.notes ? `<p><em>Note client :</em> ${reservation.notes}</p>` : ''}`;

    await this.sendEmail(
      reservation.driver.email,
      `${title} — #${reservation.code}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`,
      NotificationType.DRIVER_REMINDER_J1,
      reservation.id,
    );

    // ✅ Push chauffeur — rappel J-1
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.driver.email)].filter(Boolean),
      title,
      `Rappel : vous avez la course ${reservation.code} demain — ${pickup} → ${dropoff}`,
      { reservationCode: reservation.code },
    );
  }

  // ─── Notifications Admin ─────────────────────────────────────────────────

  async sendAdminNewReservation(reservation: Reservation, adminEmails: string[]): Promise<void> {
    if (!adminEmails.length) return;

    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);

    const title = '📢 Nouvelle réservation';
    const body = `
      <p>Une nouvelle réservation vient d'être créée.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Téléphone</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientPhone}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientEmail}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Trajet</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup} → ${dropoff}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Date & Heure</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Type</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.tripType}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">Montant</td><td style="padding:8px;font-weight:bold;color:#1a1a2e;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>
      <p style="font-size:12px;color:#888;">Connectez-vous au tableau de bord admin pour assigner un chauffeur.</p>`;

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`;

    for (const email of adminEmails) {
      await this.sendEmail(
        email,
        `${title} — #${reservation.code}`,
        html,
        NotificationType.ADMIN_NEW_RESERVATION,
        reservation.id,
      );
    }

    // ✅ Push admin — nouvelle réservation
    await this.sendPushNotification(
      adminEmails.map(e => this.normalizeExternalId(e)).filter(Boolean),
      title,
      `Nouvelle réservation ${reservation.code} — ${reservation.clientFirstName} ${reservation.clientLastName}`,
      { reservationCode: reservation.code },
    );
  }

  async sendAdminDriverAssigned(reservation: Reservation, adminEmails: string[]): Promise<void> {
    if (!adminEmails.length || !reservation.driver) return;

    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);

    const title = '🚗 Chauffeur assigné';
    const body = `
      <p>Un chauffeur a été assigné à la course <strong>#${reservation.code}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Chauffeur</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.driver.firstName} ${reservation.driver.lastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Tél. chauffeur</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.driver.phone || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Trajet</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup} → ${dropoff}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Date & Heure</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">Montant</td><td style="padding:8px;font-weight:bold;color:#1a1a2e;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>`;

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`;

    for (const email of adminEmails) {
      await this.sendEmail(
        email,
        `${title} — #${reservation.code}`,
        html,
        NotificationType.ADMIN_DRIVER_ASSIGNED,
        reservation.id,
      );
    }

    // ✅ AJOUT : Push admin — chauffeur assigné (manquait)
    await this.sendPushNotification(
      adminEmails.map(e => this.normalizeExternalId(e)).filter(Boolean),
      title,
      `${reservation.driver.firstName} ${reservation.driver.lastName} assigné à la course ${reservation.code}`,
      { reservationCode: reservation.code },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DRIVER PROPOSAL SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════

  async sendDriverProposal(proposal: any, reservation: Reservation): Promise<void> {
    if (!proposal.driver?.email) return;

    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);
    const frontendUrl = process.env.FRONTEND_URL || 'https://transport-six-xi.vercel.app';

    const acceptUrl = `${frontendUrl}/api/reservations/proposals/accept/${proposal.token}`;
    const declineUrl = `${frontendUrl}/api/reservations/proposals/decline/${proposal.token}`;

    const title = '🚗 Nouvelle proposition de course';
    const body = `
      <p>Bonjour <strong>${proposal.driver.firstName}</strong>,</p>
      <p>Une nouvelle course vous est proposée. Vous avez <strong>10 minutes</strong> pour répondre.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;border:2px solid #16a34a;border-radius:8px;">
        <tr style="background:#f0fdf4;"><td colspan="2" style="padding:12px;font-weight:bold;color:#166534;">📋 Détails de la course</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Téléphone client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientPhone}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Départ</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Destination</td><td style="padding:8px;border-bottom:1px solid #eee;">${dropoff}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Date & Heure</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Distance depuis vous</td><td style="padding:8px;border-bottom:1px solid #eee;">${proposal.distance.toFixed(1)} km</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">💰 Montant</td><td style="padding:8px;font-weight:bold;color:#16a34a;font-size:18px;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>
      ${reservation.notes ? `<p style="background:#fefce8;padding:8px;border-radius:4px;border-left:4px solid #eab308;"><strong>Note client :</strong> ${reservation.notes}</p>` : ''}
      <div style="margin:24px 0;text-align:center;">
        <p style="margin-bottom:16px;font-weight:bold;">Que souhaitez-vous faire ?</p>
        <a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;background:#16a34a;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin-right:12px;">✅ CONFIRMER la course</a>
        <a href="${declineUrl}" style="display:inline-block;padding:14px 28px;background:#ef4444;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">❌ DÉCLINER</a>
      </div>
      <p style="font-size:12px;color:#888;text-align:center;">
        ⏰ Ce lien expire le ${new Date(proposal.expiresAt).toLocaleString('fr-FR')}<br>
        En confirmant, vous serez immédiatement assigné à cette course.
      </p>`;

    await this.sendEmail(
      proposal.driver.email,
      `${title} — ${reservation.code} (10min pour répondre)`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`,
      NotificationType.DRIVER_NEW_RIDE,
      reservation.id,
    );

    // ✅ Push chauffeur — nouvelle proposition
    await this.sendPushNotification(
      [this.normalizeExternalId(proposal.driver.email)].filter(Boolean),
      '🚗 Nouvelle course disponible',
      `Course ${reservation.code} — ${pickup} → ${dropoff} (${proposal.distance.toFixed(1)} km) — Répondez dans 10 min`,
      { reservationCode: reservation.code, proposalToken: proposal.token },
    );
  }

  async sendDriverProposalTaken(driver: any, reservation: Reservation): Promise<void> {
    if (!driver?.email) return;

    const title = '❌ Course déjà assignée';
    const body = `
      <p>Bonjour <strong>${driver.firstName}</strong>,</p>
      <p>La course <strong>#${reservation.code}</strong> qui vous était proposée a déjà été prise par un autre chauffeur.</p>
      <p style="color:#888;">Pas d'inquiétude, d'autres opportunités arriveront bientôt !</p>`;

    await this.sendEmail(
      driver.email,
      `${title} — #${reservation.code}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`,
      NotificationType.DRIVER_NEW_RIDE,
      reservation.id,
    );

    // ✅ Push chauffeur — course déjà prise
    await this.sendPushNotification(
      [this.normalizeExternalId(driver.email)].filter(Boolean),
      title,
      `La course ${reservation.code} a été assignée à un autre chauffeur.`,
      { reservationCode: reservation.code },
    );
  }

  async sendAdminNoDriversAvailable(reservation: Reservation, adminEmails: string[]): Promise<void> {
    if (!adminEmails.length) return;

    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);

    const title = '🚨 Aucun chauffeur disponible';
    const body = `
      <p style="color:#dc2626;font-weight:bold;">Aucun chauffeur n'est actuellement disponible pour cette course.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Téléphone</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientPhone}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Trajet</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup} → ${dropoff}</td></tr>
        <tr><td style="padding:8px;color:#666;">Date & Heure</td><td style="padding:8px;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
      </table>
      <p style="background:#fef2f2;padding:12px;border-radius:4px;border-left:4px solid #dc2626;">
        <strong>Action requise :</strong> Assignez manuellement un chauffeur depuis le tableau de bord admin.
      </p>`;

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`;

    for (const email of adminEmails) {
      await this.sendEmail(email, `${title} — #${reservation.code}`, html, NotificationType.ADMIN_NEW_RESERVATION, reservation.id);
    }

    // ✅ AJOUT : Push admin — aucun chauffeur dispo (manquait)
    await this.sendPushNotification(
      adminEmails.map(e => this.normalizeExternalId(e)).filter(Boolean),
      title,
      `Course ${reservation.code} sans chauffeur — action requise`,
      { reservationCode: reservation.code },
    );
  }

  async sendAdminAllDriversDeclined(reservation: Reservation, adminEmails: string[]): Promise<void> {
    if (!adminEmails.length) return;

    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);

    const title = '⚠️ Tous les chauffeurs ont décliné';
    const body = `
      <p style="color:#ea580c;font-weight:bold;">Tous les chauffeurs disponibles ont décliné ou n'ont pas répondu à la proposition.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Téléphone</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientPhone}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Trajet</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup} → ${dropoff}</td></tr>
        <tr><td style="padding:8px;color:#666;">Date & Heure</td><td style="padding:8px;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
      </table>
      <p style="background:#fff7ed;padding:12px;border-radius:4px;border-left:4px solid #ea580c;">
        <strong>Action requise :</strong> Créez une nouvelle proposition ou assignez directement un chauffeur depuis le tableau de bord.
      </p>`;

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`;

    for (const email of adminEmails) {
      await this.sendEmail(email, `${title} — #${reservation.code}`, html, NotificationType.ADMIN_NEW_RESERVATION, reservation.id);
    }

    // ✅ AJOUT : Push admin — tous chauffeurs ont décliné (manquait)
    await this.sendPushNotification(
      adminEmails.map(e => this.normalizeExternalId(e)).filter(Boolean),
      title,
      `Course ${reservation.code} — assignez un chauffeur manuellement`,
      { reservationCode: reservation.code },
    );
  }

  async sendAdminUnpaidRide(reservation: Reservation, adminEmails: string[], markedAt: Date): Promise<void> {
    if (!adminEmails.length) return;

    const pickup = this.getPickupAddress(reservation);
    const dropoff = this.getDropoffAddress(reservation);

    const title = '⚠️ Course marquée IMPAYÉE par le chauffeur';
    const body = `
      <p style="color:#dc2626;font-weight:bold;font-size:18px;">🚨 ALERTE IMPAYÉ</p>
      <p>Le chauffeur a signalé un <strong>non-paiement</strong> pour cette course.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;border:3px solid #dc2626;border-radius:8px;">
        <tr style="background:#fef2f2;"><td colspan="2" style="padding:12px;font-weight:bold;color:#991b1b;">📋 Détails de la course</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;font-size:16px;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Téléphone client</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#dc2626;">${reservation.clientPhone}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Chauffeur</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.driver?.firstName} ${reservation.driver?.lastName || 'Non assigné'}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Téléphone chauffeur</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.driver?.phone || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Trajet</td><td style="padding:8px;border-bottom:1px solid #eee;">${pickup} → ${dropoff}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Date & Heure course</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${new Date(reservation.pickupDateTime).toLocaleString('fr-FR')}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">💰 Montant dû</td><td style="padding:8px;font-weight:bold;color:#dc2626;font-size:18px;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>
      <div style="background:#fef2f2;padding:12px;border-radius:8px;border-left:4px solid #dc2626;margin:16px 0;">
        <p style="margin:0;font-weight:bold;color:#991b1b;">⏰ Signalé comme impayé à : ${markedAt.toLocaleString('fr-FR')}</p>
        <p style="margin:8px 0 0 0;font-size:14px;">Par : ${reservation.driver?.firstName} ${reservation.driver?.lastName || 'Chauffeur'}</p>
      </div>
      <p style="background:#fff7ed;padding:12px;border-radius:4px;border-left:4px solid #ea580c;">
        <strong>Action requise :</strong> Contactez immédiatement le client et/ou le chauffeur pour régulariser la situation.
      </p>`;

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`;

    for (const email of adminEmails) {
      await this.sendEmail(
        email,
        `${title} — #${reservation.code} — ${Number(reservation.amount).toLocaleString()} FCFA`,
        html,
        NotificationType.ADMIN_UNPAID_RIDE,
        reservation.id,
      );
    }

    // ✅ AJOUT : Push admin — course impayée (manquait)
    await this.sendPushNotification(
      adminEmails.map(e => this.normalizeExternalId(e)).filter(Boolean),
      '🚨 Course impayée',
      `Course ${reservation.code} signalée impayée — ${Number(reservation.amount).toLocaleString()} FCFA`,
      { reservationCode: reservation.code },
    );
  }

  async sendMonthlyDriverReportEmail(
    to: string,
    firstName: string,
    periodLabel: string,
    pdfBuffer: Buffer,
    driverId: string,
  ): Promise<void> {
    const filename = `rapport-mensuel-${periodLabel.replace(/\s+/g, '-')}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '');
    const safeName = filename || 'rapport-mensuel.pdf';
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">
      <p>Bonjour <strong>${firstName}</strong>,</p>
      <p>Vous trouverez en pièce jointe votre <strong>rapport d'activité</strong> pour la période : <strong>${periodLabel}</strong>.</p>
      <p>Ce document récapitule vos courses, paiements, zones les plus fréquentes et vos créneaux d'activité.</p>
      <p style="color:#666;font-size:12px;">WEND'D Transport — Dakar</p>
    </body></html>`;
    await this.sendEmail(
      to,
      `Votre rapport mensuel WEND'D — ${periodLabel}`,
      html,
      NotificationType.MONTHLY_DRIVER_REPORT,
      driverId,
      [{ filename: safeName, content: pdfBuffer.toString('base64') }],
    );
  }

  async sendMonthlyAdminReportEmail(
    adminEmails: string[],
    periodLabel: string,
    pdfBuffer: Buffer,
  ): Promise<void> {
    if (!adminEmails.length) return;
    const filename = `recap-mensuel-global-${periodLabel.replace(/\s+/g, '-')}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '') || 'recap-mensuel.pdf';
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">
      <h2 style="color:#0d3b2e;">C'est l'heure du récapitulatif mensuel</h2>
      <p>Période : <strong>${periodLabel}</strong></p>
      <p>Le document PDF joint contient la synthèse globale et la <strong>liste détaillée des courses impayées</strong> avec les coordonnées clients pour suivi depuis le tableau de bord.</p>
      <p style="color:#666;font-size:12px;">WEND'D Transport</p>
    </body></html>`;
    for (const email of adminEmails) {
      await this.sendEmail(
        email,
        `Récapitulatif mensuel WEND'D — ${periodLabel}`,
        html,
        NotificationType.MONTHLY_ADMIN_REPORT,
        'monthly-admin-report',
        [{ filename, content: pdfBuffer.toString('base64') }],
      );
    }

    await this.sendPushNotification(
      adminEmails.map(e => this.normalizeExternalId(e)).filter(Boolean),
      'Récapitulatif mensuel',
      `Le rapport PDF pour ${periodLabel} est disponible par email.`,
      {},
    );
  }

  async sendDriverPaymentRegularized(reservation: Reservation): Promise<void> {
    if (!reservation.driver?.email) return;

    const title = '✅ Paiement régularisé';
    const body = `
      <p>Bonjour <strong>${reservation.driver.firstName}</strong>,</p>
      <p style="color:#16a34a;font-weight:bold;">Bonne nouvelle !</p>
      <p>La course <strong>#${reservation.code}</strong> que vous aviez signalée comme impayée a été régularisée.</p>
      <p>Le paiement est maintenant complet et validé par l'administration.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;border:2px solid #16a34a;border-radius:8px;">
        <tr style="background:#f0fdf4;"><td colspan="2" style="padding:12px;font-weight:bold;color:#166534;">📋 Détails de la course</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Code</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${reservation.code}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Client</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientFirstName} ${reservation.clientLastName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Téléphone</td><td style="padding:8px;border-bottom:1px solid #eee;">${reservation.clientPhone}</td></tr>
        <tr><td style="padding:8px;color:#666;font-weight:bold;">💰 Montant</td><td style="padding:8px;font-weight:bold;color:#16a34a;">${Number(reservation.amount).toLocaleString()} FCFA</td></tr>
      </table>
      <p style="font-size:12px;color:#888;">Merci pour votre vigilance. Le dossier est maintenant clos.</p>`;

    await this.sendEmail(
      reservation.driver.email,
      `${title} — #${reservation.code}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;">${body}</body></html>`,
      NotificationType.DRIVER_NEW_RIDE,
      reservation.id,
    );

    // ✅ Push chauffeur — paiement régularisé
    await this.sendPushNotification(
      [this.normalizeExternalId(reservation.driver.email)].filter(Boolean),
      title,
      `Le paiement de la course ${reservation.code} a été régularisé.`,
      { reservationCode: reservation.code },
    );
  }

  // ─── Méthode privée d'envoi ───────────────────────────────────────────────
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
        from: this.getFromResend(),
        to,
        subject,
        html,
        replyTo: this.getReplyTo(),
        attachments,
      });

      log.status = 'ENVOYE';
      await this.emailLogRepository.save(log);
      this.logger.log(`Email sent via Resend [${type}] to ${to}`);
    } catch (error) {
      this.logger.error(`Resend failed [${type}] to ${to} (attempt ${attempt}): ${error?.message}`);

      try {
        await this.sendWithGmail(to, subject, html, attachments);
        log.status = 'ENVOYE';
        log.errorMessage = `Resend failed, sent via Gmail: ${error?.message}`;
        await this.emailLogRepository.save(log);
        this.logger.log(`Email sent via Gmail fallback [${type}] to ${to}`);
      } catch (gmailError) {
        log.status = 'ECHEC';
        log.errorMessage = `Resend error: ${error?.message} | Gmail error: ${gmailError?.message}`;
        await this.emailLogRepository.save(log);
        this.logger.error(`Email failed via Resend & Gmail [${type}] to ${to} (attempt ${attempt}): ${gmailError?.message}`);

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
}