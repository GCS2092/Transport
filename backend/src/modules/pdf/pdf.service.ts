import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Language } from '../../common/enums/language.enum';

@Injectable()
export class PdfService {
  private t(lang: Language, fr: string, en: string): string {
    return lang === Language.EN ? en : fr;
  }

  async generateReceipt(reservation: Reservation): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const lang = reservation.language;
      const primaryColor = '#1a1a2e';
      const accentColor = '#4a90e2';

      doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
      doc
        .fillColor('#ffffff')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('VTC Dakar', 50, 25);
      doc
        .fillColor('#aaaacc')
        .fontSize(10)
        .font('Helvetica')
        .text('Dakar, Sénégal', 50, 52);

      doc.moveDown(3);

      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(this.t(lang, 'REÇU DE COURSE', 'RIDE RECEIPT'), { align: 'center' });

      doc.moveDown(0.5);
      doc
        .fillColor(accentColor)
        .fontSize(12)
        .text(`#${reservation.code}`, { align: 'center' });

      doc.moveDown(1.5);

      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 250;
      const rowHeight = 28;

      const rows = [
        [
          this.t(lang, 'Client', 'Client'),
          `${reservation.clientFirstName} ${reservation.clientLastName}`,
        ],
        [
          this.t(lang, 'Email', 'Email'),
          reservation.clientEmail,
        ],
        [
          this.t(lang, 'Téléphone', 'Phone'),
          reservation.clientPhone,
        ],
        [
          this.t(lang, 'Date de course', 'Ride date'),
          new Date(reservation.pickupDateTime).toLocaleString(
            lang === Language.EN ? 'en-GB' : 'fr-FR',
          ),
        ],
        [
          this.t(lang, 'Départ', 'From'),
          reservation.pickupZone?.name || '-',
        ],
        [
          this.t(lang, 'Destination', 'To'),
          reservation.dropoffZone?.name || '-',
        ],
        [
          this.t(lang, 'Chauffeur', 'Driver'),
          reservation.driver
            ? `${reservation.driver.firstName} ${reservation.driver.lastName}`
            : '-',
        ],
        [
          this.t(lang, 'Véhicule', 'Vehicle'),
          reservation.driver?.vehicleType || '-',
        ],
        [
          this.t(lang, 'Passagers', 'Passengers'),
          String(reservation.passengers),
        ],
      ];

      rows.forEach((row, i) => {
        const y = tableTop + i * rowHeight;
        if (i % 2 === 0) {
          doc.rect(col1 - 5, y - 5, doc.page.width - 90, rowHeight).fill('#f8f8f8');
        }
        doc
          .fillColor('#666666')
          .fontSize(10)
          .font('Helvetica')
          .text(row[0], col1, y + 2);
        doc
          .fillColor(primaryColor)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(row[1], col2, y + 2, { width: 260 });
      });

      const amountY = tableTop + rows.length * rowHeight + 20;
      doc.rect(col1 - 5, amountY - 10, doc.page.width - 90, 44).fill(primaryColor);
      doc
        .fillColor('#ffffff')
        .fontSize(11)
        .font('Helvetica')
        .text(this.t(lang, 'MONTANT TOTAL', 'TOTAL AMOUNT'), col1, amountY + 2);
      doc
        .fillColor('#ffffff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(`${Number(reservation.amount).toLocaleString()} FCFA`, col2, amountY - 1);

      doc.moveDown(4);

      const footerY = doc.page.height - 80;
      doc
        .rect(0, footerY, doc.page.width, 80)
        .fill('#f4f4f4');
      doc
        .fillColor('#999999')
        .fontSize(9)
        .font('Helvetica')
        .text(
          this.t(
            lang,
            'Merci de votre confiance. Ce reçu constitue votre preuve de paiement.',
            'Thank you for your trust. This receipt serves as your proof of payment.',
          ),
          50,
          footerY + 15,
          { align: 'center', width: doc.page.width - 100 },
        );
      doc
        .fillColor('#aaaaaa')
        .fontSize(8)
        .text(
          `VTC Dakar — vtcdakar.com — ${new Date().toLocaleDateString(lang === Language.EN ? 'en-GB' : 'fr-FR')}`,
          50,
          footerY + 40,
          { align: 'center', width: doc.page.width - 100 },
        );

      doc.end();
    });
  }
}
