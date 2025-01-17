import { SYSTEM_ASSET_ID, Transaction } from '@galacticcouncil/sdk';
import type { RuntimeDispatchInfo } from '@polkadot/types/interfaces';
import type { ISubmittableResult } from '@polkadot/types/types';
import { EventRecord } from '@polkadot/types/interfaces/system';
import { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import { getWalletBySource } from '@talismn/connect-wallets';
import { Account, chainCursor, xChainCursor } from '../db';

import { timeout } from 'rxjs/operators';

export async function getFeePaymentAsset(account: Account): Promise<string> {
  const api = chainCursor.deref().api;
  const feeAsset = await api.query.multiTransactionPayment.accountCurrencyMap(account.address);
  return feeAsset.toHuman() ? feeAsset.toString() : SYSTEM_ASSET_ID;
}

export async function getPaymentInfo(transaction: Transaction, account: Account): Promise<RuntimeDispatchInfo> {
  const api = chainCursor.deref().api;
  const transactionExtrinsic = api.tx(transaction.hex);
  return await transactionExtrinsic.paymentInfo(account.address);
}

export function estimatePaymentInfo(account: Account): Promise<RuntimeDispatchInfo> {
  const api = chainCursor.deref().api;
  return api.tx.balances.transfer(account.address, 1).paymentInfo(account.address);
}

export async function signAndSend(
  transaction: Transaction,
  account: Account,
  onStatusChange: (status: ISubmittableResult) => void,
  onError: (error: unknown) => void
) {
  const api = chainCursor.deref().api;
  const transactionExtrinsic = api.tx(transaction.hex);
  const wallet = getWalletBySource(account.provider);
  await wallet.enable('HydraDX');
  const nextNonce = await api.rpc.system.accountNextIndex(account.address);

  transactionExtrinsic
    .signAndSend(account.address, { signer: wallet.signer, nonce: nextNonce }, onStatusChange)
    .catch((error: any) => {
      onError(error);
    });
}

export async function signAndSendOb(
  extrinsic: SubmittableExtrinsic,
  account: Account,
  onStatusChange: (status: ISubmittableResult) => void,
  onError: (error: unknown) => void
) {
  const wallet = getWalletBySource(account.provider);
  await wallet.enable('HydraDX');

  const o: any = extrinsic.signAndSend(account.address, { signer: wallet.signer });
  o.subscribe({
    next: onStatusChange,
    error: (err: any) => onError(err),
    complete: () => console.log('Observer got a complete notification'),
  });
}

export function subscribeBridgeEvents(
  chain: any,
  onStatusChange: (events: EventRecord[]) => void,
  onError: (error: unknown) => void
) {
  const bridge = xChainCursor.deref().bridge;
  const adapter = bridge.findAdapter(chain);
  const api = adapter.getApi();

  const o: any = api.query.system.events();
  return o.pipe(timeout(60 * 1000)).subscribe({
    next: onStatusChange,
    error: (err: any) => onError(err),
    complete: () => console.log('Observer got a complete notification'),
  });
}
