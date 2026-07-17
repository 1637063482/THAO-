import { createTransaction, type CreateTransactionInput, type Transaction } from "../../domain/transaction";
export interface TransactionWriter { create(transaction: Transaction): Promise<Transaction>; }
export function createTransactionUseCase(writer:TransactionWriter,input:CreateTransactionInput,now:string){return writer.create(createTransaction(input,now));}
