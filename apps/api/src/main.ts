import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");

  app.enableCors({
    origin: ["http://localhost:3000"],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: ["http://localhost:3000"],
    credentials: true,
  });

  // Swagger hanya aktif di development
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Korea LMS API")
      .setDescription("API Learning Management System persiapan EPS-TOPIK")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    const document = () => SwaggerModule.createDocument(app, config);

    SwaggerModule.setup("docs", app, document);
  }

  await app.listen(process.env.PORT ?? 3005);
}

bootstrap();
