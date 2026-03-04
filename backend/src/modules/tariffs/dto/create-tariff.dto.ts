import { IsUUID, IsNumber, IsPositive, IsOptional, IsBoolean } from 'class-validator';

export class CreateTariffDto {
  @IsUUID()
  zoneFromId: string;

  @IsUUID()
  zoneToId: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
