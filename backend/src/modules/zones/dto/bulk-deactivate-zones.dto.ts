import { IsArray, IsUUID } from 'class-validator';

export class BulkDeactivateZonesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  zoneIds: string[];
}
