import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: ["http://localhost:5173"], // frontend (ex: Vite)
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        }),
    );

    await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
