import { Handler } from "aws-lambda";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express, { Request, Response } from "express";
import { AppModule } from "./app.module";
import serverlessExpress from "@vendia/serverless-express";
import { ValidationPipe } from "@nestjs/common";



let cachedHandler: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  const app = express();

  // ✅ HARD DEBUG route - ha ez sem működik, akkor nem a jó handler fut
  app.get("/__ping", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true, from: "raw-express" });
  });

  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(app), {
    bufferLogs: true,
  });

  // Nest routes:
  nestApp.setGlobalPrefix("v1");
	nestApp.enableCors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
  nestApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await nestApp.init();

  return serverlessExpress({ app });
}

export const handler: Handler = async (event, context, callback) => {
  cachedHandler = cachedHandler ?? (await bootstrap());
  return cachedHandler(event, context, callback);
};
