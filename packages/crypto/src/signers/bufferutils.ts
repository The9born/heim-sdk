import * as tools from "uint8array-tools";
import * as varuint from "varuint-bitcoin";
import * as v from "valibot";

export const BufferSchema = v.instance(Uint8Array);
export const UInt32Schema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.maxValue(0xffffffff)
);

export class BufferWriter {
  static withCapacity(size: number): BufferWriter {
    return new BufferWriter(new Uint8Array(size));
  }

  constructor(public buffer: Uint8Array, public offset: number = 0) {
    v.parse(v.tuple([BufferSchema, UInt32Schema]), [buffer, offset]);
  }

  writeUInt8(i: number): void {
    this.offset = tools.writeUInt8(this.buffer, this.offset, i);
  }

  writeInt32(i: number): void {
    this.offset = tools.writeInt32(this.buffer, this.offset, i, "LE");
  }

  writeInt64(i: number | bigint): void {
    this.offset = tools.writeInt64(this.buffer, this.offset, BigInt(i), "LE");
  }

  writeUInt32(i: number): void {
    this.offset = tools.writeUInt32(this.buffer, this.offset, i, "LE");
  }

  writeUInt64(i: number | bigint): void {
    this.offset = tools.writeUInt64(this.buffer, this.offset, BigInt(i), "LE");
  }

  writeVarInt(i: number): void {
    const { bytes } = varuint.encode(i, this.buffer, this.offset);
    this.offset += bytes;
  }

  writeSlice(slice: Uint8Array): void {
    if (this.buffer.length < this.offset + slice.length) {
      throw new Error("Cannot write slice out of bounds");
    }
    this.buffer.set(slice, this.offset);
    this.offset += slice.length;
  }

  writeVarSlice(slice: Uint8Array): void {
    this.writeVarInt(slice.length);
    this.writeSlice(slice);
  }

  writeVector(vector: Uint8Array[]): void {
    this.writeVarInt(vector.length);
    vector.forEach((buf: Uint8Array) => this.writeVarSlice(buf));
  }

  end(): Uint8Array {
    if (this.buffer.length === this.offset) {
      return this.buffer;
    }
    throw new Error(`buffer size ${this.buffer.length}, offset ${this.offset}`);
  }
}

export function varSliceSize(someScript: Uint8Array): number {
  const length = someScript.length;

  return varuint.encodingLength(length) + length;
}
