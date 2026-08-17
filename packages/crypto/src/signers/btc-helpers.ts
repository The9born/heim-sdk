import * as tools from "uint8array-tools";
import * as bitcoin from "bitcoinjs-lib";

import { Transaction } from "bitcoinjs-lib";
import { BufferWriter, varSliceSize } from "./bufferutils";
import { PsbtInput } from "bip174";
import { Output } from "bitcoinjs-lib/src/transaction";
import { TAGGED_HASH_PREFIXES } from "bitcoinjs-lib/src/crypto";
import { Hasher } from "../hashers";

interface PsbtCache {
  __NON_WITNESS_UTXO_TX_CACHE: Transaction[];
  __NON_WITNESS_UTXO_BUF_CACHE: Uint8Array[];
  __TX_IN_CACHE: { [index: string]: number };
  __TX: Transaction;
  __FEE_RATE?: number;
  __FEE?: bigint;
  __EXTRACTED_TX?: Transaction;
  __UNSAFE_SIGN_NONSEGWIT: boolean;
}

export const addNonWitnessTxCache = (
  cache: PsbtCache,
  input: PsbtInput,
  inputIndex: number
): void => {
  cache.__NON_WITNESS_UTXO_BUF_CACHE[inputIndex] = input.nonWitnessUtxo!;

  const tx = Transaction.fromBuffer(Buffer.from(input.nonWitnessUtxo!));
  cache.__NON_WITNESS_UTXO_TX_CACHE[inputIndex] = tx;

  const self = cache;
  const selfIndex = inputIndex;
  delete input.nonWitnessUtxo;
  Object.defineProperty(input, "nonWitnessUtxo", {
    enumerable: true,
    get(): Uint8Array {
      const buf = self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex];
      const txCache = self.__NON_WITNESS_UTXO_TX_CACHE[selfIndex];
      if (buf !== undefined) {
        return buf;
      } else {
        const newBuf = txCache.toBuffer();
        self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex] = newBuf;
        return newBuf;
      }
    },
    set(data: Uint8Array): void {
      self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex] = data;
    },
  });
};

export const nonWitnessUtxoTxFromCache = (
  cache: PsbtCache,
  input: PsbtInput,
  inputIndex: number
): Transaction => {
  const c = cache.__NON_WITNESS_UTXO_TX_CACHE;
  if (!c[inputIndex]) {
    addNonWitnessTxCache(cache, input, inputIndex);
  }
  return c[inputIndex];
};

export const getScriptAndAmountFromUtxo = (
  inputIndex: number,
  input: PsbtInput,
  cache: PsbtCache
): { script: Uint8Array; value: bigint } => {
  if (input.witnessUtxo !== undefined) {
    return {
      script: input.witnessUtxo.script,
      value: input.witnessUtxo.value,
    };
  } else if (input.nonWitnessUtxo !== undefined) {
    const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache(
      cache,
      input,
      inputIndex
    );
    const o = nonWitnessUtxoTx.outs[cache.__TX.ins[inputIndex].index];
    // @ts-ignore
    return { script: o.script, value: o.value };
  } else {
    throw new Error("Can't find pubkey in input without Utxo data");
  }
};

