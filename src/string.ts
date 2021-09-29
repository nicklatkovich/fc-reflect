import ByteBuffer from "bytebuffer";

import { bytes } from "./bytes";
import { ISerializer } from "./ISerializer";

const base = bytes();

export class StringSerializer extends ISerializer<string, string, string> {
	public toJSON(value: string): string { return value; }
	public fromJSON(value: string): string { return value; }
	private _try<T>(f: () => T): T {
		try {
			return f();
		} catch (error) {
			throw new Error(`string: ${(error as Error).message}`);
		}
	}

	public appendToByteBuffer(value: string, bytebuffer: ByteBuffer): void {
		this._try(() => base.appendToByteBuffer(Buffer.from(value), bytebuffer));
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: string; newOffset: number; } {
		const { res, newOffset } = this._try(() => base.readFromBuffer(buffer, offset));
		return { res: res.toString(), newOffset };
	}
}

export const string_t = new StringSerializer();
