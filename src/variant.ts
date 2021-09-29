import ByteBuffer from "bytebuffer";

import { varint32_t } from "./int";
import { InputOf, ISerializer, JSONOf, OutputOf } from "./ISerializer";

export type VariantMap = ISerializer[];

type TInput<T extends VariantMap, K extends keyof T = keyof T> =
	K extends any ? [K, InputOf<T[K]> | OutputOf<T[K]>] : never;

type TOutput<T extends VariantMap, K extends keyof T = keyof T> = K extends any ? [K, OutputOf<T[K]>] : never;
type TJSON<T extends VariantMap, K extends keyof T = keyof T> = K extends any ? [K, JSONOf<T[K]>] : never;

export class VariantSerializer<T extends VariantMap> extends ISerializer<TInput<T>, TOutput<T>, TJSON<T>> {
	constructor(public readonly types: T) { super(); }
	private _try<T>(index: number, f: () => T): T {
		try {
			return f();
		} catch (error) {
			throw new Error(`variant[${index}]: ${(error as Error).message}`);
		}
	}

	public appendToByteBuffer(value: TInput<T>, bytebuffer: ByteBuffer): void {
		const index = this._try(-1, () => varint32_t.toJSON(value[0] as InputOf<typeof varint32_t>));
		if (index < 0 || !this.types[index]) throw new Error(`variant: key ${index} not found`);
		const serialized = this._try(index, () => this.types[index].serialize(value[1]));
		varint32_t.appendToByteBuffer(index, bytebuffer);
		bytebuffer.append(serialized);
	}

	public toJSON<K extends keyof T = keyof T>(value: TInput<T, K>): TJSON<T, K> {
		const index = this._try(-1, () => varint32_t.toJSON(value[0] as InputOf<typeof varint32_t>));
		if (index < 0 || !this.types[index]) throw new Error(`variant: key ${index} not found`);
		return [index, this._try(index, () => this.types[index].toJSON(value[1]))] as TJSON<T, K>;
	}

	public fromJSON<K extends keyof T = keyof T>(value: TJSON<T, K>): TOutput<T, K> {
		const index = this._try(-1, () => varint32_t.toJSON(value[0] as InputOf<typeof varint32_t>));
		if (index < 0 || !this.types[index]) throw new Error(`variant: key ${index} not found`);
		return [index, this._try(index, () => this.types[index].fromJSON(value[1]))] as TOutput<T, K>;
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: TOutput<T>; newOffset: number; } {
		const { res: index, newOffset: varOffset } = this._try(-1, () => varint32_t.readFromBuffer(buffer, offset));
		if (index < 0 || !this.types[index]) throw new Error(`variant: key ${index} not found`);
		const { res, newOffset } = this._try(index, () => (
			this.types[index].readFromBuffer(buffer, varOffset)
		)) as { res: TOutput<T>[1], newOffset: number };
		return { res: [index, res] as TOutput<T>, newOffset };
	}
}

export const variant = <T extends VariantMap>(...types: T): VariantSerializer<T> => new VariantSerializer(types);
