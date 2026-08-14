import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import JwtAdminAuthenticationGuard from 'src/authentication/guard/jwt-admin-authentication.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAdminAuthenticationGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary:
      'Overview stats: total courses, users, organizations, completed enrollments',
  })
  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @ApiOperation({
    summary: 'Completed enrollments per day for the last N days',
  })
  @Get('enrollment-trend')
  getEnrollmentTrend(@Query('days') days?: string) {
    return this.dashboardService.getEnrollmentTrend(days ? +days : 30);
  }
}
