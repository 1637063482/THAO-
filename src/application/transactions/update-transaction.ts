import { restoreTransaction, softDeleteTransaction, updateTransaction, type Transaction, type TransactionChanges } from "../../domain/transaction";
export interface TransactionUpdater { save(transaction:Transaction):Promise<Transaction>; }
export function updateTransactionUseCase(store:TransactionUpdater,t:Transaction,v:number,c:TransactionChanges,a:string,n:string){return store.save(updateTransaction(t,v,c,a,n));}
export function deleteTransactionUseCase(store:TransactionUpdater,t:Transaction,v:number,a:string,n:string){return store.save(softDeleteTransaction(t,v,a,n));}
export function restoreTransactionUseCase(store:TransactionUpdater,t:Transaction,v:number,a:string,n:string){return store.save(restoreTransaction(t,v,a,n));}
