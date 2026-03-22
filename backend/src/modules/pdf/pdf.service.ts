import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Language } from '../../common/enums/language.enum';
import { Driver } from '../drivers/entities/driver.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

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
        .text('WEND\'D Transport', 50, 25);
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
          `WEND'D Transport — wendd-transport.com — ${new Date().toLocaleDateString(lang === Language.EN ? 'en-GB' : 'fr-FR')}`,
          50,
          footerY + 40,
          { align: 'center', width: doc.page.width - 100 },
        );

      doc.end();
    });
  }

  private pickupLabel(r: Reservation): string {
    return (r.pickupCustomAddress || r.pickupZone?.name || '—').slice(0, 80);
  }

  private dropoffLabel(r: Reservation): string {
    return (r.dropoffCustomAddress || r.dropoffZone?.name || '—').slice(0, 80);
  }

  /**
   * Rapport mensuel chauffeur : activité, paiements, zones, créneaux horaires, détail impayés.
   */
  async generateDriverMonthlyReportPdf(opts: {
    driver: Driver;
    periodLabel: string;
    start: Date;
    end: Date;
    rides: Reservation[];
  }): Promise<Buffer> {
    const { driver, periodLabel, rides } = opts;
    const primary = '#1a1a2e';
    const accent = '#0d3b2e';

    const paid = rides.filter(r => r.paymentStatus === PaymentStatus.PAIEMENT_COMPLET);
    const unpaid = rides.filter(r => r.paymentStatus === PaymentStatus.IMPAYE);
    const partial = rides.filter(r => r.paymentStatus === PaymentStatus.ACOMPTE_VERSE);
    const pending = rides.filter(r => r.paymentStatus === PaymentStatus.EN_ATTENTE);
    const refunded = rides.filter(r => r.paymentStatus === PaymentStatus.REMBOURSE);

    const totalEncaisse = paid.reduce((s, r) => s + Number(r.amount), 0);
    const totalImpaye = unpaid.reduce((s, r) => s + Number(r.amount), 0);
    const totalPartiel = partial.reduce((s, r) => s + Number(r.amount), 0);

    const hourBuckets = new Map<number, number>();
    const zoneBuckets = new Map<string, number>();
    for (const r of rides) {
      const h = new Date(r.pickupDateTime).getHours();
      hourBuckets.set(h, (hourBuckets.get(h) || 0) + 1);
      const z = this.pickupLabel(r);
      zoneBuckets.set(z, (zoneBuckets.get(z) || 0) + 1);
    }
    const peakHours = [...hourBuckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const topZones = [...zoneBuckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.rect(0, 0, doc.page.width, 72).fill(accent);
      doc.fillColor('#fff').fontSize(18).font('Helvetica-Bold').text("WEND'D Transport", 48, 22);
      doc.fontSize(10).font('Helvetica').text('Rapport mensuel chauffeur', 48, 48);

      doc.fillColor(primary).fontSize(14).font('Helvetica-Bold').text(`Période : ${periodLabel}`, 48, 88);
      doc.fontSize(11).font('Helvetica').text(
        `${driver.firstName} ${driver.lastName} — Immat. : ${driver.vehiclePlate || 'N/A'} — ${driver.vehicleType}`,
        48,
        108,
      );

      let y = 138;
      const line = (label: string, value: string) => {
        doc.fillColor('#555').fontSize(10).font('Helvetica').text(label, 48, y);
        doc.fillColor(primary).font('Helvetica-Bold').text(value, 220, y, { width: 300 });
        y += 16;
      };

      line('Courses terminées (période)', String(rides.length));
      line('Payées (paiement complet)', String(paid.length));
      line('Impayées', String(unpaid.length));
      line('Acompte versé', String(partial.length));
      line('Paiement en attente', String(pending.length));
      line('Remboursées', String(refunded.length));
      y += 6;
      line('Total encaissé (paiement complet)', `${totalEncaisse.toLocaleString('fr-FR')} FCFA`);
      line('Total courses impayées', `${totalImpaye.toLocaleString('fr-FR')} FCFA`);
      line('Montant acomptes', `${totalPartiel.toLocaleString('fr-FR')} FCFA`);

      y += 12;
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(11).text('Créneaux les plus actifs (heure de départ)', 48, y);
      y += 18;
      if (peakHours.length === 0) {
        doc.fillColor('#888').font('Helvetica').fontSize(9).text('Aucune course sur la période.', 48, y);
        y += 14;
      } else {
        peakHours.forEach(([h, c]) => {
          doc.fillColor('#333').font('Helvetica').fontSize(9).text(`${String(h).padStart(2, '0')}h–${String((h + 1) % 24).padStart(2, '0')}h : ${c} course(s)`, 48, y);
          y += 14;
        });
      }

      y += 8;
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(11).text('Zones de départ les plus fréquentes', 48, y);
      y += 18;
      if (topZones.length === 0) {
        doc.fillColor('#888').font('Helvetica').fontSize(9).text('—', 48, y);
        y += 14;
      } else {
        topZones.forEach(([z, c]) => {
          const text = `${c} course(s) — ${z}`;
          doc.fillColor('#333').font('Helvetica').fontSize(9).text(text, 48, y, { width: 500 });
          y += doc.heightOfString(text, { width: 500 }) + 4;
          if (y > doc.page.height - 120) {
            doc.addPage();
            y = 48;
          }
        });
      }

      if (unpaid.length > 0) {
        y += 10;
        if (y > doc.page.height - 160) {
          doc.addPage();
          y = 48;
        }
        doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(11).text('Courses impayées — détail (relance)', 48, y);
        y += 18;
        unpaid.forEach((r) => {
          const block = `${r.code} — ${Number(r.amount).toLocaleString('fr-FR')} FCFA — ${new Date(r.pickupDateTime).toLocaleString('fr-FR')}\nClient : ${r.clientFirstName} ${r.clientLastName} — ${r.clientPhone}\n${this.pickupLabel(r)} → ${this.dropoffLabel(r)}`;
          doc.fillColor('#333').font('Helvetica').fontSize(8).text(block, 48, y, { width: 500 });
          y += doc.heightOfString(block, { width: 500 }) + 10;
          if (y > doc.page.height - 100) {
            doc.addPage();
            y = 48;
          }
        });
      }

      doc.fontSize(8).fillColor('#999').text(
        `Document généré automatiquement — ${new Date().toLocaleString('fr-FR')}`,
        48,
        doc.page.height - 56,
        { align: 'center', width: doc.page.width - 96 },
      );
      doc.end();
    });
  }

  /**
   * Rapport mensuel global pour l'admin : synthèse + liste complète des impayés avec coordonnées.
   */
  async generateAdminMonthlyReportPdf(opts: {
    periodLabel: string;
    start: Date;
    end: Date;
    reservations: Reservation[];
    allDrivers: Driver[];
  }): Promise<Buffer> {
    const { periodLabel, reservations, allDrivers } = opts;
    const primary = '#1a1a2e';
    const accent = '#0d3b2e';

    const byDriverId = new Map<string, Reservation[]>();
    for (const r of reservations) {
      if (!r.driverId) continue;
      const arr = byDriverId.get(r.driverId) || [];
      arr.push(r);
      byDriverId.set(r.driverId, arr);
    }

    const driverName = (id: string) => {
      const d = allDrivers.find(x => x.id === id);
      return d ? `${d.firstName} ${d.lastName}` : id;
    };

    const unpaidAll = reservations.filter(r => r.paymentStatus === PaymentStatus.IMPAYE);
    const totalRevenue = reservations
      .filter(r => r.paymentStatus === PaymentStatus.PAIEMENT_COMPLET)
      .reduce((s, r) => s + Number(r.amount), 0);
    const totalUnpaid = unpaidAll.reduce((s, r) => s + Number(r.amount), 0);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 42 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.rect(0, 0, doc.page.width, 76).fill(accent);
      doc.fillColor('#fff').fontSize(17).font('Helvetica-Bold').text("WEND'D Transport — Récapitulatif mensuel", 42, 20);
      doc.fontSize(10).font('Helvetica').text(`Période : ${periodLabel}`, 42, 46);

      let y = 96;
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(12).text("C'est l'heure du récapitulatif mensuel", 42, y);
      y += 22;
      doc.font('Helvetica').fontSize(10).fillColor('#444').text(
        `Courses terminées sur la période : ${reservations.length}. Chiffre d'affaires (paiements complets) : ${totalRevenue.toLocaleString('fr-FR')} FCFA. Montant total impayé : ${totalUnpaid.toLocaleString('fr-FR')} FCFA.`,
        42,
        y,
        { width: doc.page.width - 84 },
      );
      y += 42;

      doc.fillColor(primary).font('Helvetica-Bold').fontSize(11).text('Synthèse par chauffeur', 42, y);
      y += 16;
      byDriverId.forEach((list, id) => {
        const enc = list.filter(r => r.paymentStatus === PaymentStatus.PAIEMENT_COMPLET).reduce((s, r) => s + Number(r.amount), 0);
        const imp = list.filter(r => r.paymentStatus === PaymentStatus.IMPAYE).reduce((s, r) => s + Number(r.amount), 0);
        const line = `${driverName(id)} — ${list.length} course(s) — Encaissé : ${enc.toLocaleString('fr-FR')} FCFA — Impayé : ${imp.toLocaleString('fr-FR')} FCFA`;
        doc.fillColor('#333').font('Helvetica').fontSize(9).text(line, 42, y, { width: 500 });
        y += 14;
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 42;
        }
      });

      y += 12;
      doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(11).text(
        'Courses impayées — coordonnées complètes (suivi admin)',
        42,
        y,
      );
      y += 18;

      if (unpaidAll.length === 0) {
        doc.fillColor('#666').font('Helvetica').fontSize(9).text('Aucune course impayée sur cette période.', 42, y);
      } else {
        unpaidAll.forEach((r) => {
          const d = r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : driverName(r.driverId);
          const block =
            `Code ${r.code} — ${Number(r.amount).toLocaleString('fr-FR')} FCFA — ${new Date(r.pickupDateTime).toLocaleString('fr-FR')}\n` +
            `Chauffeur : ${d}\n` +
            `Client : ${r.clientFirstName} ${r.clientLastName} — Tel : ${r.clientPhone} — Email : ${r.clientEmail}\n` +
            `Trajet : ${this.pickupLabel(r)} → ${this.dropoffLabel(r)}`;
          doc.fillColor('#222').font('Helvetica').fontSize(8).text(block, 42, y, { width: 510 });
          y += doc.heightOfString(block, { width: 510 }) + 8;
          if (y > doc.page.height - 90) {
            doc.addPage();
            y = 42;
          }
        });
      }

      doc.fontSize(8).fillColor('#999').text(
        `Généré automatiquement — ${new Date().toLocaleString('fr-FR')}`,
        42,
        doc.page.height - 48,
        { align: 'center', width: doc.page.width - 84 },
      );
      doc.end();
    });
  }
}
