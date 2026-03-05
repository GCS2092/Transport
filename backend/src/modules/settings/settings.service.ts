import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
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
}
