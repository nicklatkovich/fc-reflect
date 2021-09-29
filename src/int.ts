import ByteBuffer from "bytebuffer";

import { ISerializer } from "./ISerializer";
import { BigIntUtils } from "./utils";

type TInput = number | bigint | string;

export abstract class IIntSerializer<TOutput extends TInput, TJSON> extends ISerializer<TInput, TOutput, TJSON> {
	public readonly maxAbsValue: bigint;
	public readonly type: string;
	protected abstract _toJSON(value: bigint): TJSON;
	protected abstract _toJS(value: bigint): TOutput;

	constructor(public readonly bitsCount: number, public readonly isUint = false) {
		super();
		if (!Number.isSafeInteger(bitsCount) || bitsCount <= 0) throw new Error('bits count is not positive safe integer');
		if (bitsCount % 8 !== 0) throw new Error('invalid bits count');
		this.maxAbsValue = 2n ** (BigInt(bitsCount - (isUint ? 0 : 1))) - 1n;
		this.type = `${isUint ? "u" : ""}int${this.bitsCount}`;
	}

	protected _toBigInt(value: TInput): bigint {
		if (typeof value === 'number') {
			if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
				throw new Error(`${this.type}: loss of accuracy, use bigint or string`);
			}
			value = BigInt(value);
		} else if (typeof value === 'string') value = BigInt(value);
		if (BigIntUtils.abs(value) > this.maxAbsValue) throw new Error(`${this.type}: overflow`);
		return value;
	}

	public toJSON(value: TInput): TJSON {
		return this._toJSON(this._toBigInt(value));
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: TOutput; newOffset: number; } {
		const bytesCount = this.bitsCount / 8;
		const newOffset = offset + bytesCount;
		if (buffer.length < newOffset) throw new Error(`${this.type}: unexpected buffer end`);
		const bytes = [...buffer.slice(offset, newOffset)];
		let result = 0n;
		const isNegative = this.isUint ? false : bytes[bytesCount - 1];
		let multiplier = 1n;
		for (const byte of bytes) {
			result += BigInt(isNegative ? 0xff - byte : byte) * multiplier;
			multiplier = multiplier * 2n ** 8n;
		}
		if (isNegative) result = -(result + 1n);
		return { res: this._toJS(this._toBigInt(result)), newOffset };
	}
}

export abstract class SafeIntSerializer extends IIntSerializer<number, number> {
	public fromJSON(value: number): number { this._toBigInt(value); return value; }
	protected _toJSON(value: bigint): number { return Number(value.toString()); }
	protected _toJS(value: bigint): number { return Number(value.toString()); }
	constructor(bitsCount: number, isUint = false) {
		super(bitsCount, isUint);
		if (bitsCount > 53) throw new Error("bits count not safe");
	}
}

export abstract class UnsafeIntSerializer extends IIntSerializer<bigint, number | string> {
	public fromJSON(value: string | number): bigint { return this._toBigInt(value); }
	protected _toJS(value: bigint): bigint { return value; }
	protected _toJSON(value: bigint): number | string {
		return BigIntUtils.abs(value) <= Number.MAX_SAFE_INTEGER ? Number(value.toString()) : value.toString();
	}
}

export class Int64Serializer extends UnsafeIntSerializer {
	constructor() { super(64, false); }
	public appendToByteBuffer(value: TInput, bytebuffer: ByteBuffer): void {
		value = this._toBigInt(value);
		if (BigIntUtils.abs(value) >= Number.MAX_SAFE_INTEGER) throw new Error(`${this.type}: unsafe is not implemented`);
		bytebuffer.writeInt64(Number(value.toString()));
	}
}

export const int64_t = new Int64Serializer();

export class UInt8Serializer extends SafeIntSerializer {
	constructor() { super(8, true); }
	public appendToByteBuffer(value: TInput, bytebuffer: ByteBuffer): void {
		value = this._toBigInt(value);
		if (BigIntUtils.abs(value) >= Number.MAX_SAFE_INTEGER) throw new Error(`${this.type}: unsafe is not implemented`);
		bytebuffer.writeUint8(Number(value.toString()));
	}
}

export const uint8_t = new UInt8Serializer();

export class UInt16Serializer extends SafeIntSerializer {
	constructor() { super(16, true); }
	public appendToByteBuffer(value: TInput, bytebuffer: ByteBuffer): void {
		value = this._toBigInt(value);
		if (BigIntUtils.abs(value) >= Number.MAX_SAFE_INTEGER) throw new Error(`${this.type}: unsafe is not implemented`);
		bytebuffer.writeUint16(Number(value.toString()));
	}
}

export const uint16_t = new UInt16Serializer();

export class UInt32Serializer extends SafeIntSerializer {
	constructor() { super(32, true); }
	public appendToByteBuffer(value: TInput, bytebuffer: ByteBuffer): void {
		value = this._toBigInt(value);
		if (BigIntUtils.abs(value) >= Number.MAX_SAFE_INTEGER) throw new Error(`${this.type}: unsafe is not implemented`);
		bytebuffer.writeUint32(Number(value.toString()));
	}
}

export const uint32_t = new UInt32Serializer();

export class UInt64Serializer extends UnsafeIntSerializer {
	constructor() { super(64, true); }
	public appendToByteBuffer(value: TInput, bytebuffer: ByteBuffer): void {
		value = this._toBigInt(value);
		if (BigIntUtils.abs(value) >= Number.MAX_SAFE_INTEGER) throw new Error(`${this.type}: unsafe is not implemented`);
		bytebuffer.writeUint64(Number(value.toString()));
	}
}

export const uint64_t = new UInt64Serializer();

export class VarInt32Serializer extends SafeIntSerializer {
	constructor() { super(32, false); }
	public appendToByteBuffer(value: TInput, bytebuffer: ByteBuffer): void {
		value = this._toBigInt(value);
		if (value < 0) throw new Error('varint32: negative serialization not implemented');
		bytebuffer.writeVarint32(Number(value));
	}

	public override readFromBuffer(buffer: Buffer, offset: number): { res: number; newOffset: number; } {
		let result = 0n;
		let multiplier = 1n;
		let newOffset = offset;
		while (true) {
			const byte = buffer.readUInt8(newOffset);
			const isEnd = byte < 0x80;
			result += BigInt(byte - (isEnd ? 0 : 0x80)) * multiplier;
			multiplier *= 2n ** 7n;
			newOffset += 1;
			if (isEnd) break;
		}
		return { res: Number(this._toBigInt(result).toString()), newOffset };
	}
}

export const varint32_t = new VarInt32Serializer();
