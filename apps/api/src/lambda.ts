import { Handler } from "aws-lambda";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";
import { AppModule } from "./app.module";
import serverlessExpress from "@vendia/serverless-express";

let cachedHandler: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  const app = express();

  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(app),
    { bufferLogs: true }
  );

  nestApp.setGlobalPrefix("v1");
  await nestApp.init();

  // serverlessExpress() egy Lambda handler-t ad vissza
  return serverlessExpress({ app });
}

export const handler: Handler = async (event, context, callback) => {
  cachedHandler = cachedHandler ?? (await bootstrap());
  return cachedHandler(event, context, callback);
};
