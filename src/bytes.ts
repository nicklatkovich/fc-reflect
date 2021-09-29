import ByteBuffer from "bytebuffer";

import { varint32_t } from "./int";
import { ISerializer } from "./ISerializer";

type TInput = Buffer | string;

export class BytesSerializer extends ISerializer<TInput, Buffer, string> {
	constructor(public readonly size: number | null = null) {
		super();
		if (size !== null) varint32_t.fromJSON(size);
	}

	private _try<T>(f: () => T): T {
		try {
			return f();
		} catch (error) {
			throw new Error(`bytes${this.size ?? ""}: ${(error as Error).message}`);
		}
	}

	private _toBytes(value: TInput): Buffer {
		const bytes = Buffer.from(value);
		if (this.size !== null && this.size !== bytes.length) throw new Error(`bytes${this.size ?? ""}: invalid size`);
		return bytes;
	}

	public appendToByteBuffer(value: TInput, bytebuffer: ByteBuffer): void {
		const bytes = this._toBytes(value);
		if (this.size !== null) varint32_t.appendToByteBuffer(this.size, bytebuffer);
		bytebuffer.append(bytes);
	}

	public toJSON(value: TInput): string { return this._toBytes(value).toString("hex"); }

	public fromJSON(value: string): Buffer {
		if (!/^([\da-f]{2})*$/.test(value)) throw new Error(`bytes${this.size}: invalid format`);
		const bytes = Buffer.from(value, "hex");
		if (this.size !== null && this.size !== bytes.length) throw new Error(`bytes${this.size ?? ""}: invalid size`);
		return bytes;
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: Buffer; newOffset: number; } {
		let size: number;
		if (this.size !== null) size = this.size;
		else ({ res: size, newOffset: offset } = this._try(() => varint32_t.readFromBuffer(buffer, offset)));
		const newOffset = offset + size;
		const bytes = buffer.slice(offset, newOffset);
		if (bytes.length !== size) throw new Error(`bytes${this.size ?? ""}: unexpected end of buffer`);
		return { res: bytes, newOffset };
	}
}

export const bytes = (size?: number | null): BytesSerializer => new BytesSerializer(size ?? null);
