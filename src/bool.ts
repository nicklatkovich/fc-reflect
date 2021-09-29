import ByteBuffer from "bytebuffer";

import { uint8_t } from "./int";
import { ISerializer } from "./ISerializer";

export class BoolSerializer extends ISerializer<boolean, boolean, boolean> {
	public toJSON(value: boolean): boolean { return value; }
	public fromJSON(value: boolean): boolean { return value; }

	public appendToByteBuffer(value: boolean, bytebuffer: ByteBuffer): void {
		bytebuffer.append(Buffer.from([value ? 1 : 0]));
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: boolean; newOffset: number; } {
		const { res, newOffset } = this._try(() => uint8_t.readFromBuffer(buffer, offset));
		if (res > 1) throw new Error("bool: invalid byte value");
		return { res: !!res, newOffset };
	}

	private _try<T>(f: () => T): T {
		try {
			return f();
		} catch (error) {
			throw new Error(`bool: ${(error as Error).message}`);
		}
	}
}

export const bool = new BoolSerializer();
