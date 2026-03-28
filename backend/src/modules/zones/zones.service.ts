import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Zone } from './entities/zone.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { TariffsService } from '../tariffs/tariffs.service';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone)
    private zonesRepository: Repository<Zone>,
    private tariffsService: TariffsService,
  ) {}

  // Géocode automatiquement un nom de zone via Nominatim (OpenStreetMap)
  // Appelé à la création ET à la mise à jour si pas de coordonnées fournies
  private async geocodeZoneName(name: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // Ajoute "Dakar, Sénégal" pour améliorer la précision
      const query = `${name}, Dakar, Sénégal`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WenddTransport/1.0 (transport@wendd.com)',
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data || data.length === 0) return null;

      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    } catch (error) {
      console.warn(`Geocoding failed for zone "${name}":`, error);
      return null;
    }
  }

  async findAll(): Promise<Zone[]> {
    return this.zonesRepository.find({ order: { name: 'ASC' } });
  }

  async findActive(): Promise<Zone[]> {
    return this.zonesRepository.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Zone> {
    const zone = await this.zonesRepository.findOne({ where: { id } });
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  async create(dto: CreateZoneDto): Promise<Zone> {
    const existing = await this.zonesRepository.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Zone name already exists');

    let latitude = dto.latitude;
    let longitude = dto.longitude;

    // Si pas de coordonnées fournies → géocoder automatiquement
    if (!latitude || !longitude) {
      const coords = await this.geocodeZoneName(dto.name);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    const zone = this.zonesRepository.create({ ...dto, latitude, longitude });
    return this.zonesRepository.save(zone);
  }

  async update(id: string, dto: Partial<CreateZoneDto>): Promise<Zone> {
    const existing = await this.findById(id);

    let latitude = dto.latitude ?? existing.latitude;
    let longitude = dto.longitude ?? existing.longitude;

    // Si le nom change et qu'il n'y a pas de nouvelles coordonnées → regéocoder
    if (dto.name && dto.name !== existing.name && !dto.latitude && !dto.longitude) {
      const coords = await this.geocodeZoneName(dto.name);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    // Si toujours pas de coordonnées → essayer de géocoder avec le nom actuel
    if (!latitude || !longitude) {
      const nameToGeocode = dto.name || existing.name;
      const coords = await this.geocodeZoneName(nameToGeocode);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    await this.zonesRepository.update(id, { ...dto, latitude, longitude });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.zonesRepository.update(id, { isActive: false });
  }

  /** Désactive les tarifs liés puis met les zones en inactif (soft delete). */
  async bulkDeactivate(zoneIds: string[]): Promise<{ deactivatedZoneIds: string[] }> {
    const unique = [...new Set(zoneIds)];
    if (!unique.length) return { deactivatedZoneIds: [] };

    for (const id of unique) {
      await this.findById(id);
    }

    await this.tariffsService.deactivateByZoneIds(unique);
    await this.zonesRepository.update({ id: In(unique) }, { isActive: false });

    return { deactivatedZoneIds: unique };
  }

  // Géocoder toutes les zones qui n'ont pas encore de coordonnées
  // Utile pour migrer les zones existantes — appeler une seule fois
  async geocodeAllMissingCoords(): Promise<{ updated: number; failed: string[] }> {
    const zones = await this.zonesRepository.find();
    const missingCoords = zones.filter(z => !z.latitude || !z.longitude);

    let updated = 0;
    const failed: string[] = [];

    for (const zone of missingCoords) {
      // Respecter la limite Nominatim : 1 requête/seconde
      await new Promise(resolve => setTimeout(resolve, 1100));

      const coords = await this.geocodeZoneName(zone.name);
      if (coords) {
        await this.zonesRepository.update(zone.id, coords);
        updated++;
      } else {
        failed.push(zone.name);
      }
    }

    return { updated, failed };
  }
}