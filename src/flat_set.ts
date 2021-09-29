import ByteBuffer from "bytebuffer";

import { varint32_t } from "./int";
import { InputOf, ISerializer, JSONOf, OutputOf } from "./ISerializer";

type TInput<T> = InputOf<T>[] | Set<InputOf<T>> | TOutput<T>;
type TOutput<T> = Set<OutputOf<T>>;
type TJSON<T> = JSONOf<T>[];

export class FlatSetSerializer<T extends ISerializer> extends ISerializer<TInput<T>, TOutput<T>, TJSON<T>> {
	constructor(public readonly type: T) { super(); }

	private _try<T>(index: number, f: () => T): T {
		try {
			return f();
		} catch (error) {
			throw new Error(`flat_set[${index}]: ${(error as Error).message}`);
		}
	}

	private _toHex(value: TInput<T>): string[] {
		value = [...value] as InputOf<T>[];
		const buffers = new Set(value.map((e, i) => this._try(i, () => this.type.serialize(e).toString("hex"))));
		if (buffers.size !== value.length) throw new Error(`flat_set: duplicates`);
		return [...buffers];
	}

	public appendToByteBuffer(value: TInput<T>, bytebuffer: ByteBuffer): void {
		for (const buffer of this._toHex(value).sort().map((e) => Buffer.from(e, "hex"))) bytebuffer.append(buffer);
	}

	public toJSON(value: TInput<T>): TJSON<T> {
		const arr = [...value] as InputOf<T>[];
		const items = this._toHex(arr).map((b, i) => ({ buffer: b, element: arr[i], index: i }));
		items.sort((a, b) => a.buffer < b.buffer ? -1 : 1);
		return items.map(({ element, index }) => this._try(index, () => this.type.toJSON(element))) as JSONOf<T>[];
	}

	public fromJSON(value: TJSON<T>): TOutput<T> {
		const arr = value.map((elem, i) => this._try(i, () => this.type.fromJSON(elem))) as OutputOf<T>[];
		this._toHex(arr as InputOf<T>[]);
		return new Set(arr);
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: TOutput<T>; newOffset: number; } {
		const result = new Set<OutputOf<T>>();
		const { res: size, newOffset } = varint32_t.readFromBuffer(buffer, offset);
		offset = newOffset;
		for (let i = 0; i < size; i++) {
			const { res, newOffset } = this._try(i, () => (
				this.type.readFromBuffer(buffer, offset)
			) as { res: OutputOf<T>, newOffset: number });
			offset = newOffset;
			result.add(res);
		}
		return { res: result, newOffset: offset };
	}
}

export const flat_set = <T extends ISerializer>(type: T): FlatSetSerializer<T> => new FlatSetSerializer(type);
