import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
