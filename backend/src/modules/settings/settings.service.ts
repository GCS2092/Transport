import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { Contact } from './entities/contact.entity';
import { Faq } from './entities/faq.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateFaqDto } from './dto/create-faq.dto';

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
    // Initialiser les prix par défaut si non existants
    await this.initializeDefaultSettings();
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

  // ── Contacts ──────────────────────────────────────────────────────────
  async getAllContacts(): Promise<Contact[]> {
    return this.contactsRepository.find({ where: { active: true }, order: { order: 'ASC' } });
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

  // ── FAQ ───────────────────────────────────────────────────────────────
  async getAllFaqs(language?: string): Promise<Faq[]> {
    const where: any = { active: true };
    if (language) where.language = language;
    return this.faqsRepository.find({ where, order: { order: 'ASC' } });
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
