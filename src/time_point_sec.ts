import ByteBuffer from "bytebuffer";

import { uint32_t } from "./int";
import { ISerializer } from "./ISerializer";

type TInput = Date | number | string;

export class TimePointSecSerializer extends ISerializer<TInput, Date, string> {
	public toJSON(value: TInput): string { return this._parse(value).toISOString().split('.')[0]; }
	public fromJSON(value: string): Date { return this._parse(value); }

	public appendToByteBuffer(value: TInput, bytebuffer: ByteBuffer): void {
		uint32_t.appendToByteBuffer(this._parse(value).getTime() / 1e3, bytebuffer);
	}

	public readFromBuffer(buffer: Buffer, offset: number): { res: Date; newOffset: number; } {
		const { res, newOffset } = uint32_t.readFromBuffer(buffer, offset);
		return { res: this._parse(res), newOffset };
	}

	private _parse(input: TInput): Date {
		if (typeof input === 'string' && /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d$/.test(input)) {
			const result = new Date(`${input}.000Z`);
			if (Number.isNaN(result.getTime())) throw new Error("time_point_sec: invalid date");
			return result;
		}
		if (!(input instanceof Date)) input = this._try(() => new Date(uint32_t.toJSON(input as string | number) * 1e3));
		const timestamp = input.getTime();
		if (timestamp % 1e3 !== 0) throw new Error("time_point_sec: invalid time");
		return input;
	}

	private _try<T>(f: () => T): T {
		try {
			return f();
		} catch (error) {
			throw new Error(`time_point_sec: ${(error as Error).message}`);
		}
	}
}

export const time_point_sec = new TimePointSecSerializer();
