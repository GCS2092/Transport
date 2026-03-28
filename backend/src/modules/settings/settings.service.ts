import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { Contact } from './entities/contact.entity';
import { Faq } from './entities/faq.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { Language } from '../../common/enums/language.enum';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
    @InjectRepository(Faq)
    private faqsRepository: Repository<Faq>,
  ) {}

  async onModuleInit() {
    await this.initializeDefaultSettings();
    await this.seedContactsAndFaqsIfEmpty();
  }

  private parseLanguageParam(language?: string): Language | undefined {
    if (!language || !language.trim()) return undefined;
    const n = language.trim().toLowerCase();
    if (n === 'en') return Language.EN;
    return Language.FR;
  }

  private async initializeDefaultSettings() {
    const defaults = [
      { key: 'PRICE_ALLER_SIMPLE', value: '25000', description: 'Prix fixe pour aller simple (FCFA)' },
      { key: 'PRICE_RETOUR_SIMPLE', value: '25000', description: 'Prix fixe pour retour simple (FCFA)' },
      { key: 'PRICE_ALLER_RETOUR', value: '30000', description: 'Prix fixe pour aller-retour (FCFA)' },
    ];

    for (const def of defaults) {
      const existing = await this.settingsRepository.findOne({ where: { key: def.key } });
      if (!existing) {
        await this.settingsRepository.save(def);
        this.logger.log(`Initialized setting: ${def.key} = ${def.value}`);
      }
    }
  }

  private async seedContactsAndFaqsIfEmpty() {
    const nContacts = await this.contactsRepository.count();
    if (nContacts === 0) {
      const rows: Partial<Contact>[] = [
        {
          label: 'Téléphone',
          value: '+221 78 861 33 08',
          subtitle: '24h/24, 7j/7',
          href: 'tel:+221788613308',
          icon: 'phone',
          order: 0,
          active: true,
        },
        {
          label: 'WhatsApp',
          value: '+221 78 861 33 08',
          subtitle: 'Réponse immédiate',
          href: 'https://wa.me/221788613308',
          icon: 'message-circle',
          order: 1,
          active: true,
        },
        {
          label: 'Email',
          value: 'wenddtransport@gmail.com',
          subtitle: 'Réponse sous 24h',
          href: 'mailto:wenddtransport@gmail.com',
          icon: 'mail',
          order: 2,
          active: true,
        },
        {
          label: 'Adresse',
          value: 'Dakar, Sénégal',
          subtitle: 'Service dans toute la région',
          icon: 'map-pin',
          order: 3,
          active: true,
        },
        {
          label: 'Paiement Wave',
          value: '78 861 33 08',
          subtitle: 'Mobile money — Wave',
          order: 10,
          active: true,
        },
        {
          label: 'Paiement Orange Money',
          value: '77 987 65 43',
          subtitle: 'Mobile money — Orange',
          order: 11,
          active: true,
        },
        {
          label: 'Paiement Free Money',
          value: '76 543 21 09',
          subtitle: 'Mobile money — Free',
          order: 12,
          active: true,
        },
      ];
      await this.contactsRepository.save(rows.map(r => this.contactsRepository.create(r)));
      this.logger.log('Seeded default contacts');
    }

    const nFaqs = await this.faqsRepository.count();
    if (nFaqs === 0) {
      const frFaqs: { q: string; a: string }[] = [
        { q: 'Comment réserver ?', a: "Remplissez le formulaire en 2 étapes sur la page d'accueil. Confirmation immédiate par email avec votre code VTC." },
        { q: 'Puis-je annuler ma réservation ?', a: "Oui, annulation gratuite jusqu'à 24h avant la prise en charge. Utilisez le token reçu par email." },
        { q: 'Les prix sont-ils fixes ?', a: 'Absolument. Pas de surprise, le prix affiché est le prix final, sans frais cachés.' },
        { q: 'Quels moyens de paiement ?', a: 'Espèces, carte bancaire et mobile money (Wave, Orange Money).' },
        { q: "Couvrez-vous l'aéroport AIBD ?", a: 'Oui, transferts depuis et vers AIBD 24h/24, 7j/7.' },
      ];
      const enFaqs: { q: string; a: string }[] = [
        { q: 'How to book?', a: 'Fill in the 2-step form on the homepage. Immediate email confirmation with your VTC code.' },
        { q: 'Can I cancel?', a: 'Yes, free cancellation up to 24h before pickup. Use the token received by email.' },
        { q: 'Are prices fixed?', a: 'Absolutely. No surprises — the displayed price is the final price, no hidden fees.' },
        { q: 'Payment methods?', a: 'Cash, bank card, and mobile money (Wave, Orange Money).' },
        { q: 'Do you cover AIBD airport?', a: 'Yes, transfers to and from AIBD 24/7.' },
      ];
      const faqRows: Partial<Faq>[] = [
        ...frFaqs.map((f, i) => ({ question: f.q, answer: f.a, language: Language.FR, order: i, active: true })),
        ...enFaqs.map((f, i) => ({ question: f.q, answer: f.a, language: Language.EN, order: i, active: true })),
      ];
      await this.faqsRepository.save(faqRows.map(f => this.faqsRepository.create(f)));
      this.logger.log('Seeded default FAQs');
    }
  }

  async get(key: string): Promise<string | null> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting ? setting.value : null;
  }

  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.get(key);
    return value ? parseInt(value, 10) : defaultValue;
  }

  async set(key: string, dto: UpdateSettingDto): Promise<Setting> {
    let setting = await this.settingsRepository.findOne({ where: { key } });
    
    if (setting) {
      setting.value = dto.value;
      if (dto.description) setting.description = dto.description;
    } else {
      setting = this.settingsRepository.create({ key, ...dto });
    }

    return this.settingsRepository.save(setting);
  }

  async getAll(): Promise<Setting[]> {
    return this.settingsRepository.find({ order: { key: 'ASC' } });
  }

  async getPriceForTripType(tripType: string): Promise<number> {
    const keyMap = {
      'ALLER_SIMPLE': 'PRICE_ALLER_SIMPLE',
      'RETOUR_SIMPLE': 'PRICE_RETOUR_SIMPLE',
      'ALLER_RETOUR': 'PRICE_ALLER_RETOUR',
    };

    const key = keyMap[tripType];
    if (!key) {
      this.logger.warn(`Unknown trip type: ${tripType}, using default 25000`);
      return 25000;
    }

    return this.getNumber(key, 25000);
  }

  // ── Contacts (public vs admin) ────────────────────────────────────────
  /** Affichage site public : contacts actifs uniquement. */
  async getPublicContacts(): Promise<Contact[]> {
    return this.contactsRepository.find({ where: { active: true }, order: { order: 'ASC' } });
  }

  /** Backward compat — même que getPublicContacts. */
  async getAllContacts(): Promise<Contact[]> {
    return this.getPublicContacts();
  }

  /** Admin : tous les contacts (actifs et inactifs). */
  async getAllContactsAdmin(): Promise<Contact[]> {
    return this.contactsRepository.find({ order: { order: 'ASC' } });
  }

  async createContact(dto: CreateContactDto): Promise<Contact> {
    const contact = this.contactsRepository.create(dto);
    return this.contactsRepository.save(contact);
  }

  async updateContact(id: string, dto: Partial<CreateContactDto>): Promise<Contact> {
    await this.contactsRepository.update(id, dto);
    return this.contactsRepository.findOne({ where: { id } });
  }

  async deleteContact(id: string): Promise<void> {
    await this.contactsRepository.delete(id);
  }

  // ── FAQ (public vs admin) ───────────────────────────────────────────
  /** Site public : FAQ actives, langue optionnelle (fr|en). */
  async getPublicFaqs(language?: string): Promise<Faq[]> {
    const lang = this.parseLanguageParam(language);
    const where: { active: boolean; language?: Language } = { active: true };
    if (lang !== undefined) where.language = lang;
    return this.faqsRepository.find({ where, order: { order: 'ASC' } });
  }

  /** Admin : toutes les FAQ, filtre langue optionnel. */
  async getAllFaqsAdmin(language?: string): Promise<Faq[]> {
    const lang = this.parseLanguageParam(language);
    if (lang !== undefined) {
      return this.faqsRepository.find({ where: { language: lang }, order: { order: 'ASC' } });
    }
    return this.faqsRepository.find({ order: { order: 'ASC' } });
  }

  async createFaq(dto: CreateFaqDto): Promise<Faq> {
    const faq = this.faqsRepository.create(dto);
    return this.faqsRepository.save(faq);
  }

  async updateFaq(id: string, dto: Partial<CreateFaqDto>): Promise<Faq> {
    await this.faqsRepository.update(id, dto);
    return this.faqsRepository.findOne({ where: { id } });
  }

  async deleteFaq(id: string): Promise<void> {
    await this.faqsRepository.delete(id);
  }
}
