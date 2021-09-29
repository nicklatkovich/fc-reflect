import ByteBuffer from "bytebuffer";

import { InputOf, ISerializer, JSONOf, OutputOf } from "./ISerializer";

type TMap = { [key: string]: ISerializer };

type TInput<T extends TMap> = { [key in keyof T]: InputOf<T[key]> | OutputOf<T[key]> };
type TOutput<T extends TMap> = { [key in keyof T]: OutputOf<T[key]> };
type TJSON<T extends TMap> = { [key in keyof T]: JSONOf<T[key]> };

export class StructSerializer<T extends TMap> extends ISerializer<TInput<T>, TOutput<T>, TJSON<T>> {
	constructor(public readonly types: Readonly<T>) { super(); }
	private _try(key: keyof T, f: () => unknown): void {
		try {
			f();
		} catch (error) {
			throw new Error(`struct.${key}: ${(error as Error).message}`);
		}
	}

	public appendToByteBuffer(value: TInput<T>, bytebuffer: ByteBuffer): void {
		for (const key of Object.keys(value) as (keyof T)[]) {
			this._try(key, () => this.types[key].appendToByteBuffer(value[key], bytebuffer));
		}
	}

	public toJSON(value: TInput<T>): TJSON<T> {
		const result = {} as Partial<TJSON<T>>;
		for (const key of Object.keys(value) as (keyof T)[]) {
			this._try(key, () => result[key] = this.types[key].toJSON(value[key]) as JSONOf<T[keyof T]>);
		}
		return result as TJSON<T>;
	}

	public fromJSON(value: TJSON<T>): TOutput<T> {
		const result = {} as Partial<TOutput<T>>;
		for (const key of Object.keys(value) as (keyof T)[]) {
			this._try(key, () => result[key] = this.types[key].fromJSON(value[key]) as OutputOf<T[keyof T]>);
		}
		return result as TOutput<T>;
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: TOutput<T>; newOffset: number; } {
		const result = {} as Partial<TOutput<T>>;
		for (const key of Object.keys(this.types) as (keyof T)[]) {
			this._try(key, () => {
				const { res, newOffset } = this.types[key].readFromBuffer(buffer, offset);
				result[key] = res as OutputOf<T[keyof T]>;
				offset = newOffset;
			});
		}
		return { res: result as TOutput<T>, newOffset: offset };
	}
}

export const struct = <T extends TMap>(types: Readonly<T>): StructSerializer<T> => new StructSerializer(types);
