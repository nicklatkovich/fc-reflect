import ByteBuffer from "bytebuffer";

import { ISerializer } from "./ISerializer";

export const void_t = new (class extends ISerializer<unknown, never, unknown> {
	public fromJSON(_value: unknown): never { throw new Error("void: unserializable"); }
	public toJSON(_value: unknown): never { throw new Error("void: unserializable"); }
	public readFromBuffer(_buffer: Buffer, _offset: number): never { throw new Error("void: unserializable"); }
	public appendToByteBuffer(_value: unknown, _bytebuffer: ByteBuffer): never {
		throw new Error("void: unserializable");
	}
})();
