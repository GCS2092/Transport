import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAll() {
    return this.settingsService.getAll();
  }

  @Get(':key')
  async get(@Param('key') key: string) {
    const value = await this.settingsService.get(key);
    return { key, value };
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settingsService.set(key, dto);
  }

  // ── Contacts ──────────────────────────────────────────────────────────
  @Get('contacts/all')
  async getAllContacts() {
    return this.settingsService.getAllContacts();
  }

  @Post('contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createContact(@Body() dto: CreateContactDto) {
    return this.settingsService.createContact(dto);
  }

  @Put('contacts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateContact(@Param('id') id: string, @Body() dto: Partial<CreateContactDto>) {
    return this.settingsService.updateContact(id, dto);
  }

  @Delete('contacts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteContact(@Param('id') id: string) {
    await this.settingsService.deleteContact(id);
    return { success: true };
  }

  // ── FAQ ───────────────────────────────────────────────────────────────
  @Get('faqs/all')
  async getAllFaqs(@Query('language') language?: string) {
    return this.settingsService.getAllFaqs(language);
  }

  @Post('faqs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createFaq(@Body() dto: CreateFaqDto) {
    return this.settingsService.createFaq(dto);
  }

  @Put('faqs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateFaq(@Param('id') id: string, @Body() dto: Partial<CreateFaqDto>) {
    return this.settingsService.updateFaq(id, dto);
  }

  @Delete('faqs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteFaq(@Param('id') id: string) {
    await this.settingsService.deleteFaq(id);
    return { success: true };
  }
}
