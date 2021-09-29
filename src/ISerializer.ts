import ByteBuffer from "bytebuffer";

export type InputOf<T> = T extends ISerializer<infer K> ? K : never;
export type OutputOf<T> = T extends ISerializer<any, infer K> ? K : never;
export type JSONOf<T> = T extends ISerializer<any, any, infer K> ? K : never;

export abstract class ISerializer<TInput extends TOutput | & any = unknown, TOutput = unknown, TJSON = unknown> {
	public abstract appendToByteBuffer(value: TInput, bytebuffer: ByteBuffer): void;
	public abstract toJSON(value: TInput): TJSON;
	public abstract fromJSON(value: TJSON): TOutput;
	public abstract readFromBuffer(buffer: Buffer, offset: number): { res: TOutput, newOffset: number };
	public serialize(value: TInput): Buffer {
		const bytebuffer = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
		this.appendToByteBuffer(value, bytebuffer);
		const result = bytebuffer.copy(0, bytebuffer.offset).toBuffer() as Buffer | ArrayBuffer;
		if (Buffer.isBuffer(result)) return result;
		return Buffer.from(result);
	}

	public deserialize(buffer: Buffer): TOutput {
		const { res, newOffset } = this.readFromBuffer(buffer, 0);
		if (newOffset !== buffer.length) throw new Error('excess info in the end of the buffer');
		return res;
	}
}
