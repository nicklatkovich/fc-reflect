import ByteBuffer from "bytebuffer";

import { ISerializer, InputOf, OutputOf, JSONOf } from "./ISerializer";

export { bool } from "./bool";
export { bytes } from "./bytes";
export { flat_map } from "./flat_map";
export { flat_set } from "./flat_set";
export { int64_t, uint8_t, uint16_t, uint32_t, uint64_t, varint32_t } from "./int";
export { optional } from "./optional";
export { string_t } from "./string";
export { struct } from "./struct";
export { time_point_sec } from "./time_point_sec";
export { variant } from "./variant";
export { vector } from "./vector";
export { void_t } from "./void";

export declare namespace FCReflect {
	export { ISerializer, ByteBuffer, InputOf, OutputOf, JSONOf };
}
