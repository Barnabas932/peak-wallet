import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { WalletModule } from "./wallet/wallet.module";
import { TransactionsModule } from "./transactions/transactions.module";

@Module({
  imports: [WalletModule, TransactionsModule],
  controllers: [AppController],
})
export class AppModule {}
