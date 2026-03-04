import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { Driver } from '../modules/drivers/entities/driver.entity';
import { Zone } from '../modules/zones/entities/zone.entity';
import { Tariff } from '../modules/tariffs/entities/tariff.entity';
import { Reservation } from '../modules/reservations/entities/reservation.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { EmailLog } from '../modules/notifications/entities/email-log.entity';
import { Role } from '../common/enums/role.enum';
import { DriverStatus } from '../common/enums/driver-status.enum';
import { TripType } from '../common/enums/trip-type.enum';
import { ReservationStatus } from '../common/enums/reservation-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Language } from '../common/enums/language.enum';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'Transport',
  entities: [User, Driver, Zone, Tariff, Reservation, RefreshToken, EmailLog],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('✅ Connected to database');

  const userRepo = dataSource.getRepository(User);
  const driverRepo = dataSource.getRepository(Driver);
  const zoneRepo = dataSource.getRepository(Zone);
  const tariffRepo = dataSource.getRepository(Tariff);
  const reservationRepo = dataSource.getRepository(Reservation);

  console.log('🧹 Cleaning existing data...');
  await dataSource.query('TRUNCATE TABLE reservations, tariffs, drivers, zones, refresh_tokens, email_logs, users RESTART IDENTITY CASCADE');
  console.log('✅ Data cleaned');

  console.log('👤 Creating users...');
  const adminPassword = await argon2.hash('Admin_VTC_2024!');
  const driver1Password = await argon2.hash('Driver_2024!');
  const driver2Password = await argon2.hash('Driver_2024!');

  const admin = userRepo.create({
    email: 'admin@vtcdakar.com',
    password: adminPassword,
    role: Role.ADMIN,
    firstName: 'Admin',
    lastName: 'VTC',
    isActive: true,
  });
  const savedAdmin = await userRepo.save(admin);

  const driverUser1 = userRepo.create({
    email: 'moussa.diallo@vtcdakar.com',
    password: driver1Password,
    role: Role.DRIVER,
    firstName: 'Moussa',
    lastName: 'Diallo',
    isActive: true,
  });
  const savedDriverUser1 = await userRepo.save(driverUser1);

  const driverUser2 = userRepo.create({
    email: 'fatou.ndiaye@vtcdakar.com',
    password: driver2Password,
    role: Role.DRIVER,
    firstName: 'Fatou',
    lastName: 'Ndiaye',
    isActive: true,
  });
  const savedDriverUser2 = await userRepo.save(driverUser2);
  console.log('✅ Users created');

  console.log('🚘 Creating drivers...');
  const driver1 = driverRepo.create({
    firstName: 'Moussa',
    lastName: 'Diallo',
    phone: '+221771234567',
    vehicleType: 'Toyota Land Cruiser',
    vehiclePlate: 'DK-1234-AA',
    email: 'moussa.diallo@vtcdakar.com',
    status: DriverStatus.EN_COURSE, // VTC-TEST1 ASSIGNEE lui est rattachée
    userId: savedDriverUser1.id,
    isActive: true,
  });
  const savedDriver1 = await driverRepo.save(driver1);

  const driver2 = driverRepo.create({
    firstName: 'Fatou',
    lastName: 'Ndiaye',
    phone: '+221779876543',
    vehicleType: 'Mercedes Vito',
    vehiclePlate: 'DK-5678-BB',
    email: 'fatou.ndiaye@vtcdakar.com',
    status: DriverStatus.DISPONIBLE,
    userId: savedDriverUser2.id,
    isActive: true,
  });
  const savedDriver2 = await driverRepo.save(driver2);

  const driver3 = driverRepo.create({
    firstName: 'Ibrahima',
    lastName: 'Sow',
    phone: '+221766112233',
    vehicleType: 'Hyundai H1',
    vehiclePlate: 'DK-9012-CC',
    email: null,
    status: DriverStatus.HORS_LIGNE,
    isActive: true,
  });
  await driverRepo.save(driver3);
  console.log('✅ Drivers created');

  console.log('🗺️  Creating zones...');
  const zoneNames = [
    'AIBD (Aéroport)',
    'Almadies',
    'Plateau',
    'Saly',
    'Mbour',
    'Point E',
    'Mermoz',
    'Liberté 6',
    'Parcelles Assainies',
    'Thiès',
  ];

  const zones: Zone[] = [];
  for (const name of zoneNames) {
    const zone = zoneRepo.create({ name, isActive: true });
    zones.push(await zoneRepo.save(zone));
  }

  const zoneMap = zones.reduce((acc, z) => ({ ...acc, [z.name]: z }), {} as Record<string, Zone>);
  console.log('✅ Zones created');

  console.log('💰 Creating tariffs...');
  const tariffData = [
    { from: 'AIBD (Aéroport)', to: 'Almadies', price: 15000 },
    { from: 'AIBD (Aéroport)', to: 'Plateau', price: 18000 },
    { from: 'AIBD (Aéroport)', to: 'Saly', price: 35000 },
    { from: 'AIBD (Aéroport)', to: 'Mbour', price: 30000 },
    { from: 'AIBD (Aéroport)', to: 'Point E', price: 16000 },
    { from: 'AIBD (Aéroport)', to: 'Mermoz', price: 15000 },
    { from: 'AIBD (Aéroport)', to: 'Liberté 6', price: 17000 },
    { from: 'AIBD (Aéroport)', to: 'Parcelles Assainies', price: 19000 },
    { from: 'AIBD (Aéroport)', to: 'Thiès', price: 12000 },
    { from: 'Almadies', to: 'AIBD (Aéroport)', price: 15000 },
    { from: 'Plateau', to: 'AIBD (Aéroport)', price: 18000 },
    { from: 'Saly', to: 'AIBD (Aéroport)', price: 35000 },
    { from: 'Mbour', to: 'AIBD (Aéroport)', price: 30000 },
    { from: 'Point E', to: 'AIBD (Aéroport)', price: 16000 },
    { from: 'Mermoz', to: 'AIBD (Aéroport)', price: 15000 },
    { from: 'Liberté 6', to: 'AIBD (Aéroport)', price: 17000 },
    { from: 'Parcelles Assainies', to: 'AIBD (Aéroport)', price: 19000 },
    { from: 'Thiès', to: 'AIBD (Aéroport)', price: 12000 },
  ];

  for (const t of tariffData) {
    const tariff = tariffRepo.create({
      zoneFromId: zoneMap[t.from].id,
      zoneToId: zoneMap[t.to].id,
      price: t.price,
      isActive: true,
    });
    await tariffRepo.save(tariff);
  }
  console.log('✅ Tariffs created');

  console.log('📋 Creating test reservations...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(6, 30, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);

  const reservations = [
    {
      code: 'VTC-TEST1',
      clientFirstName: 'Amadou',
      clientLastName: 'Ba',
      clientEmail: 'test.client@gmail.com',
      clientPhone: '+221771112233',
      tripType: TripType.RETOUR_SIMPLE,
      pickupZoneId: zoneMap['AIBD (Aéroport)'].id,
      dropoffZoneId: zoneMap['Almadies'].id,
      pickupDateTime: tomorrow,
      passengers: 2,
      notes: 'Vol AF718 - bagages supplémentaires',
      status: ReservationStatus.ASSIGNEE,
      paymentStatus: PaymentStatus.EN_ATTENTE,
      amount: 15000,
      language: Language.FR,
      driverId: savedDriver1.id,
      cancelToken: 'cancel-token-test-1',
      cancelTokenExpiresAt: tomorrow,
    },
    {
      code: 'VTC-TEST2',
      clientFirstName: 'John',
      clientLastName: 'Smith',
      clientEmail: 'john.smith@example.com',
      clientPhone: '+33612345678',
      tripType: TripType.ALLER_SIMPLE,
      pickupZoneId: zoneMap['Plateau'].id,
      dropoffZoneId: zoneMap['AIBD (Aéroport)'].id,
      pickupDateTime: nextWeek,
      passengers: 1,
      flightNumber: 'TK699',
      notes: 'English-speaking client',
      status: ReservationStatus.EN_ATTENTE,
      paymentStatus: PaymentStatus.EN_ATTENTE,
      amount: 18000,
      language: Language.EN,
      cancelToken: 'cancel-token-test-2',
      cancelTokenExpiresAt: nextWeek,
    },
    {
      code: 'VTC-TEST3',
      clientFirstName: 'Mariama',
      clientLastName: 'Diop',
      clientEmail: 'mariama.diop@gmail.com',
      clientPhone: '+221779998877',
      tripType: TripType.ALLER_RETOUR,
      pickupZoneId: zoneMap['Mermoz'].id,
      dropoffZoneId: zoneMap['AIBD (Aéroport)'].id,
      pickupDateTime: nextWeek,
      returnDateTime: new Date(nextWeek.getTime() + 7 * 24 * 3600000),
      passengers: 3,
      status: ReservationStatus.EN_ATTENTE,
      paymentStatus: PaymentStatus.EN_ATTENTE,
      amount: 15000,
      language: Language.FR,
      cancelToken: 'cancel-token-test-3',
      cancelTokenExpiresAt: nextWeek,
    },
    {
      code: 'VTC-TEST4',
      clientFirstName: 'Pierre',
      clientLastName: 'Martin',
      clientEmail: 'pierre.martin@outlook.fr',
      clientPhone: '+33698765432',
      tripType: TripType.RETOUR_SIMPLE,
      pickupZoneId: zoneMap['AIBD (Aéroport)'].id,
      dropoffZoneId: zoneMap['Saly'].id,
      pickupDateTime: yesterday,
      passengers: 2,
      status: ReservationStatus.TERMINEE,
      paymentStatus: PaymentStatus.PAIEMENT_COMPLET,
      amount: 35000,
      language: Language.FR,
      driverId: savedDriver2.id,
      completedAt: yesterday,
      cancelToken: null,
    },
    {
      code: 'VTC-TEST5',
      clientFirstName: 'Aïssatou',
      clientLastName: 'Fall',
      clientEmail: 'aissatou.fall@gmail.com',
      clientPhone: '+221775554433',
      tripType: TripType.ALLER_SIMPLE,
      pickupZoneId: zoneMap['Liberté 6'].id,
      dropoffZoneId: zoneMap['AIBD (Aéroport)'].id,
      pickupDateTime: yesterday,
      passengers: 1,
      status: ReservationStatus.ANNULEE,
      paymentStatus: PaymentStatus.EN_ATTENTE,
      amount: 17000,
      language: Language.FR,
      cancelToken: null,
    },
  ];

  for (const r of reservations) {
    const res = reservationRepo.create(r as any);
    await reservationRepo.save(res);
  }
  console.log('✅ Test reservations created');

  await dataSource.destroy();
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📌 Test credentials:');
  console.log('   Admin    → admin@vtcdakar.com / Admin_VTC_2024!');
  console.log('   Driver 1 → moussa.diallo@vtcdakar.com / Driver_2024!');
  console.log('   Driver 2 → fatou.ndiaye@vtcdakar.com / Driver_2024!');
  console.log('\n📌 Test reservation codes: VTC-TEST1 → VTC-TEST5');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
