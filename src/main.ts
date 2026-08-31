import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

function parseCorsOrigins(rawOrigins?: string): string[] {
    if (!rawOrigins) {
        return ["http://localhost:5173"];
    }

    return rawOrigins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: parseCorsOrigins(process.env.CORS_ORIGINS),
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
