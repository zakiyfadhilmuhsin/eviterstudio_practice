import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SMTPEmailService } from './smtp-email.service';
import { EmailService } from './interfaces/email.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'EmailService',
      useClass: SMTPEmailService,
    },
    // Alternative provider pattern for direct injection
    SMTPEmailService,
  ],
  exports: ['EmailService', SMTPEmailService],
})
export class EmailModule {}