import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';

import { CreateTestAttemptDto } from './dto/create-test-attempt.dto';
import { SubmitTestAttemptDto } from './dto/submit-test-attempt.dto';
import { UpdateTestAttemptDto } from './dto/update-test-attempt.dto';
import { TestAttemptsService } from './test-attempts.service';

/**
 * Every route works on the caller's own attempts. The user id comes from the
 * token and never from the body, so there is no request shape that reaches
 * somebody else's attempt.
 */
@ApiTags('Test Attempts')
@ApiBearerAuth()
@Controller('test-attempts')
@UseGuards(JwtAuthenticationGuard)
export class TestAttemptsController {
  constructor(private readonly testAttemptsService: TestAttemptsService) {}

  @ApiOperation({
    summary: 'Start an attempt. The server sets the deadline, not the client.',
  })
  @Post()
  start(@Req() req: RequestWithUser, @Body() dto: CreateTestAttemptDto) {
    return this.testAttemptsService.start(req.user.id, dto);
  }

  @ApiOperation({
    summary: 'Save progress. Rejected with 409 if another tab wrote first.',
  })
  @Patch(':id')
  save(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTestAttemptDto,
  ) {
    return this.testAttemptsService.saveProgress(req.user.id, id, dto);
  }

  @ApiOperation({ summary: 'Submit and grade. The score is settled here.' })
  @Post(':id/submit')
  submit(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitTestAttemptDto,
  ) {
    return this.testAttemptsService.submit(req.user.id, id, dto);
  }

  @ApiOperation({
    summary: 'Every course this learner has touched, most recent first',
  })
  // Declared before the query route so 'progress' is never read as a value
  // of one.
  @Get('progress')
  progress(@Req() req: RequestWithUser) {
    return this.testAttemptsService.progress(req.user.id);
  }

  @ApiOperation({ summary: "This learner's attempts at one course" })
  @Get()
  findByCourse(
    @Req() req: RequestWithUser,
    @Query('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.testAttemptsService.findByCourse(req.user.id, courseId);
  }
}