export const formatTaprootTransaction = (
  _psbt: Uint8Array,
  hasher: Hasher,
  leafHash: Uint8Array = undefined,
  annex: Uint8Array = undefined
): Uint8Array => {
  // TODO: currently we are only signing the first input, need to change this
  const inputIndex = 0;
  const psbt = bitcoin.Psbt.fromBuffer(Buffer.from(_psbt));
  const hashType =
    psbt.data.inputs[inputIndex].sighashType || Transaction.SIGHASH_DEFAULT;

  // @ts-ignore
  const prevOuts: Output[] = psbt.data.inputs.map((i, index) =>
    // @ts-ignore
    this.getScriptAndAmountFromUtxo(index, i, psbt.__CACHE)
  );
  const prevOutScripts = prevOuts.map((o) => o.script);
  const values = prevOuts.map((o) => o.value);
  // https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#common-signature-message
  // @ts-ignore <- field __CACHE is private
  const tx: bitcoin.Transaction = psbt.__CACHE.__TX;

  if (
    values.length !== tx.ins.length ||
    prevOutScripts.length !== tx.ins.length
  ) {
    throw new Error("Must supply prevout script and value for all inputs");
  }

  const outputType =
    hashType === Transaction.SIGHASH_DEFAULT
      ? Transaction.SIGHASH_ALL
      : hashType & Transaction.SIGHASH_OUTPUT_MASK;

  const inputType = hashType & Transaction.SIGHASH_INPUT_MASK;

  const isAnyoneCanPay = inputType === Transaction.SIGHASH_ANYONECANPAY;
  const isNone = outputType === Transaction.SIGHASH_NONE;
  const isSingle = outputType === Transaction.SIGHASH_SINGLE;

  let hashPrevouts = new Uint8Array(0);
  let hashAmounts = new Uint8Array(0);
  let hashScriptPubKeys = new Uint8Array(0);
  let hashSequences = new Uint8Array(0);
  let hashOutputs = new Uint8Array(0);

  if (!isAnyoneCanPay) {
    let bufferWriter = BufferWriter.withCapacity(36 * tx.ins.length);
    tx.ins.forEach((txIn) => {
      bufferWriter.writeSlice(txIn.hash);
      bufferWriter.writeUInt32(txIn.index);
    });
    hashPrevouts = hasher.hash(bufferWriter.end());

    bufferWriter = BufferWriter.withCapacity(8 * tx.ins.length);
    values.forEach((value) => bufferWriter.writeInt64(value));
    hashAmounts = hasher.hash(bufferWriter.end());

    bufferWriter = BufferWriter.withCapacity(
      prevOutScripts.map(varSliceSize).reduce((a, b) => a + b)
    );
    prevOutScripts.forEach((prevOutScript) =>
      bufferWriter.writeVarSlice(prevOutScript)
    );
    hashScriptPubKeys = hasher.hash(bufferWriter.end());

    bufferWriter = BufferWriter.withCapacity(4 * tx.ins.length);
    tx.ins.forEach((txIn) => bufferWriter.writeUInt32(txIn.sequence));
    hashSequences = hasher.hash(bufferWriter.end());
  }

  if (!(isNone || isSingle)) {
    if (!tx.outs.length)
      throw new Error("Add outputs to the transaction before signing.");
    const txOutsSize = tx.outs
      .map((output) => 8 + varSliceSize(output.script))
      .reduce((a, b) => a + b);
    const bufferWriter = BufferWriter.withCapacity(txOutsSize);

    tx.outs.forEach((out) => {
      bufferWriter.writeInt64(out.value);
      bufferWriter.writeVarSlice(out.script);
    });

    hashOutputs = hasher.hash(bufferWriter.end());
  } else if (isSingle && inputIndex < tx.outs.length) {
    const output = tx.outs[inputIndex];

    const bufferWriter = BufferWriter.withCapacity(
      8 + varSliceSize(output.script)
    );
    bufferWriter.writeInt64(output.value);
    bufferWriter.writeVarSlice(output.script);
    hashOutputs = hasher.hash(bufferWriter.end());
  }

  const spendType = (leafHash ? 2 : 0) + (annex ? 1 : 0);

  // Length calculation from:
  // https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#cite_note-14
  // With extension from:
  // https://github.com/bitcoin/bips/blob/master/bip-0342.mediawiki#signature-validation
  const sigMsgSize =
    174 -
    (isAnyoneCanPay ? 49 : 0) -
    (isNone ? 32 : 0) +
    (annex ? 32 : 0) +
    (leafHash ? 37 : 0);
  const sigMsgWriter = BufferWriter.withCapacity(sigMsgSize);

  sigMsgWriter.writeUInt8(hashType);
  // Transaction
  sigMsgWriter.writeInt32(tx.version);
  sigMsgWriter.writeUInt32(tx.locktime);
  sigMsgWriter.writeSlice(hashPrevouts);
  sigMsgWriter.writeSlice(hashAmounts);
  sigMsgWriter.writeSlice(hashScriptPubKeys);
  sigMsgWriter.writeSlice(hashSequences);
  if (!(isNone || isSingle)) {
    sigMsgWriter.writeSlice(hashOutputs);
  }
  // Input
  sigMsgWriter.writeUInt8(spendType);
  if (isAnyoneCanPay) {
    const input = tx.ins[inputIndex];
    sigMsgWriter.writeSlice(input.hash);
    sigMsgWriter.writeUInt32(input.index);
    sigMsgWriter.writeInt64(values[inputIndex]);
    sigMsgWriter.writeVarSlice(prevOutScripts[inputIndex]);
    sigMsgWriter.writeUInt32(input.sequence);
  } else {
    sigMsgWriter.writeUInt32(inputIndex);
  }
  if (annex) {
    const bufferWriter = BufferWriter.withCapacity(varSliceSize(annex));
    bufferWriter.writeVarSlice(annex);
    sigMsgWriter.writeSlice(hasher.hash(bufferWriter.end()));
  }
  // Output
  if (isSingle) {
    sigMsgWriter.writeSlice(hashOutputs);
  }
  // BIP342 extension
  if (leafHash) {
    sigMsgWriter.writeSlice(leafHash);
    sigMsgWriter.writeUInt8(0);
    sigMsgWriter.writeUInt32(0xffffffff);
  }

  // Extra zero byte because:
  // https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#cite_note-19
  const data = Buffer.from(
    tools.concat([Uint8Array.from([0x00]), sigMsgWriter.end()])
  );

  // This needs to be ran through the hash function before signing (sha256)
  return bitcoin.crypto.taggedHash(
    "TapSighash",
    Buffer.from(tools.concat([Uint8Array.from([0x00]), sigMsgWriter.end()]))
  );
};
