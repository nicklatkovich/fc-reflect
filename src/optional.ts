import ByteBuffer from "bytebuffer";

import { bool } from "./bool";
import { InputOf, ISerializer, JSONOf, OutputOf } from "./ISerializer";

type TInput<T extends ISerializer> = InputOf<T> | null | undefined | OutputOf<T>;
type TOutput<T extends ISerializer> = OutputOf<T> | null;
type TJSON<T extends ISerializer> = JSONOf<T> | null;

export class OptionalSerializer<T extends ISerializer> extends ISerializer<TInput<T>, TOutput<T>, TJSON<T>> {
	constructor(public readonly type: T) { super(); }

	public appendToByteBuffer(value: TInput<T>, bytebuffer: ByteBuffer): void {
		if (value === null || value === undefined) return bool.appendToByteBuffer(false, bytebuffer);
		const serialized = this._try(() => this.type.serialize(value));
		bool.appendToByteBuffer(true, bytebuffer);
		bytebuffer.append(serialized);
	}

	public toJSON(value: TInput<T>): TJSON<T> {
		if (value === null || value === undefined) return null;
		return this._try(() => this.type.toJSON(value) as JSONOf<T>);
	}

	public fromJSON(value: TJSON<T>): TOutput<T> {
		if (value === null || value === undefined) return null;
		return this._try(() => this.type.fromJSON(value) as OutputOf<T>);
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: TOutput<T>; newOffset: number; } {
		const { res: provided, newOffset: valueOffset } = this._try(() => bool.readFromBuffer(buffer, offset));
		if (!provided) return { res: null, newOffset: valueOffset };
		return this._try(() => this.type.readFromBuffer(buffer, valueOffset) as { res: OutputOf<T>, newOffset: number });
	}

	private _try<T>(f: () => T): T {
		try {
			return f();
		} catch (error) {
			throw new Error(`optional: ${(error as Error).message}`);
		}
	}
}

export const optional = <T extends ISerializer>(type: T): OptionalSerializer<T> => new OptionalSerializer(type);
