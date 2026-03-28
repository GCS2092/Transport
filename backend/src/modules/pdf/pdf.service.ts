import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Language } from '../../common/enums/language.enum';
import { Driver } from '../drivers/entities/driver.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';

@Injectable()
export class PdfService {
  // ─── Couleurs ────────────────────────────────────────────────────────────
  private readonly PRIMARY   = '#1a1a2e';
  private readonly ACCENT    = '#0d3b2e';
  private readonly RED       = '#b91c1c';
  private readonly GREEN     = '#15803d';
  private readonly GRAY_BG   = '#f4f4f4';
  private readonly HEADER_BG = '#e8e8e8';
  private readonly M         = 42;          // marge gauche/droite
  private readonly PAGE_W    = 595.28;      // A4

  private get contentW() { return this.PAGE_W - this.M * 2; }

  // ─── i18n minimaliste ────────────────────────────────────────────────────
  private t(lang: Language, fr: string, en: string): string {
    return lang === Language.EN ? en : fr;
  }

  // =========================================================================
  // UTILITAIRE TABLEAU
  // Dessine un tableau complet avec en-tête coloré + lignes zébrées.
  //
  // cols: [{ label, width, align? }]   (sum des widths <= contentW)
  // rows: string[][]
  // =========================================================================
  private drawTable(
    doc: PDFKit.PDFDocument,
    startY: number,
    cols: { label: string; width: number; align?: 'left' | 'center' | 'right' }[],
    rows: string[][],
    opts: {
      headerBg?: string;
      headerColor?: string;
      rowHeight?: number;
      headerHeight?: number;
      fontSize?: number;
      headerFontSize?: number;
      startX?: number;
    } = {},
  ): number {
    const {
      headerBg      = this.PRIMARY,
      headerColor   = '#ffffff',
      rowHeight     = 18,
      headerHeight  = 22,
      fontSize      = 8,
      headerFontSize = 8.5,
      startX        = this.M,
    } = opts;

    let y = startY;
    const totalW = cols.reduce((s, c) => s + c.width, 0);

    // ── En-tête ─────────────────────────────────────────────────────────
    doc.rect(startX, y, totalW, headerHeight).fill(headerBg);
    let cx = startX;
    for (const col of cols) {
      doc
        .fillColor(headerColor)
        .font('Helvetica-Bold')
        .fontSize(headerFontSize)
        .text(col.label, cx + 4, y + (headerHeight - headerFontSize) / 2, {
          width: col.width - 8,
          align: col.align || 'left',
        });
      cx += col.width;
    }
    y += headerHeight;

    // ── Lignes ──────────────────────────────────────────────────────────
    for (let i = 0; i < rows.length; i++) {
      // Saut de page si nécessaire
      if (y + rowHeight > doc.page.height - 60) {
        doc.addPage();
        y = this.M;
        // Réafficher l'en-tête sur nouvelle page
        doc.rect(startX, y, totalW, headerHeight).fill(headerBg);
        let hx = startX;
        for (const col of cols) {
          doc
            .fillColor(headerColor)
            .font('Helvetica-Bold')
            .fontSize(headerFontSize)
            .text(col.label, hx + 4, y + (headerHeight - headerFontSize) / 2, {
              width: col.width - 8,
              align: col.align || 'left',
            });
          hx += col.width;
        }
        y += headerHeight;
      }

      // Fond zébré
      const bg = i % 2 === 0 ? '#ffffff' : this.GRAY_BG;
      doc.rect(startX, y, totalW, rowHeight).fill(bg);

      // Bordure inférieure légère
      doc.moveTo(startX, y + rowHeight)
         .lineTo(startX + totalW, y + rowHeight)
         .strokeColor('#dddddd')
         .lineWidth(0.4)
         .stroke();

      // Contenu cellules
      let rx = startX;
      for (let j = 0; j < cols.length; j++) {
        const cell = rows[i][j] ?? '';
        doc
          .fillColor(this.PRIMARY)
          .font('Helvetica')
          .fontSize(fontSize)
          .text(cell, rx + 4, y + (rowHeight - fontSize) / 2, {
            width: cols[j].width - 8,
            align: cols[j].align || 'left',
          });
        rx += cols[j].width;
      }
      y += rowHeight;
    }

    // Bordure extérieure du tableau
    doc
      .rect(startX, startY, totalW, y - startY)
      .strokeColor('#cccccc')
      .lineWidth(0.6)
      .stroke();

    return y; // retourne la position Y après le tableau
  }

