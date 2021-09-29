import ByteBuffer from "bytebuffer";

import { varint32_t } from "./int";
import { InputOf, ISerializer, JSONOf, OutputOf } from "./ISerializer";

type TInput<T extends ISerializer> = (InputOf<T> | OutputOf<T>)[]
type TOutput<T extends ISerializer> = OutputOf<T>[];
type TJSON<T extends ISerializer> = JSONOf<T>[];

export class VectorSerializer<T extends ISerializer> extends ISerializer<TInput<T>, TOutput<T>, TJSON<T>> {
	constructor(public readonly type: T, public readonly size: number | null = null) {
		super();
		if (size !== null) varint32_t.toJSON(size); // validate
	}

	public appendToByteBuffer(value: TInput<T>, bytebuffer: ByteBuffer): void {
		if (this.size !== null && value.length !== this.size) throw new Error("vector: invalid size");
		const serializedElements = value.map((e, i) => this._try(i, () => this.type.serialize(e)));
		if (this.size === null) varint32_t.appendToByteBuffer(value.length, bytebuffer);
		for (const buffer of serializedElements) bytebuffer.append(buffer);
	}

	public toJSON(value: TInput<T>): TJSON<T> {
		if (this.size !== null && value.length !== this.size) throw new Error("vector: invalid size");
		return value.map((e, i) => this._try(i, () => this.type.toJSON(e) as JSONOf<T>));
	}

	public fromJSON(value: TJSON<T>): TOutput<T> {
		if (this.size !== null && value.length !== this.size) throw new Error("vector: invalid size");
		return value.map((e, i) => this._try(i, () => this.type.fromJSON(e) as OutputOf<T>));
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: TOutput<T>; newOffset: number; } {
		let size: number;
		if (this.size === null) {
			const { res, newOffset } = varint32_t.readFromBuffer(buffer, offset);
			size = res;
			offset = newOffset;
		} else size = this.size;
		const result: TOutput<T> = [];
		for (let i = 0; i < size; i++) {
			const { res, newOffset } = this._try(i, () => (
				this.type.readFromBuffer(buffer, offset) as { res: OutputOf<T>, newOffset: number }
			));
			offset = newOffset;
			result.push(res);
		}
		return { res: result, newOffset: offset };
	}

	private _try<T>(index: number, f: () => T): T {
		try {
			return f();
		} catch (error) {
			throw new Error(`vector[${index}]: ${(error as Error).message}`);
		}
	}
}

export const vector = <T extends ISerializer>(type: T, size: number | null = null): VectorSerializer<T> => (
	new VectorSerializer(type, size)
);
