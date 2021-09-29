import ByteBuffer from "bytebuffer";

import { varint32_t } from "./int";
import { InputOf, ISerializer, JSONOf, OutputOf } from "./ISerializer";

type TInput<TKey extends ISerializer, TValue extends ISerializer> =
	[InputOf<TKey>, InputOf<TValue>][] |
	Map<InputOf<TKey>, InputOf<TValue>> |
	TOutput<TKey, TValue>;

type TOutput<TKey extends ISerializer, TValue extends ISerializer> = Map<OutputOf<TKey>, OutputOf<TValue>>;

type TJSON<TKey extends ISerializer, TValue extends ISerializer> = [JSONOf<TKey>, JSONOf<TValue>][];

export class FlatMapSerializer<TKey extends ISerializer, TValue extends ISerializer>
	extends ISerializer<TInput<TKey, TValue>, TOutput<TKey, TValue>, TJSON<TKey, TValue>>
{
	constructor(public readonly key: TKey, public readonly value: TValue) { super(); }
	public appendToByteBuffer(value: TInput<TKey, TValue>, bytebuffer: ByteBuffer): void {
		const entries = this._prepareInput(value);
		varint32_t.appendToByteBuffer(entries.length, bytebuffer);
		for (const { serializedKeyHex, serializedValue } of entries) {
			bytebuffer.append(Buffer.from(serializedKeyHex, "hex"));
			bytebuffer.append(serializedValue);
		}
	}

	public toJSON(value: TInput<TKey, TValue>): TJSON<TKey, TValue> {
		const entries = this._prepareInput(value);
		return entries.map(({ key, value }, index) => (
			this._try(key, index, () => [this.key.toJSON(key), this.value.toJSON(value)] as [JSONOf<TKey>, JSONOf<TValue>])
		));
	}

	public fromJSON(json: TJSON<TKey, TValue>): TOutput<TKey, TValue> {
		const result: TOutput<TKey, TValue> = new Map();
		for (let i = 0; i < json.length; i++) {
			const key = this._try(json[i][0], i, () => this.key.fromJSON(json[i][0]) as OutputOf<TKey>);
			const value = this._try(json[i][1], i, () => this.value.fromJSON(json[i][1]) as OutputOf<TValue>);
			result.set(key, value);
		}
		this._prepareInput(result); // validate
		return result;
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: TOutput<TKey, TValue>; newOffset: number; } {
		const result: TOutput<TKey, TValue> = new Map();
		const { res: size, newOffset: dataOffset } = this._try(null, -1, () => varint32_t.readFromBuffer(buffer, offset));
		offset = dataOffset;
		for (let i = 0; i < size; i++) {
			const { res: key, newOffset: valueOffset } = this._try(null, i, () => (
				this.key.readFromBuffer(buffer, offset)
			) as { res: OutputOf<TKey>, newOffset: number });
			const { res: value, newOffset } = this._try(null, i, () => (
				this.value.readFromBuffer(buffer, valueOffset)
			) as { res: OutputOf<TValue>, newOffset: number });
			offset = newOffset;
			result.set(key, value);
		}
		this._prepareInput(result); // validate
		return { res: result, newOffset: offset };
	}

	private _prepareInput(input: TInput<TKey, TValue>): {
		key: InputOf<TKey> | OutputOf<TKey>,
		value: InputOf<TValue> | OutputOf<TValue>,
		serializedKeyHex: string,
		serializedValue: Buffer,
	}[] {
		let map: Map<InputOf<TKey> | OutputOf<TKey>, InputOf<TValue> | OutputOf<TValue>>;
		if (Array.isArray(input)) {
			if (new Set(input.map(([key]) => key)).size !== input.length) throw new Error("flat_map: map key duplicate");
			map = new Map(input);
		} else map = input;
		const result = [...map.entries()].map(([key, value], index) => ({
			key,
			value,
			serializedKeyHex: this._try(key, index, () => this.key.serialize(key)).toString("hex"),
			serializedValue: this._try(key, index, () => this.value.serialize(value)),
		}));
		if (new Set(result.map(({ serializedKeyHex }) => serializedKeyHex)).size !== result.length) {
			throw new Error("flat_map: key duplicates");
		}
		result.sort((a, b) => a.serializedKeyHex < b.serializedKeyHex ? -1 : 1);
		return result;
	}

	private _try<T>(key: unknown, index: number, f: () => T): T {
		try {
			return f();
		} catch (error) {
			const keyString = typeof key === "string" ? `"${key}"` : index.toString();
			throw new Error(`flat_map[${keyString}]: ${(error as Error).message}`);
		}
	}
}

export const flat_map = <TKey extends ISerializer, TValue extends ISerializer>(
	key: TKey,
	value: TValue,
): FlatMapSerializer<TKey, TValue> => new FlatMapSerializer(key, value);