  // ─── En-tête de page commun ──────────────────────────────────────────────
  private drawPageHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string): void {
    doc.rect(0, 0, this.PAGE_W, 72).fill(this.ACCENT);
    doc
      .fillColor('#ffffff')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text("WEND'D Transport", this.M, 16);
    doc
      .fillColor('#aaccaa')
      .fontSize(10)
      .font('Helvetica')
      .text(title, this.M, 38);
    if (subtitle) {
      doc.fillColor('#88aa88').fontSize(8).text(subtitle, this.M, 54);
    }
  }

  // ─── Titre de section ────────────────────────────────────────────────────
  private drawSectionTitle(
    doc: PDFKit.PDFDocument,
    y: number,
    text: string,
    color = this.PRIMARY,
  ): number {
    doc.rect(this.M, y, this.contentW, 18).fill(color);
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(text, this.M + 6, y + 4, { width: this.contentW - 12 });
    return y + 24;
  }

  // ─── Pied de page ────────────────────────────────────────────────────────
  private drawFooter(doc: PDFKit.PDFDocument, lang: Language): void {
    const fy = doc.page.height - 50;
    doc.rect(0, fy, this.PAGE_W, 50).fill(this.GRAY_BG);
    doc
      .fillColor('#999999')
      .fontSize(7.5)
      .font('Helvetica')
      .text(
        this.t(
          lang,
          'Merci de votre confiance. Ce reçu constitue votre preuve de paiement.',
          'Thank you for your trust. This receipt serves as your proof of payment.',
        ),
        this.M, fy + 10,
        { align: 'center', width: this.contentW },
      );
    doc
      .fillColor('#bbbbbb')
      .fontSize(7)
      .text(
        `WEND'D Transport — wendd-transport.com — ${new Date().toLocaleDateString(lang === Language.EN ? 'en-GB' : 'fr-FR')}`,
        this.M, fy + 28,
        { align: 'center', width: this.contentW },
      );
  }

  private pickupLabel(r: Reservation): string {
    return (r.pickupCustomAddress || r.pickupZone?.name || '—').slice(0, 80);
  }

  private dropoffLabel(r: Reservation): string {
    return (r.dropoffCustomAddress || r.dropoffZone?.name || '—').slice(0, 80);
  }

  // =========================================================================
  // 1. REÇU DE COURSE
  // =========================================================================
  async generateReceipt(reservation: Reservation): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: this.M });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const lang = reservation.language;

      this.drawPageHeader(
        doc,
        this.t(lang, 'Reçu de course', 'Ride Receipt'),
        `#${reservation.code}`,
      );

      // Titre centré
      doc
        .fillColor(this.PRIMARY)
        .fontSize(15)
        .font('Helvetica-Bold')
        .text(
          this.t(lang, 'REÇU DE COURSE', 'RIDE RECEIPT'),
          this.M, 88,
          { align: 'center', width: this.contentW },
        );
      doc
        .fillColor('#4a90e2')
        .fontSize(11)
        .text(`#${reservation.code}`, this.M, 108, {
          align: 'center',
          width: this.contentW,
        });

      // ── Tableau des informations ─────────────────────────────────────────
      const infoRows: string[][] = [
        [this.t(lang, 'Client', 'Client'),           `${reservation.clientFirstName} ${reservation.clientLastName}`],
        [this.t(lang, 'Email', 'Email'),              reservation.clientEmail],
        [this.t(lang, 'Téléphone', 'Phone'),          reservation.clientPhone],
        [
          this.t(lang, 'Date de course', 'Ride date'),
          new Date(reservation.pickupDateTime).toLocaleString(lang === Language.EN ? 'en-GB' : 'fr-FR'),
        ],
        [this.t(lang, 'Départ', 'From'),              this.pickupLabel(reservation)],
        [this.t(lang, 'Destination', 'To'),           this.dropoffLabel(reservation)],
        [
          this.t(lang, 'Chauffeur', 'Driver'),
          reservation.driver
            ? `${reservation.driver.firstName} ${reservation.driver.lastName}`
            : '-',
        ],
        [this.t(lang, 'Véhicule', 'Vehicle'),         reservation.driver?.vehicleType || '-'],
        [this.t(lang, 'Passagers', 'Passengers'),     String(reservation.passengers)],
        [this.t(lang, 'Véhicules', 'Vehicles'),       String(reservation.vehicleCount ?? 1)],
      ];

      const cols = [
        { label: this.t(lang, 'Champ', 'Field'), width: 160 },
        { label: this.t(lang, 'Valeur', 'Value'), width: this.contentW - 160 },
      ];

      let y = this.drawTable(doc, 130, cols, infoRows, {
        headerBg: this.ACCENT,
        rowHeight: 20,
        headerHeight: 20,
      });

      // ── Ligne montant total ──────────────────────────────────────────────
      y += 10;
      doc.rect(this.M, y, this.contentW, 36).fill(this.PRIMARY);
      doc
        .fillColor('#ffffff')
        .fontSize(10)
        .font('Helvetica')
        .text(
          this.t(lang, 'MONTANT TOTAL', 'TOTAL AMOUNT'),
          this.M + 10, y + 10,
        );

      let amountText = `${Number(reservation.amount).toLocaleString('fr-FR')} FCFA`;
      if (reservation.originalAmount && reservation.discount) {
        amountText += `  (remise : -${Number(reservation.discount).toLocaleString('fr-FR')} FCFA)`;
      }
      doc
        .fillColor('#7fffb0')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(amountText, this.M + 170, y + 8, { width: this.contentW - 180, align: 'right' });

      this.drawFooter(doc, lang);
      doc.end();
    });
  }

  // =========================================================================
  // 2. RAPPORT MENSUEL CHAUFFEUR
  // =========================================================================
  async generateDriverMonthlyReportPdf(opts: {
    driver: Driver;
    periodLabel: string;
    start: Date;
    end: Date;
    rides: Reservation[];
  }): Promise<Buffer> {
    const { driver, periodLabel, rides } = opts;

    const paid    = rides.filter(r => r.paymentStatus === PaymentStatus.PAIEMENT_COMPLET);
    const unpaid  = rides.filter(r => r.paymentStatus === PaymentStatus.IMPAYE);
    const partial = rides.filter(r => r.paymentStatus === PaymentStatus.ACOMPTE_VERSE);
    const pending = rides.filter(r => r.paymentStatus === PaymentStatus.EN_ATTENTE);
    const refunded= rides.filter(r => r.paymentStatus === PaymentStatus.REMBOURSE);

    const totalEncaisse = paid.reduce((s, r) => s + Number(r.amount), 0);
    const totalImpaye   = unpaid.reduce((s, r) => s + Number(r.amount), 0);
    const totalPartiel  = partial.reduce((s, r) => s + Number(r.amount), 0);

    // Créneaux horaires
    const hourBuckets = new Map<number, number>();
    for (const r of rides) {
      const h = new Date(r.pickupDateTime).getHours();
      hourBuckets.set(h, (hourBuckets.get(h) || 0) + 1);
    }
    const peakHours = [...hourBuckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Zones
    const zoneBuckets = new Map<string, number>();
    for (const r of rides) {
      const z = this.pickupLabel(r);
      zoneBuckets.set(z, (zoneBuckets.get(z) || 0) + 1);
    }
    const topZones = [...zoneBuckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: this.M });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawPageHeader(
        doc,
        'Rapport mensuel chauffeur',
        `${driver.firstName} ${driver.lastName} — ${periodLabel} — Immat. ${driver.vehiclePlate || 'N/A'}`,
      );

      let y = 86;

      // ── Section 1 : Résumé statistiques ─────────────────────────────────
      y = this.drawSectionTitle(doc, y, 'Résumé de la période');
      y = this.drawTable(doc, y, [
        { label: 'Indicateur',     width: 240 },
        { label: 'Valeur',         width: 100, align: 'right' },
        { label: 'Montant (FCFA)', width: this.contentW - 340, align: 'right' },
      ], [
        ['Courses totales',              String(rides.length),    '—'],
        ['Payées (paiement complet)',     String(paid.length),    totalEncaisse.toLocaleString('fr-FR')],
        ['Impayées',                      String(unpaid.length),  totalImpaye.toLocaleString('fr-FR')],
        ['Acompte versé',                 String(partial.length), totalPartiel.toLocaleString('fr-FR')],
        ['Paiement en attente',           String(pending.length), '—'],
        ['Remboursées',                   String(refunded.length),'—'],
      ]);

      // ── Section 2 : Créneaux horaires ────────────────────────────────────
      y += 12;
      y = this.drawSectionTitle(doc, y, 'Créneaux les plus actifs (heure de départ)');
      if (peakHours.length === 0) {
        doc.fillColor('#888').font('Helvetica').fontSize(9).text('Aucune course sur la période.', this.M, y);
        y += 16;
      } else {
        y = this.drawTable(doc, y, [
          { label: 'Créneau',   width: 120 },
          { label: 'Courses',   width: 80, align: 'right' },
        ], peakHours.map(([h, c]) => [
          `${String(h).padStart(2, '0')}h – ${String((h + 1) % 24).padStart(2, '0')}h`,
          String(c),
        ]));
      }

      // ── Section 3 : Zones de départ ───────────────────────────────────────
      y += 12;
      y = this.drawSectionTitle(doc, y, 'Zones de départ les plus fréquentes');
      if (topZones.length === 0) {
        doc.fillColor('#888').font('Helvetica').fontSize(9).text('—', this.M, y);
        y += 16;
      } else {
        y = this.drawTable(doc, y, [
          { label: 'Zone',    width: this.contentW - 80 },
          { label: 'Courses', width: 80, align: 'right' },
        ], topZones.map(([z, c]) => [z, String(c)]));
      }

      // ── Section 4 : Détail impayés ─────────────────────────────────────
      if (unpaid.length > 0) {
        if (y > doc.page.height - 200) { doc.addPage(); y = this.M; }
        y += 12;
        y = this.drawSectionTitle(doc, y, `Courses impayées — détail (${unpaid.length})`, this.RED);
        y = this.drawTable(doc, y, [
          { label: 'Code',      width: 80 },
          { label: 'Date',      width: 110 },
          { label: 'Client',    width: 140 },
          { label: 'Téléphone', width: 90 },
          { label: 'Montant',   width: this.contentW - 420, align: 'right' },
        ], unpaid.map(r => [
          r.code,
          new Date(r.pickupDateTime).toLocaleString('fr-FR'),
          `${r.clientFirstName} ${r.clientLastName}`,
          r.clientPhone || '—',
          `${Number(r.amount).toLocaleString('fr-FR')} FCFA`,
        ]), { headerBg: this.RED });
      }

      // Pied de page
      doc.fontSize(7.5).fillColor('#aaa').font('Helvetica').text(
        `Document généré automatiquement — ${new Date().toLocaleString('fr-FR')}`,
        this.M, doc.page.height - 30,
        { align: 'center', width: this.contentW },
      );
      doc.end();
    });
  }

  // =========================================================================
  // 3. RAPPORT MENSUEL ADMIN
  // =========================================================================
  async generateAdminMonthlyReportPdf(opts: {
    periodLabel: string;
    start: Date;
    end: Date;
    reservations: Reservation[];
    allDrivers: Driver[];
  }): Promise<Buffer> {
    const { periodLabel, reservations, allDrivers } = opts;

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

    const unpaidAll    = reservations.filter(r => r.paymentStatus === PaymentStatus.IMPAYE);
    const totalRevenue = reservations
      .filter(r => r.paymentStatus === PaymentStatus.PAIEMENT_COMPLET)
      .reduce((s, r) => s + Number(r.amount), 0);
    const totalUnpaid  = unpaidAll.reduce((s, r) => s + Number(r.amount), 0);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: this.M });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawPageHeader(doc, `Récapitulatif mensuel — ${periodLabel}`);

      let y = 86;

      // ── Résumé global ────────────────────────────────────────────────────
      y = this.drawSectionTitle(doc, y, 'Résumé global');
      y = this.drawTable(doc, y, [
        { label: 'Indicateur',        width: 240 },
        { label: 'Valeur / Montant',  width: this.contentW - 240, align: 'right' },
      ], [
        ['Courses terminées (période)',  String(reservations.length)],
        ["Chiffre d'affaires (payées)",  `${totalRevenue.toLocaleString('fr-FR')} FCFA`],
        ['Montant total impayé',         `${totalUnpaid.toLocaleString('fr-FR')} FCFA`],
      ]);

      // ── Synthèse par chauffeur ───────────────────────────────────────────
      y += 14;
      y = this.drawSectionTitle(doc, y, 'Synthèse par chauffeur');

      const driverRows: string[][] = [];
      byDriverId.forEach((list, id) => {
        const enc = list.filter(r => r.paymentStatus === PaymentStatus.PAIEMENT_COMPLET)
          .reduce((s, r) => s + Number(r.amount), 0);
        const imp = list.filter(r => r.paymentStatus === PaymentStatus.IMPAYE)
          .reduce((s, r) => s + Number(r.amount), 0);
        driverRows.push([
          driverName(id),
          String(list.length),
          `${enc.toLocaleString('fr-FR')} FCFA`,
          imp > 0 ? `${imp.toLocaleString('fr-FR')} FCFA` : '—',
        ]);
      });
      // Tri par CA décroissant
      driverRows.sort((a, b) => {
        const numA = parseInt(a[2].replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b[2].replace(/\D/g, ''), 10) || 0;
        return numB - numA;
      });

      y = this.drawTable(doc, y, [
        { label: 'Chauffeur',          width: 160 },
        { label: 'Courses',            width: 60,  align: 'right' },
        { label: 'CA encaissé (FCFA)', width: 140, align: 'right' },
        { label: 'Impayé (FCFA)',      width: this.contentW - 360, align: 'right' },
      ], driverRows);

      // ── Détail courses impayées ──────────────────────────────────────────
      if (y > doc.page.height - 200) { doc.addPage(); y = this.M; }
      y += 14;
      y = this.drawSectionTitle(
        doc, y,
        `Courses impayées — contacts pour suivi (${unpaidAll.length})`,
        this.RED,
      );

      if (unpaidAll.length === 0) {
        doc.fillColor(this.GREEN).font('Helvetica-Bold').fontSize(9)
          .text('Aucune course impayée sur cette période.', this.M, y);
      } else {
        y = this.drawTable(doc, y, [
          { label: 'Code',      width: 70 },
          { label: 'Date',      width: 100 },
          { label: 'Client',    width: 120 },
          { label: 'Téléphone', width: 85 },
          { label: 'Email',     width: 120 },
          { label: 'Montant',   width: this.contentW - 495, align: 'right' },
        ], unpaidAll.map(r => {
          const d = r.driver
            ? `${r.driver.firstName} ${r.driver.lastName}`
            : driverName(r.driverId);
          return [
            r.code,
            new Date(r.pickupDateTime).toLocaleString('fr-FR'),
            `${r.clientFirstName} ${r.clientLastName}`,
            r.clientPhone || '—',
            r.clientEmail || '—',
            `${Number(r.amount).toLocaleString('fr-FR')} FCFA`,
          ];
        }), { headerBg: this.RED, fontSize: 7.5 });
      }

      doc.fontSize(7.5).fillColor('#aaa').font('Helvetica').text(
        `Généré automatiquement — ${new Date().toLocaleString('fr-FR')}`,
        this.M, doc.page.height - 30,
        { align: 'center', width: this.contentW },
      );
      doc.end();
    });
  }

  // =========================================================================
  // 4. RAPPORT D'ARCHIVAGE
  // =========================================================================
  async generateArchiveReportPdf(opts: {
    rows: Reservation[];
    reason: 'manual' | 'auto';
    generatedAt: Date;
  }): Promise<Buffer> {
    const { rows, reason, generatedAt } = opts;

    const completed = rows.filter(r => r.status === ReservationStatus.TERMINEE);
    const cancelled = rows.filter(r => r.status === ReservationStatus.ANNULEE);
    const paid      = rows.filter(r => r.paymentStatus === PaymentStatus.PAIEMENT_COMPLET);
    const unpaid    = rows.filter(r => r.paymentStatus === PaymentStatus.IMPAYE);
    const partial   = rows.filter(r => r.paymentStatus === PaymentStatus.ACOMPTE_VERSE);
    const pending   = rows.filter(r => r.paymentStatus === PaymentStatus.EN_ATTENTE);

    const totalCA      = paid.reduce((s, r) => s + Number(r.amount), 0);
    const totalImpaye  = unpaid.reduce((s, r) => s + Number(r.amount), 0);
    const totalAcompte = partial.reduce((s, r) => s + Number(r.amount), 0);
    const totalBrut    = rows.reduce((s, r) => s + Number(r.amount), 0);
    const tauxRecouv   = totalBrut > 0
      ? ((totalCA / totalBrut) * 100).toFixed(1)
      : '0.0';

    // Meilleurs chauffeurs
    const driverStats = new Map<string, { name: string; rides: number; ca: number; impaye: number }>();
    for (const r of rows) {
      if (!r.driver) continue;
      const key = r.driverId || r.driver.id;
      const entry = driverStats.get(key) || {
        name: `${r.driver.firstName} ${r.driver.lastName}`,
        rides: 0, ca: 0, impaye: 0,
      };
      entry.rides += 1;
      if (r.paymentStatus === PaymentStatus.PAIEMENT_COMPLET) entry.ca += Number(r.amount);
      if (r.paymentStatus === PaymentStatus.IMPAYE)           entry.impaye += Number(r.amount);
      driverStats.set(key, entry);
    }
    const topDrivers = [...driverStats.values()]
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10);

    // Zones
    const zoneBuckets = new Map<string, { rides: number; ca: number }>();
    for (const r of rows) {
      const z = (r.pickupCustomAddress || r.pickupZone?.name || 'Inconnue').slice(0, 60);
      const e = zoneBuckets.get(z) || { rides: 0, ca: 0 };
      e.rides += 1;
      if (r.paymentStatus === PaymentStatus.PAIEMENT_COMPLET) e.ca += Number(r.amount);
      zoneBuckets.set(z, e);
    }
    const topZones = [...zoneBuckets.entries()]
      .sort((a, b) => b[1].rides - a[1].rides)
      .slice(0, 10);

    // Types de course
    const tripTypeBuckets = new Map<string, number>();
    for (const r of rows) {
      tripTypeBuckets.set(r.tripType, (tripTypeBuckets.get(r.tripType) || 0) + 1);
    }

    const unpaidWithContacts = unpaid.filter(r => r.clientPhone || r.clientEmail);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: this.M });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ════════════════════════════════════════════════════════════════
      // PAGE 1 — Vue d'ensemble + Finances
      // ════════════════════════════════════════════════════════════════
      this.drawPageHeader(
        doc,
        `Rapport d'archivage — ${reason === 'auto' ? 'Automatique' : 'Manuel'}`,
        `Généré le ${generatedAt.toLocaleString('fr-FR')}`,
      );

      let y = 86;

      // Vue d'ensemble
      y = this.drawSectionTitle(doc, y, 'Vue d\'ensemble — courses archivées');
      y = this.drawTable(doc, y, [
        { label: 'Indicateur',  width: 240 },
        { label: 'Valeur',      width: this.contentW - 240, align: 'right' },
      ], [
        ['Total courses archivées', String(rows.length)],
        ['Courses terminées',       String(completed.length)],
        ['Courses annulées',        String(cancelled.length)],
        ['Montant brut total',      `${totalBrut.toLocaleString('fr-FR')} FCFA`],
      ]);

      // Finances
      y += 14;
      y = this.drawSectionTitle(doc, y, 'Finances — CA & recouvrement');
      y = this.drawTable(doc, y, [
        { label: 'Indicateur',        width: 240 },
        { label: 'Nb courses',        width: 80,  align: 'right' },
        { label: 'Montant (FCFA)',     width: this.contentW - 320, align: 'right' },
      ], [
        ['Chiffre d\'affaires (payées)',  String(paid.length),    totalCA.toLocaleString('fr-FR')],
        ['Montant impayé',                String(unpaid.length),  totalImpaye.toLocaleString('fr-FR')],
        ['Acomptes versés',               String(partial.length), totalAcompte.toLocaleString('fr-FR')],
        ['Paiements en attente',          String(pending.length), '—'],
        [`Taux de recouvrement`,          '',                     `${tauxRecouv} %`],
      ]);

      // Répartition par type de course
      y += 14;
      y = this.drawSectionTitle(doc, y, 'Répartition par type de course');
      y = this.drawTable(doc, y, [
        { label: 'Type de course',  width: 200 },
        { label: 'Nb courses',      width: 80,  align: 'right' },
        { label: '% du total',      width: this.contentW - 280, align: 'right' },
      ], [...tripTypeBuckets.entries()].map(([type, count]) => [
        type,
        String(count),
        `${((count / rows.length) * 100).toFixed(1)} %`,
      ]));

      // ════════════════════════════════════════════════════════════════
      // PAGE 2 — Chauffeurs + Zones
      // ════════════════════════════════════════════════════════════════
      doc.addPage();
      y = this.M;

      y = this.drawSectionTitle(doc, y, 'Meilleurs chauffeurs (par CA encaissé)');
      if (topDrivers.length === 0) {
        doc.fillColor('#888').font('Helvetica').fontSize(9)
          .text('Aucune course avec chauffeur assigné.', this.M, y);
        y += 16;
      } else {
        y = this.drawTable(doc, y, [
          { label: 'Chauffeur',          width: 160 },
          { label: 'Courses',            width: 60,  align: 'right' },
          { label: 'CA encaissé (FCFA)', width: 140, align: 'right' },
          { label: 'Impayé (FCFA)',      width: this.contentW - 360, align: 'right' },
        ], topDrivers.map(d => [
          d.name,
          String(d.rides),
          d.ca.toLocaleString('fr-FR'),
          d.impaye > 0 ? d.impaye.toLocaleString('fr-FR') : '—',
        ]));
      }

      y += 16;
      y = this.drawSectionTitle(doc, y, 'Zones de départ les plus actives');
      if (topZones.length === 0) {
        doc.fillColor('#888').font('Helvetica').fontSize(9)
          .text('Aucune donnée de zone.', this.M, y);
        y += 16;
      } else {
        y = this.drawTable(doc, y, [
          { label: 'Zone de départ',     width: this.contentW - 180 },
          { label: 'Courses',            width: 80, align: 'right' },
          { label: 'CA encaissé (FCFA)', width: 100, align: 'right' },
        ], topZones.map(([zone, stats]) => [
          zone,
          String(stats.rides),
          stats.ca.toLocaleString('fr-FR'),
        ]));
      }

      // ════════════════════════════════════════════════════════════════
      // PAGE 3 — Courses impayées avec contacts
      // ════════════════════════════════════════════════════════════════
      doc.addPage();
      y = this.M;

      // Bandeau rouge
      doc.rect(0, 0, this.PAGE_W, 40).fill(this.RED);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(12)
        .text(
          `Courses impayées — contacts pour suivi (${unpaidWithContacts.length})`,
          this.M, 12,
        );
      y = 54;

      if (unpaidWithContacts.length === 0) {
        doc.fillColor(this.GREEN).font('Helvetica-Bold').fontSize(11)
          .text('Aucune course impayée dans cet archivage.', this.M, y, { width: this.contentW });
      } else {
        y = this.drawTable(doc, y, [
          { label: 'Code',        width: 68 },
          { label: 'Date',        width: 100 },
          { label: 'Client',      width: 110 },
          { label: 'Téléphone',   width: 85 },
          { label: 'Email',       width: 115 },
          { label: 'Chauffeur',   width: 90 },
          { label: 'Montant',     width: this.contentW - 568, align: 'right' },
        ], unpaidWithContacts.map(r => [
          r.code,
          new Date(r.pickupDateTime).toLocaleString('fr-FR'),
          `${r.clientFirstName} ${r.clientLastName}`,
          r.clientPhone || '—',
          r.clientEmail || '—',
          r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : '—',
          `${Number(r.amount).toLocaleString('fr-FR')} FCFA`,
        ]), { headerBg: this.RED, fontSize: 7.5, rowHeight: 16 });
      }

      // Pied de page
      doc.fontSize(7.5).fillColor('#aaa').font('Helvetica').text(
        `WEND'D Transport — Document confidentiel — ${generatedAt.toLocaleString('fr-FR')}`,
        this.M, doc.page.height - 30,
        { align: 'center', width: this.contentW },
      );
      doc.end();
    });
  }
}