import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { RbacSeeder } from '../seeders/rbac.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const rbacSeeder = app.get(RbacSeeder);

  try {
    await rbacSeeder.seedAll();
    console.log('✅ RBAC seeding completed successfully');
  } catch (error) {
    console.error('❌ Error during RBAC seeding:', error);
  } finally {
    await app.close();
  }
}

bootstrap();