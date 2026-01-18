"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const express_1 = __importDefault(require("express"));
const app_module_1 = require("./app.module");
const serverless_express_1 = __importDefault(require("@vendia/serverless-express"));
let cachedHandler;
async function bootstrap() {
    const app = (0, express_1.default)();
    const nestApp = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(app), { bufferLogs: true });
    nestApp.setGlobalPrefix("v1");
    await nestApp.init();
    return (0, serverless_express_1.default)({ app });
}
const handler = async (event, context, callback) => {
    cachedHandler = cachedHandler ?? (await bootstrap());
    return cachedHandler(event, context, callback);
};
exports.handler = handler;
//# sourceMappingURL=lambda.js.map